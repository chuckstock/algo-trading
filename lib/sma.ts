import YahooFinance from "yahoo-finance2";

export interface PriceData {
	date: Date;
	close: number;
}

const DEFAULT_SMA_PERIOD = 200;
const SYMBOL_SMA_PERIODS: Record<string, number> = {
	"BTC-USD": 20,
	"ETH-USD": 20,
};

export function getSMAPeriod(symbol: string): number {
	return SYMBOL_SMA_PERIODS[symbol] ?? DEFAULT_SMA_PERIOD;
}

/**
 * Calculate Simple Moving Average (SMA) for a given period
 */
export function calculateSMA(prices: number[], period: number): number {
	if (prices.length < period) {
		throw new Error(
			`Not enough data points. Need ${period}, got ${prices.length}`,
		);
	}

	const recentPrices = prices.slice(-period);
	const sum = recentPrices.reduce((acc, price) => acc + price, 0);
	return sum / period;
}

/**
 * Fetch historical price data for a ticker
 */
export async function getHistoricalData(
	symbol: string,
	period: number = DEFAULT_SMA_PERIOD + 50,
): Promise<PriceData[]> {
	try {
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - period * 2); // Get extra data to be safe

		const yahooFinance = new YahooFinance();

		const queryOptions = {
			period1: Math.floor(startDate.getTime() / 1000),
			period2: Math.floor(endDate.getTime() / 1000),
			interval: "1d" as const,
		};

		const result = await yahooFinance.historical(symbol, queryOptions);

		if (!result || result.length === 0) {
			throw new Error(`No historical data found for ${symbol}`);
		}

		return result.map((item) => ({
			date: item.date,
			close: item.close,
		}));
	} catch (error) {
		console.error(`Failed to fetch historical data for ${symbol}:`, error);
		throw error;
	}
}

/**
 * Get current price and configured SMA for a ticker
 */
export async function getCurrentPriceAndSMA(symbol: string): Promise<{
	currentPrice: number;
	sma: number;
	smaPeriod: number;
	priceData: PriceData[];
}> {
	const smaPeriod = getSMAPeriod(symbol);
	const historyWindow = Math.max(DEFAULT_SMA_PERIOD + 50, smaPeriod + 50);
	const priceData = await getHistoricalData(symbol, historyWindow);

	if (priceData.length < smaPeriod) {
		throw new Error(
			`Insufficient data for ${symbol}. Need at least ${smaPeriod} days, got ${priceData.length}`,
		);
	}

	const closes = priceData.map((d) => d.close);
	const sma = calculateSMA(closes, smaPeriod);
	const currentPrice = priceData[priceData.length - 1].close;

	return {
		currentPrice,
		sma,
		smaPeriod,
		priceData,
	};
}
