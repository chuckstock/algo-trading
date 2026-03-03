"use client";

import tickerConfig from "@/config/tickers.json";
import { useState } from "react";

interface TradingSignal {
	symbol: string;
	action: "buy" | "sell" | "hold" | "error";
	currentPrice: number;
	sma: number;
	smaPeriod: number;
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

const issueDateFormatter = new Intl.DateTimeFormat("en-US", {
	weekday: "long",
	month: "long",
	day: "numeric",
	year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
	hour: "numeric",
	minute: "2-digit",
});

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

	const getActionColor = (action: TradingSignal["action"]) => {
		switch (action) {
			case "buy":
				return "text-emerald-800";
			case "sell":
				return "text-red-800";
			case "hold":
				return "text-amber-800";
			case "error":
				return "text-stone-600";
			default:
				return "text-stone-600";
		}
	};

	const getActionBgColor = (action: TradingSignal["action"]) => {
		switch (action) {
			case "buy":
				return "bg-emerald-100/60 border-emerald-900/25";
			case "sell":
				return "bg-red-100/60 border-red-900/25";
			case "hold":
				return "bg-amber-100/60 border-amber-900/25";
			case "error":
				return "bg-stone-200/70 border-stone-700/20";
			default:
				return "bg-stone-200/70 border-stone-700/20";
		}
	};

	const issueDate = issueDateFormatter.format(new Date());
	const buyCount =
		result?.analyses.filter((analysis) => analysis.action === "buy").length ?? 0;
	const sellCount =
		result?.analyses.filter((analysis) => analysis.action === "sell").length ?? 0;
	const holdCount =
		result?.analyses.filter((analysis) => analysis.action === "hold").length ?? 0;
	const leadAnalysis =
		result?.analyses.find((analysis) => analysis.action !== "error") ?? null;

