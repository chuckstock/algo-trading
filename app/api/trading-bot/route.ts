import { formatAnalysisMessage, generateSummaryChart } from "@/lib/charts";
import { createTelegramService } from "@/lib/telegram";
import { analyzeTicker, type TradingSignal } from "@/lib/trading-strategy";
import { readFileSync } from "fs";
import { type NextRequest, NextResponse } from "next/server";
import { join } from "path";

interface TickerConfig {
	tickers: string[];
}

export type ReportType = "daily" | "monthly";

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Unknown error";
}

/**
 * Load ticker configuration
 */
function loadTickers(): string[] {
	try {
		const configPath = join(process.cwd(), "config", "tickers.json");
		const config: TickerConfig = JSON.parse(readFileSync(configPath, "utf-8"));
		return config.tickers;
	} catch (error) {
		console.error("Failed to load ticker config:", error);
		throw error;
	}
}

export function isLastDayOfMonth(): boolean {
	const now = new Date();
	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);
	return tomorrow.getDate() === 1;
}

function getReportLabel(reportType: ReportType): string {
	return reportType === "monthly" ? "Monthly Market Analysis" : "Daily Market Analysis";
}

/**
 * Vercel Cron Job Handler - Daily Market Analysis
 * This endpoint is triggered by Vercel cron jobs:
 * - Every weekday at 5pm (market close)
 * See vercel.json for cron configuration
 */
export async function handleTradingBotRequest(
	request: NextRequest,
	reportType: ReportType = "daily",
) {
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
		const reportLabel = getReportLabel(reportType);
		console.log(`\n📊 Starting ${reportLabel}...`);
		console.log(`⏰ Execution time: ${new Date().toISOString()}\n`);

		// Load tickers
		const tickers = loadTickers();
		console.log(
			`📋 Analyzing ${tickers.length} tickers: ${tickers.join(", ")}\n`,
		);

		// Analyze each ticker and collect results
		const analyses: TradingSignal[] = [];
		for (const ticker of tickers) {
			try {
				const analysis = await analyzeTicker(ticker);
				analyses.push(analysis);
				const deviation = (analysis.deviation * 100).toFixed(2);
				console.log(
					`✅ ${ticker}: ${analysis.action.toUpperCase()} (${analysis.deviation > 0 ? "+" : ""}${deviation}%)`,
				);
			} catch (error: unknown) {
				console.error(`❌ ${ticker}: Failed to analyze - ${getErrorMessage(error)}`);
				// Skip failed analyses
			}
		}

		if (analyses.length === 0) {
			throw new Error("No tickers were successfully analyzed");
		}

		console.log("\n📈 Generating charts...");

		// Generate summary chart
		const summaryChartUrl = generateSummaryChart(analyses, reportLabel);
		console.log("✅ Summary chart generated");

		// Format analysis message
		const message = formatAnalysisMessage(analyses, reportLabel);

		// Send to Telegram
		console.log("\n📱 Sending to Telegram...");
		try {
			const telegram = createTelegramService();

			// Send text summary first
			await telegram.sendMessage(message);

			// Send summary chart
			await telegram.sendPhoto(
				summaryChartUrl,
				`${reportLabel} Summary`,
			);

			console.log(`✅ Successfully sent ${reportType} report to Telegram`);
		} catch (error: unknown) {
			const message = getErrorMessage(error);
			console.error("❌ Failed to send Telegram notification:", message);
			// Don't fail the whole request if Telegram fails
			return NextResponse.json(
				{
					success: false,
					error: "Failed to send Telegram notification",
					message,
					timestamp: new Date().toISOString(),
					analyses,
					chartUrl: summaryChartUrl,
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			message: `${reportLabel} completed and sent to Telegram`,
			timestamp: new Date().toISOString(),
			tickers,
			analyses: analyses.map((a) => ({
				symbol: a.symbol,
				action: a.action,
				currentPrice: a.currentPrice,
				sma: a.sma,
				smaPeriod: a.smaPeriod,
				deviation: a.deviation,
				reason: a.reason,
			})),
			chartUrl: summaryChartUrl,
		});
	} catch (error: unknown) {
		const message = getErrorMessage(error);
		console.error("❌ Market analysis failed:", error);

		return NextResponse.json(
			{
				error: "Market analysis failed",
				message,
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}

export async function GET(request: NextRequest) {
	return handleTradingBotRequest(request, "daily");
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
	return handleTradingBotRequest(request, "daily");
}
