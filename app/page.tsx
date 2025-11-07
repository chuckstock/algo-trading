"use client";

import tickerConfig from "@/config/tickers.json";
import { useState } from "react";

interface TradingSignal {
	symbol: string;
	action: "buy" | "sell" | "hold" | "error";
	currentPrice: number;
	sma200: number;
	deviation: number;
	reason: string;
}

interface ExecutionResult {
	success: boolean;
	message: string;
	timestamp: string;
	dryRun: boolean;
	tickers: string[];
	signals: TradingSignal[];
	error?: string;
}

export default function Home() {
	const [isRunning, setIsRunning] = useState(false);
	const [result, setResult] = useState<ExecutionResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	const triggerDryRun = async () => {
		setIsRunning(true);
		setError(null);
		setResult(null);

		try {
			const response = await fetch("/api/trading-bot", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(
					data.message || data.error || "Failed to execute trading bot",
				);
			}

			setResult(data);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "An unknown error occurred",
			);
		} finally {
			setIsRunning(false);
		}
	};

	const getActionColor = (action: string) => {
		switch (action) {
			case "buy":
				return "text-green-600 dark:text-green-400";
			case "sell":
				return "text-red-600 dark:text-red-400";
			case "hold":
				return "text-yellow-600 dark:text-yellow-400";
			case "error":
				return "text-gray-600 dark:text-gray-400";
			default:
				return "text-gray-600 dark:text-gray-400";
		}
	};

	const getActionBgColor = (action: string) => {
		switch (action) {
			case "buy":
				return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900";
			case "sell":
				return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900";
			case "hold":
				return "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900";
			case "error":
				return "bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-900";
			default:
				return "bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-900";
		}
	};

	return (
		<div className="min-h-screen bg-zinc-50 dark:bg-black font-sans">
			<main className="container mx-auto px-4 py-8 max-w-6xl">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-4xl font-bold text-black dark:text-zinc-50 mb-2">
						Algo Trading Bot
					</h1>
					<p className="text-lg text-zinc-600 dark:text-zinc-400">
						Monitor tickers and execute trades based on 200-day SMA strategy
					</p>
				</div>

				{/* Configuration Card */}
				<div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
					<h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
						Configuration
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
								Monitored Tickers
							</p>
							<div className="flex flex-wrap gap-2">
								{tickerConfig.tickers.map((ticker) => (
									<span
										key={ticker}
										className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-sm font-mono text-black dark:text-zinc-50"
									>
										{ticker}
									</span>
								))}
							</div>
						</div>
						<div>
							<p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
								Strategy
							</p>
							<p className="text-sm text-black dark:text-zinc-50">
								Buy: 1%+ above 200-day SMA (momentum)
								<br />
								Sell: 1%+ below 200-day SMA (weakness)
								<br />
								Hold: Within 1% of 200-day SMA
							</p>
						</div>
					</div>
				</div>

				{/* Control Panel */}
				<div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-2">
								Dry Run Test
							</h2>
							<p className="text-sm text-zinc-600 dark:text-zinc-400">
								Test the trading strategy without executing real trades
							</p>
						</div>
						<button
							type="button"
							onClick={triggerDryRun}
							disabled={isRunning}
							className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center gap-2"
						>
							{isRunning ? (
								<>
									<svg
										className="animate-spin h-5 w-5"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										aria-label="Loading"
									>
										<title>Loading</title>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										></circle>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									Running...
								</>
							) : (
								"Run Analysis"
							)}
						</button>
					</div>
				</div>

				{/* Error Display */}
				{error && (
					<div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4 mb-6">
						<div className="flex items-start gap-3">
							<svg
								className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-label="Error icon"
							>
								<title>Error icon</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<div>
								<h3 className="font-semibold text-red-800 dark:text-red-400 mb-1">
									Error
								</h3>
								<p className="text-sm text-red-700 dark:text-red-300">
									{error}
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Results Display */}
				{result && (
					<div className="space-y-6">
						{/* Summary Card */}
						<div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-xl font-semibold text-black dark:text-zinc-50">
									Execution Results
								</h2>
								<div className="flex items-center gap-2">
									<span
										className={`px-3 py-1 rounded-full text-xs font-medium ${
											result.dryRun
												? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
												: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
										}`}
									>
										{result.dryRun ? "DRY RUN" : "LIVE"}
									</span>
									<span className="text-xs text-zinc-500 dark:text-zinc-400">
										{new Date(result.timestamp).toLocaleString()}
									</span>
								</div>
							</div>

							{/* Stats Grid */}
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
								<div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
									<p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
										Total Tickers
									</p>
									<p className="text-2xl font-bold text-black dark:text-zinc-50">
										{result.tickers.length}
									</p>
								</div>
								<div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
									<p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
										Buy Signals
									</p>
									<p className="text-2xl font-bold text-green-600 dark:text-green-400">
										{result.signals.filter((s) => s.action === "buy").length}
									</p>
								</div>
								<div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
									<p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
										Sell Signals
									</p>
									<p className="text-2xl font-bold text-red-600 dark:text-red-400">
										{result.signals.filter((s) => s.action === "sell").length}
									</p>
								</div>
								<div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-3">
									<p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
										Hold Signals
									</p>
									<p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
										{result.signals.filter((s) => s.action === "hold").length}
									</p>
								</div>
							</div>
						</div>

						{/* Signals List */}
						<div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
							<h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
								Ticker Analysis
							</h2>
							<div className="space-y-3">
								{result.signals.map((signal) => (
									<div
										key={signal.symbol}
										className={`border rounded-lg p-4 ${getActionBgColor(
											signal.action,
										)}`}
									>
										<div className="flex items-start justify-between mb-2">
											<div className="flex items-center gap-3">
												<span className="font-mono text-lg font-bold text-black dark:text-zinc-50">
													{signal.symbol}
												</span>
												<span
													className={`px-2 py-1 rounded text-xs font-semibold uppercase ${getActionColor(
														signal.action,
													)}`}
												>
													{signal.action}
												</span>
											</div>
											{signal.action !== "error" && (
												<div className="text-right">
													<p className="text-sm font-semibold text-black dark:text-zinc-50">
														${signal.currentPrice.toFixed(2)}
													</p>
													<p className="text-xs text-zinc-600 dark:text-zinc-400">
														Current Price
													</p>
												</div>
											)}
										</div>

										{signal.action !== "error" && (
											<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
												<div>
													<p className="text-zinc-600 dark:text-zinc-400 mb-1">
														200-day SMA
													</p>
													<p className="font-semibold text-black dark:text-zinc-50">
														${signal.sma200.toFixed(2)}
													</p>
												</div>
												<div>
													<p className="text-zinc-600 dark:text-zinc-400 mb-1">
														Deviation
													</p>
													<p
														className={`font-semibold ${
															signal.deviation > 0
																? "text-green-600 dark:text-green-400"
																: "text-red-600 dark:text-red-400"
														}`}
													>
														{signal.deviation > 0 ? "+" : ""}
														{(signal.deviation * 100).toFixed(2)}%
													</p>
												</div>
												<div className="md:col-span-2">
													<p className="text-zinc-600 dark:text-zinc-400 mb-1">
														Reason
													</p>
													<p className="text-black dark:text-zinc-50">
														{signal.reason}
													</p>
												</div>
											</div>
										)}

										{signal.action === "error" && (
											<p className="text-sm text-red-600 dark:text-red-400 mt-2">
												{signal.reason}
											</p>
										)}
									</div>
								))}
							</div>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