	return (
		<div className="min-h-screen">
			<main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
				<section className="border-y border-stone-900/80 py-3">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
						<div>
							<p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-stone-700">
								Volume 12 • Market Desk Edition
							</p>
							<h1 className="font-serif text-5xl uppercase tracking-[0.14em] text-stone-950 sm:text-6xl">
								The Signal Ledger
							</h1>
						</div>
						<div className="grid gap-1 text-sm text-stone-700 sm:text-right">
							<p>{issueDate}</p>
							<p>Midday print for symbol-specific moving-average coverage</p>
						</div>
					</div>
				</section>

				<section className="grid gap-6 border-b border-stone-900/80 py-6 lg:grid-cols-[1.5fr_0.8fr]">
					<div className="border-b border-stone-900/20 pb-6 lg:border-b-0 lg:border-r lg:pr-6">
						<p className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-stone-600">
							Lead Story
						</p>
						<h2 className="max-w-4xl font-serif text-4xl leading-none text-stone-950 sm:text-6xl">
							A trading desk dressed like the financial pages, built for quick conviction.
						</h2>
						<p className="mt-4 max-w-3xl text-lg leading-8 text-stone-700">
							This dashboard tracks your monitored tickers as if each analysis were a market
							column: clean hierarchy, tactile paper tones, and signals staged like headlines
							rather than app cards.
						</p>
					</div>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
						<div className="border border-stone-900/70 bg-[rgb(250,244,232)] p-4 shadow-[6px_6px_0_rgba(28,23,17,0.08)]">
							<p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-stone-600">
								Market Watch
							</p>
							<p className="mt-3 font-serif text-2xl text-stone-950">
								{tickerConfig.tickers.length} symbols under review
							</p>
							<div className="mt-4 flex flex-wrap gap-2">
								{tickerConfig.tickers.map((ticker) => (
									<span
										key={ticker}
										className="border border-stone-900/20 bg-stone-950 px-2 py-1 font-mono text-xs tracking-[0.2em] text-[rgb(247,239,225)]"
									>
										{ticker}
									</span>
								))}
							</div>
						</div>
						<div className="border border-stone-900/20 bg-stone-950 p-4 text-[rgb(247,239,225)]">
							<p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-stone-300">
								Desk Rule
							</p>
							<p className="mt-3 font-serif text-2xl leading-tight">
								Momentum above the configured SMA prints a buy. Weakness beneath it prints a sell.
							</p>
						</div>
					</div>
				</section>

				<section className="grid gap-6 py-6 lg:grid-cols-[0.9fr_1.8fr]">
					<div className="space-y-6">
						<article className="border border-stone-900/20 bg-[rgb(248,241,227)] p-5">
							<div className="border-b border-stone-900/70 pb-3">
								<p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-stone-600">
									Editor&apos;s Note
								</p>
								<h3 className="mt-2 font-serif text-3xl text-stone-950">
									Configuration
								</h3>
							</div>
							<div className="mt-4 space-y-4 text-sm leading-7 text-stone-700">
								<p>
									Buy when price closes at least 1% above the configured SMA. Sell when it slips
									1% below. Otherwise the desk holds.
								</p>
								<p className="border-l-2 border-[var(--accent)] pl-4 text-stone-800">
									Each symbol keeps its own SMA period, so crypto and equities can run on
									different cadences without muddying the print.
								</p>
							</div>
						</article>

						<article className="border border-stone-900/80 bg-stone-950 p-5 text-[rgb(247,239,225)]">
							<p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-stone-300">
								Press Control
							</p>
							<h3 className="mt-2 font-serif text-3xl">Dry Run Edition</h3>
							<p className="mt-3 text-sm leading-7 text-stone-300">
								Print a fresh issue without executing live trades.
							</p>
							<button
								type="button"
								onClick={triggerDryRun}
								disabled={isRunning}
								className="mt-5 inline-flex w-full items-center justify-center gap-3 border border-[rgb(247,239,225)] bg-[rgb(247,239,225)] px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.28em] text-stone-950 transition hover:bg-transparent hover:text-[rgb(247,239,225)] disabled:cursor-not-allowed disabled:border-stone-500 disabled:bg-stone-500 disabled:text-stone-950"
							>
								{isRunning ? (
									<>
										<svg
											className="h-4 w-4 animate-spin"
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
										Running Press
									</>
								) : (
									"Print New Issue"
								)}
							</button>
						</article>

						{result && (
							<article className="border border-stone-900/20 bg-[rgb(248,241,227)] p-5">
								<div className="border-b border-stone-900/70 pb-3">
									<p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-stone-600">
										Market Brief
									</p>
									<h3 className="mt-2 font-serif text-3xl text-stone-950">
										Issue Summary
									</h3>
								</div>
								<div className="mt-4 grid grid-cols-2 gap-3">
									<div className="border border-stone-900/20 p-3">
										<p className="text-[0.65rem] uppercase tracking-[0.25em] text-stone-500">
											Buy
										</p>
										<p className="mt-2 font-serif text-3xl text-emerald-800">
											{buyCount}
										</p>
									</div>
									<div className="border border-stone-900/20 p-3">
										<p className="text-[0.65rem] uppercase tracking-[0.25em] text-stone-500">
											Sell
										</p>
										<p className="mt-2 font-serif text-3xl text-red-800">
											{sellCount}
										</p>
									</div>
									<div className="border border-stone-900/20 p-3">
										<p className="text-[0.65rem] uppercase tracking-[0.25em] text-stone-500">
											Hold
										</p>
										<p className="mt-2 font-serif text-3xl text-amber-800">
											{holdCount}
										</p>
									</div>
									<div className="border border-stone-900/20 p-3">
										<p className="text-[0.65rem] uppercase tracking-[0.25em] text-stone-500">
											Time
										</p>
										<p className="mt-2 font-serif text-2xl text-stone-950">
											{timeFormatter.format(new Date(result.timestamp))}
										</p>
									</div>
								</div>
							</article>
						)}
					</div>

					<div className="space-y-6">
						{error && (
							<div className="border border-red-900/40 bg-red-100/70 p-5 text-red-900">
								<p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em]">
									Correction
								</p>
								<h3 className="mt-2 font-serif text-3xl">Press Halted</h3>
								<p className="mt-3 text-sm leading-7">{error}</p>
							</div>
						)}

