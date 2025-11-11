"use client";

import tickerConfig from "@/config/tickers.json";
import { useState, useEffect } from "react";
import { getTickers, previewTicker as previewTickerAction, updateTickers } from "@/lib/ticker-actions";

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
	analyses: TradingSignal[];
	error?: string;
}

interface TickerPreview {
	ticker: string;
	data: TradingSignal;
}

export default function Home() {
	const [isRunning, setIsRunning] = useState(false);
	const [result, setResult] = useState<ExecutionResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Ticker management state
	const [currentTickers, setCurrentTickers] = useState<string[]>(tickerConfig.tickers);
	const [tickerSource, setTickerSource] = useState<"edge-config" | "file">("file");
	const [isLoadingTickers, setIsLoadingTickers] = useState(true);
	const [newTicker, setNewTicker] = useState("");
	const [previewData, setPreviewData] = useState<TickerPreview | null>(null);
	const [isPreviewLoading, setIsPreviewLoading] = useState(false);
	const [previewError, setPreviewError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [saveMessage, setSaveMessage] = useState<string | null>(null);
	const [pendingTickers, setPendingTickers] = useState<string[]>([]);

	// Load tickers on mount
	useEffect(() => {
		loadTickers();
	}, []);

	const loadTickers = async () => {
		setIsLoadingTickers(true);
		try {
			const data = await getTickers();
			if (data.tickers) {
				setCurrentTickers(data.tickers);
				setPendingTickers(data.tickers);
				setTickerSource(data.source);
			}
		} catch (err) {
			console.error("Failed to load tickers:", err);
		} finally {
			setIsLoadingTickers(false);
		}
	};

	const previewTicker = async () => {
		if (!newTicker.trim()) return;

		const normalizedTicker = newTicker.trim().toUpperCase();

		// Check if ticker already exists in pending list
		if (pendingTickers.includes(normalizedTicker)) {
			setPreviewError(`${normalizedTicker} is already in your ticker list`);
			return;
		}

		setIsPreviewLoading(true);
		setPreviewError(null);
		setPreviewData(null);

		try {
			const result = await previewTickerAction(normalizedTicker);

			if (!result.success) {
				throw new Error(result.error || "Failed to preview ticker");
			}

			if (result.ticker && result.data) {
				setPreviewData({
					ticker: result.ticker,
					data: result.data,
				});
			}
		} catch (err) {
			setPreviewError(err instanceof Error ? err.message : "Failed to preview ticker");
		} finally {
			setIsPreviewLoading(false);
		}
	};

	const addTickerToPending = () => {
		if (previewData) {
			setPendingTickers([...pendingTickers, previewData.ticker]);
			setNewTicker("");
			setPreviewData(null);
			setPreviewError(null);
			setSaveMessage(null);
		}
	};

	const removeTickerFromPending = (ticker: string) => {
		setPendingTickers(pendingTickers.filter((t) => t !== ticker));
		setSaveMessage(null);
	};

	const saveTickers = async () => {
		setIsSaving(true);
		setSaveMessage(null);

		try {
			const result = await updateTickers(pendingTickers);

			if (!result.success) {
				throw new Error(result.error || "Failed to save tickers");
			}

			setCurrentTickers(pendingTickers);
			setSaveMessage("✓ Tickers saved successfully to Edge Config!");
			setTickerSource("edge-config");

			// Clear success message after 3 seconds
			setTimeout(() => setSaveMessage(null), 3000);
		} catch (err) {
			setSaveMessage(`✗ ${err instanceof Error ? err.message : "Failed to save tickers"}`);
		} finally {
			setIsSaving(false);
		}
	};

	const hasChanges = JSON.stringify(currentTickers) !== JSON.stringify(pendingTickers);

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
			console.log("🚀 ~ triggerDryRun ~ data:", data);

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

				{/* Ticker Management */}
				<div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-xl font-semibold text-black dark:text-zinc-50">
							Manage Tickers
						</h2>
						<span className="text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
							Source: {tickerSource === "edge-config" ? "Edge Config" : "Local File"}
						</span>
					</div>

					{/* Current Tickers */}
					<div className="mb-6">
						<p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
							Current Tickers {isLoadingTickers && "(Loading...)"}
						</p>
						<div className="flex flex-wrap gap-2">
							{pendingTickers.map((ticker) => (
								<span
									key={ticker}
									className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-sm font-mono text-black dark:text-zinc-50 flex items-center gap-2"
								>
									{ticker}
									<button
										type="button"
										onClick={() => removeTickerFromPending(ticker)}
										className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
										aria-label={`Remove ${ticker}`}
									>
										×
									</button>
								</span>
							))}
						</div>
					</div>

					{/* Add New Ticker */}
					<div className="space-y-4">
						<div>
							<label htmlFor="newTicker" className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 block">
								Add New Ticker
							</label>
							<div className="flex gap-2">
								<input
									id="newTicker"
									type="text"
									value={newTicker}
									onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
									onKeyDown={(e) => e.key === "Enter" && previewTicker()}
									placeholder="e.g., AAPL"
									className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								<button
									type="button"
									onClick={previewTicker}
									disabled={!newTicker.trim() || isPreviewLoading}
									className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
								>
									{isPreviewLoading ? "Loading..." : "Preview"}
								</button>
							</div>
						</div>

						{/* Preview Error */}
						{previewError && (
							<div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">
								<p className="text-sm text-red-700 dark:text-red-300">{previewError}</p>
							</div>
						)}

						{/* Preview Data */}
						{previewData && (
							<div className={`border rounded-lg p-4 ${getActionBgColor(previewData.data.action)}`}>
								<div className="flex items-start justify-between mb-3">
									<div className="flex items-center gap-3">
										<span className="font-mono text-lg font-bold text-black dark:text-zinc-50">
											{previewData.ticker}
										</span>
										<span
											className={`px-2 py-1 rounded text-xs font-semibold uppercase ${getActionColor(
												previewData.data.action,
											)}`}
										>
											{previewData.data.action}
										</span>
									</div>
									<div className="text-right">
										<p className="text-sm font-semibold text-black dark:text-zinc-50">
											${previewData.data.currentPrice.toFixed(2)}
										</p>
										<p className="text-xs text-zinc-600 dark:text-zinc-400">Current Price</p>
									</div>
								</div>

								<div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-sm">
									<div>
										<p className="text-zinc-600 dark:text-zinc-400 mb-1">200-day SMA</p>
										<p className="font-semibold text-black dark:text-zinc-50">
											${previewData.data.sma200.toFixed(2)}
										</p>
									</div>
									<div>
										<p className="text-zinc-600 dark:text-zinc-400 mb-1">Deviation</p>
										<p
											className={`font-semibold ${
												previewData.data.deviation > 0
													? "text-green-600 dark:text-green-400"
													: "text-red-600 dark:text-red-400"
											}`}
										>
											{previewData.data.deviation > 0 ? "+" : ""}
											{(previewData.data.deviation * 100).toFixed(2)}%
										</p>
									</div>
									<div className="md:col-span-1 col-span-2">
										<p className="text-zinc-600 dark:text-zinc-400 mb-1">Signal</p>
										<p className="text-black dark:text-zinc-50">{previewData.data.reason}</p>
									</div>
								</div>

								<button
									type="button"
									onClick={addTickerToPending}
									className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
								>
									Add to List
								</button>
							</div>
						)}

						{/* Save Changes */}
						{hasChanges && (
							<div className="flex items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
								<button
									type="button"
									onClick={saveTickers}
									disabled={isSaving}
									className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
								>
									{isSaving ? "Saving..." : "Save Changes to Edge Config"}
								</button>
								<button
									type="button"
									onClick={() => setPendingTickers(currentTickers)}
									disabled={isSaving}
									className="px-6 py-3 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-black dark:text-zinc-50 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
								>
									Cancel
								</button>
							</div>
						)}

						{/* Save Message */}
						{saveMessage && (
							<div
								className={`rounded-lg p-3 ${
									saveMessage.startsWith("✓")
										? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900"
										: "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
								}`}
							>
								<p
									className={`text-sm ${
										saveMessage.startsWith("✓")
											? "text-green-700 dark:text-green-300"
											: "text-red-700 dark:text-red-300"
									}`}
								>
									{saveMessage}
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Configuration Card */}
				<div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
					<h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
						Trading Strategy
					</h2>
					<div className="space-y-2">
						<p className="text-sm text-black dark:text-zinc-50">
							<span className="font-semibold text-green-600 dark:text-green-400">Buy:</span> Price is 1%+ above 200-day SMA (momentum)
						</p>
						<p className="text-sm text-black dark:text-zinc-50">
							<span className="font-semibold text-red-600 dark:text-red-400">Sell:</span> Price is 1%+ below 200-day SMA (weakness)
						</p>
						<p className="text-sm text-black dark:text-zinc-50">
							<span className="font-semibold text-yellow-600 dark:text-yellow-400">Hold:</span> Price within 1% of 200-day SMA
						</p>
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
										{result.analyses.filter((a) => a.action === "buy").length}
									</p>
								</div>
								<div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
									<p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
										Sell Signals
									</p>
									<p className="text-2xl font-bold text-red-600 dark:text-red-400">
										{result.analyses.filter((a) => a.action === "sell").length}
									</p>
								</div>
								<div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-3">
									<p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
										Hold Signals
									</p>
									<p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
										{result.analyses.filter((a) => a.action === "hold").length}
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
								{result.analyses.map((analysis) => (
									<div
										key={analysis.symbol}
										className={`border rounded-lg p-4 ${getActionBgColor(
											analysis.action,
										)}`}
									>
										<div className="flex items-start justify-between mb-2">
											<div className="flex items-center gap-3">
												<span className="font-mono text-lg font-bold text-black dark:text-zinc-50">
													{analysis.symbol}
												</span>
												<span
													className={`px-2 py-1 rounded text-xs font-semibold uppercase ${getActionColor(
														analysis.action,
													)}`}
												>
													{analysis.action}
												</span>
											</div>
											{analysis.action !== "error" && (
												<div className="text-right">
													<p className="text-sm font-semibold text-black dark:text-zinc-50">
														${analysis.currentPrice.toFixed(2)}
													</p>
													<p className="text-xs text-zinc-600 dark:text-zinc-400">
														Current Price
													</p>
												</div>
											)}
										</div>

										{analysis.action !== "error" && (
											<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
												<div>
													<p className="text-zinc-600 dark:text-zinc-400 mb-1">
														200-day SMA
													</p>
													<p className="font-semibold text-black dark:text-zinc-50">
														${analysis.sma200.toFixed(2)}
													</p>
												</div>
												<div>
													<p className="text-zinc-600 dark:text-zinc-400 mb-1">
														Deviation
													</p>
													<p
														className={`font-semibold ${
															analysis.deviation > 0
																? "text-green-600 dark:text-green-400"
																: "text-red-600 dark:text-red-400"
														}`}
													>
														{analysis.deviation > 0 ? "+" : ""}
														{(analysis.deviation * 100).toFixed(2)}%
													</p>
												</div>
												<div className="md:col-span-2">
													<p className="text-zinc-600 dark:text-zinc-400 mb-1">
														Reason
													</p>
													<p className="text-black dark:text-zinc-50">
														{analysis.reason}
													</p>
												</div>
											</div>
										)}

										{analysis.action === "error" && (
											<p className="text-sm text-red-600 dark:text-red-400 mt-2">
												{analysis.reason}
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
