import { RobinhoodClient } from "@/lib/robinhood";
import { executeTradingStrategy } from "@/lib/trading-strategy";
import { readFileSync } from "fs";
import { type NextRequest, NextResponse } from "next/server";
import { join } from "path";

interface TickerConfig {
	tickers: string[];
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

/**
 * Vercel Cron Job Handler
 * This endpoint is triggered by Vercel cron jobs
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
		console.log("\n🤖 Starting Trading Bot...");
		console.log(`⏰ Execution time: ${new Date().toISOString()}\n`);

		// Load tickers
		const tickers = loadTickers();
		console.log(
			`📋 Monitoring ${tickers.length} tickers: ${tickers.join(", ")}\n`,
		);

		// Check if we're in dry run mode
		const dryRun =
			process.env.DRY_RUN === "true" || process.env.DRY_RUN === "1";

		// Collect signals for response
		const signals: Array<{
			symbol: string;
			action: string;
			currentPrice: number;
			sma200: number;
			deviation: number;
			reason: string;
		}> = [];

		// Analyze each ticker and collect signals (no auth needed for analysis)
		const { analyzeTicker } = await import("@/lib/trading-strategy");
		for (const ticker of tickers) {
			try {
				const signal = await analyzeTicker(ticker);
				signals.push({
					symbol: signal.symbol,
					action: signal.action,
					currentPrice: signal.currentPrice,
					sma200: signal.sma200,
					deviation: signal.deviation,
					reason: signal.reason,
				});
			} catch (error: any) {
				signals.push({
					symbol: ticker,
					action: "error",
					currentPrice: 0,
					sma200: 0,
					deviation: 0,
					reason: error.message || "Failed to analyze",
				});
			}
		}

		// Only authenticate and execute trades if not in dry run mode
		if (!dryRun) {
			// Validate environment variables for live trading
			if (!process.env.ROBINHOOD_USERNAME || !process.env.ROBINHOOD_PASSWORD) {
				throw new Error(
					"ROBINHOOD_USERNAME and ROBINHOOD_PASSWORD must be set for live trading",
				);
			}

			// Initialize Robinhood client
			const robinhoodClient = new RobinhoodClient();

			// Login to Robinhood
			console.log("🔐 Authenticating with Robinhood...");
			try {
				await robinhoodClient.login({
					username: process.env.ROBINHOOD_USERNAME,
					password: process.env.ROBINHOOD_PASSWORD,
					mfaCode: process.env.ROBINHOOD_MFA_CODE,
				});
				console.log("✅ Authentication successful\n");
			} catch (error: any) {
				console.error("❌ Authentication failed:", error.message);
				return NextResponse.json(
					{
						error: "Authentication failed",
						message: error.message,
						signals, // Return signals even if auth fails
					},
					{ status: 401 },
				);
			}

			// Execute trades
			await executeTradingStrategy(tickers, robinhoodClient, false);
		}

		return NextResponse.json({
			success: true,
			message: dryRun
				? "Trading bot analysis completed (DRY RUN - No trades executed)"
				: "Trading bot execution completed",
			timestamp: new Date().toISOString(),
			dryRun,
			tickers,
			signals,
		});
	} catch (error: any) {
		console.error("❌ Trading bot execution failed:", error);

		return NextResponse.json(
			{
				error: "Trading bot execution failed",
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