						{result ? (
							<>
								<section className="border border-stone-900/80 bg-[rgb(251,245,234)] p-5">
									<div className="flex flex-col gap-3 border-b border-stone-900/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
										<div>
											<p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-stone-600">
												Banner Headline
											</p>
											<h2 className="mt-2 font-serif text-4xl text-stone-950 sm:text-5xl">
												{leadAnalysis
													? `${leadAnalysis.symbol} is trading ${
															leadAnalysis.deviation > 0 ? "above" : "below"
														} trend.`
													: "The desk is awaiting the next print cycle."}
											</h2>
										</div>
										<div className="flex items-center gap-2">
											<span className="border border-stone-900/80 px-3 py-1 font-mono text-xs uppercase tracking-[0.25em] text-stone-950">
												{result.dryRun ? "Dry Run" : "Live"}
											</span>
											<span className="text-xs uppercase tracking-[0.2em] text-stone-500">
												{issueDate}
											</span>
										</div>
									</div>
									<p className="mt-4 max-w-4xl text-base leading-8 text-stone-700">
										{leadAnalysis
											? `${leadAnalysis.reason} Current price is $${leadAnalysis.currentPrice.toFixed(
													2,
												)} against a ${leadAnalysis.smaPeriod}-day SMA of $${leadAnalysis.sma.toFixed(2)}.`
											: result.message}
									</p>
								</section>

								<section className="grid gap-4 md:grid-cols-2">
									{result.analyses.map((analysis) => (
										<article
											key={analysis.symbol}
											className={`border p-5 ${getActionBgColor(analysis.action)}`}
										>
											<div className="flex items-start justify-between gap-4 border-b border-stone-900/15 pb-3">
												<div>
													<p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-600">
														Ticker Brief
													</p>
													<h3 className="mt-2 font-serif text-4xl text-stone-950">
														{analysis.symbol}
													</h3>
												</div>
												<span
													className={`border border-current px-2 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.24em] ${getActionColor(
														analysis.action,
													)}`}
												>
													{analysis.action}
												</span>
											</div>

											{analysis.action === "error" ? (
												<p className="mt-4 text-sm leading-7 text-red-900">
													{analysis.reason}
												</p>
											) : (
												<>
													<div className="mt-4 grid grid-cols-2 gap-3">
														<div>
															<p className="text-[0.68rem] uppercase tracking-[0.25em] text-stone-500">
																Last Price
															</p>
															<p className="mt-2 font-serif text-3xl text-stone-950">
																${analysis.currentPrice.toFixed(2)}
															</p>
														</div>
														<div>
															<p className="text-[0.68rem] uppercase tracking-[0.25em] text-stone-500">
																Deviation
															</p>
															<p
																className={`mt-2 font-serif text-3xl ${getActionColor(
																	analysis.action,
																)}`}
															>
																{analysis.deviation > 0 ? "+" : ""}
																{(analysis.deviation * 100).toFixed(2)}%
															</p>
														</div>
													</div>
													<div className="mt-4 grid gap-4 border-t border-dashed border-stone-900/20 pt-4 text-sm leading-7 text-stone-700 sm:grid-cols-[0.8fr_1.2fr]">
														<div>
															<p className="text-[0.68rem] uppercase tracking-[0.25em] text-stone-500">
																Trend Basis
															</p>
															<p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-stone-950">
																{analysis.smaPeriod}-day SMA at ${analysis.sma.toFixed(2)}
															</p>
														</div>
														<div>
															<p className="text-[0.68rem] uppercase tracking-[0.25em] text-stone-500">
																Column
															</p>
															<p className="mt-1">{analysis.reason}</p>
														</div>
													</div>
												</>
											)}
										</article>
									))}
								</section>
							</>
						) : (
							<section className="border border-stone-900/80 bg-[rgb(251,245,234)] p-6">
								<p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-stone-600">
									Front Page
								</p>
								<h2 className="mt-2 max-w-3xl font-serif text-4xl text-stone-950 sm:text-5xl">
									No issue has been printed yet.
								</h2>
								<p className="mt-4 max-w-3xl text-base leading-8 text-stone-700">
									Run a dry analysis to populate the broadsheet with fresh ticker briefs, a
									lead headline, and the desk&apos;s current market posture.
								</p>
							</section>
						)}
					</div>
				</section>
			</main>
		</div>
	);
}
