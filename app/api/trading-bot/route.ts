import { analyzeTicker } from "@/lib/trading-strategy";
import { createTelegramService } from "@/lib/telegram";
import { formatAnalysisMessage, generateSummaryChart } from "@/lib/charts";
import { readFileSync } from "fs";
import { type NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { get } from "@vercel/edge-config";

interface TickerConfig {
	tickers: string[];
}

/**
 * Load ticker configuration from Edge Config with fallback to file
 */
async function loadTickers(): Promise<string[]> {
	try {
		// Try to get tickers from Edge Config first
		const edgeTickers = await get<string[]>("tickers");

		if (edgeTickers && Array.isArray(edgeTickers) && edgeTickers.length > 0) {
			console.log("📦 Loaded tickers from Edge Config");
			return edgeTickers;
		}

		// Fallback to file if Edge Config is not configured or returns null
		console.log("📂 Edge Config not available, falling back to file");
		const configPath = join(process.cwd(), "config", "tickers.json");
		const config: TickerConfig = JSON.parse(readFileSync(configPath, "utf-8"));
		return config.tickers;
	} catch (error) {
		console.error("Failed to load ticker config:", error);
		// Try file as last resort
		try {
			const configPath = join(process.cwd(), "config", "tickers.json");
			const config: TickerConfig = JSON.parse(readFileSync(configPath, "utf-8"));
			return config.tickers;
		} catch (fileError) {
			console.error("Failed to load tickers from file:", fileError);
			throw error;
		}
	}
}

/**
 * Vercel Cron Job Handler - Weekly Market Analysis
 * This endpoint is triggered by Vercel cron jobs every Friday at market close
 * See vercel.json for cron configuration
 */
export async function GET(request: NextRequest) {
	// Verify this is a cron request (Vercel adds a special header)
	const authHeader = request.headers.get("authorization");
	const cronSecret = process.env.CRON_SECRET;

	// If CRON_SECRET is set, verify the request (skip for manual browser requests)
	const isCronRequest =
		request.headers.get("user-agent")?.includes("vercel-cron") ||
		request.headers.get("x-vercel-cron");

	if (isCronRequest && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		console.log("\n📊 Starting Weekly Market Analysis...");
		console.log(`⏰ Execution time: ${new Date().toISOString()}\n`);

		// Load tickers
		const tickers = await loadTickers();
		console.log(
			`📋 Analyzing ${tickers.length} tickers: ${tickers.join(", ")}\n`,
		);

		// Analyze each ticker and collect results
		const analyses = [];
		for (const ticker of tickers) {
			try {
				const analysis = await analyzeTicker(ticker);
				analyses.push(analysis);
				const deviation = (analysis.deviation * 100).toFixed(2);
				console.log(`✅ ${ticker}: ${analysis.action.toUpperCase()} (${analysis.deviation > 0 ? '+' : ''}${deviation}%)`);
			} catch (error: any) {
				console.error(`❌ ${ticker}: Failed to analyze - ${error.message}`);
				// Skip failed analyses
			}
		}

		if (analyses.length === 0) {
			throw new Error("No tickers were successfully analyzed");
		}

		console.log("\n📈 Generating charts...");

		// Generate summary chart
		const summaryChartUrl = generateSummaryChart(analyses);
		console.log("✅ Summary chart generated");

		// Format analysis message
		const message = formatAnalysisMessage(analyses);

		// Send to Telegram
		console.log("\n📱 Sending to Telegram...");
		try {
			const telegram = createTelegramService();

			// Send text summary first
			await telegram.sendMessage(message);

			// Send summary chart
			await telegram.sendPhoto(summaryChartUrl, "Weekly Market Analysis Summary");

			console.log("✅ Successfully sent weekly report to Telegram");
		} catch (error: any) {
			console.error("❌ Failed to send Telegram notification:", error.message);
			// Don't fail the whole request if Telegram fails
			return NextResponse.json({
				success: false,
				error: "Failed to send Telegram notification",
				message: error.message,
				timestamp: new Date().toISOString(),
				analyses,
				chartUrl: summaryChartUrl,
			}, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			message: "Weekly market analysis completed and sent to Telegram",
			timestamp: new Date().toISOString(),
			tickers,
			analyses: analyses.map(a => ({
				symbol: a.symbol,
				action: a.action,
				currentPrice: a.currentPrice,
				sma200: a.sma200,
				deviation: a.deviation,
			})),
			chartUrl: summaryChartUrl,
		});
	} catch (error: any) {
		console.error("❌ Market analysis failed:", error);

		return NextResponse.json(
			{
				error: "Market analysis failed",
				message: error.message,
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
	return GET(request);
}
