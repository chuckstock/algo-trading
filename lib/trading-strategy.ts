import type { RobinhoodClient } from "./robinhood";
import { getCurrentPriceAndSMA } from "./sma";

export interface TradingSignal {
	symbol: string;
	action: "buy" | "sell" | "hold";
	currentPrice: number;
	sma200: number;
	deviation: number; // Percentage deviation from SMA
	reason: string;
}

const THRESHOLD_PERCENT = 0.01; // 1%

/**
 * Analyze a ticker and determine trading signal based on 200-day SMA
 */
export async function analyzeTicker(symbol: string): Promise<TradingSignal> {
	try {
		const { currentPrice, sma200 } = await getCurrentPriceAndSMA(symbol);

		const deviation = (currentPrice - sma200) / sma200;
		const threshold = THRESHOLD_PERCENT;

		let action: "buy" | "sell" | "hold" = "hold";
		let reason = "";

		if (deviation > threshold) {
			// Price is 1% or more above SMA - buy signal (momentum strategy)
			action = "buy";
			reason = `Price ($${currentPrice.toFixed(2)}) is ${(deviation * 100).toFixed(2)}% above 200-day SMA ($${sma200.toFixed(2)}) - buying on momentum`;
		} else if (deviation < -threshold) {
			// Price is 1% or more below SMA - sell signal (trend weakness)
			action = "sell";
			reason = `Price ($${currentPrice.toFixed(2)}) is ${Math.abs(deviation * 100).toFixed(2)}% below 200-day SMA ($${sma200.toFixed(2)}) - selling on weakness`;
		} else {
			// Price is within threshold - hold
			action = "hold";
			reason = `Price ($${currentPrice.toFixed(2)}) is within ${(threshold * 100).toFixed(1)}% of 200-day SMA ($${sma200.toFixed(2)})`;
		}

		return {
			symbol,
			action,
			currentPrice,
			sma200,
			deviation,
			reason,
		};
	} catch (error) {
		console.error(`Error analyzing ${symbol}:`, error);
		throw error;
	}
}

/**
 * Execute trading strategy for a list of tickers
 */
export async function executeTradingStrategy(
	tickers: string[],
	robinhoodClient: RobinhoodClient,
	dryRun: boolean = false,
): Promise<void> {
	console.log(`\n📊 Analyzing ${tickers.length} tickers...\n`);

	const signals: TradingSignal[] = [];

	// Analyze all tickers first
	for (const ticker of tickers) {
		try {
			const signal = await analyzeTicker(ticker);
			signals.push(signal);

			console.log(`\n${ticker}:`);
			console.log(`  Current Price: $${signal.currentPrice.toFixed(2)}`);
			console.log(`  200-day SMA: $${signal.sma200.toFixed(2)}`);
			console.log(`  Deviation: ${(signal.deviation * 100).toFixed(2)}%`);
			console.log(`  Action: ${signal.action.toUpperCase()}`);
			console.log(`  Reason: ${signal.reason}`);
		} catch (error) {
			console.error(`❌ Failed to analyze ${ticker}:`, error);
		}
	}

	// Execute trades
	if (dryRun) {
		console.log("\n🔍 DRY RUN MODE - No trades will be executed\n");
		return;
	}

	console.log("\n💰 Executing trades...\n");

	for (const signal of signals) {
		if (signal.action === "hold") {
			continue;
		}

		try {
			// Get current positions to determine quantity
			const positions = await robinhoodClient.getPositions();
			const currentPosition = positions.find((p) => p.symbol === signal.symbol);
			const currentQuantity = currentPosition?.quantity || 0;

			if (signal.action === "buy") {
				// For buy orders, you might want to calculate quantity based on available cash
				// For now, we'll use a fixed quantity or calculate based on a dollar amount
				const dollarAmount = parseFloat(process.env.TRADE_AMOUNT || "1000");
				const quantity = Math.floor(dollarAmount / signal.currentPrice);

				if (quantity > 0) {
					await robinhoodClient.buyOrder({
						symbol: signal.symbol,
						quantity,
						side: "buy",
						orderType: "market",
					});
				}
			} else if (signal.action === "sell") {
				// For sell orders, sell all current positions
				if (currentQuantity > 0) {
					await robinhoodClient.sellOrder({
						symbol: signal.symbol,
						quantity: currentQuantity,
						side: "sell",
						orderType: "market",
					});
				} else {
					console.log(`⚠️  No position to sell for ${signal.symbol}`);
				}
			}
		} catch (error) {
			console.error(
				`❌ Failed to execute ${signal.action} order for ${signal.symbol}:`,
				error,
			);
		}
	}

	console.log("\n✅ Trading strategy execution complete!\n");
}
