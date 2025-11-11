import { getTickers } from "@/lib/ticker-queries";
import { TickerManager } from "@/components/ticker-manager";
import { DryRunTester } from "@/components/dry-run-tester";

export const dynamic = "force-dynamic"; // Don't cache this page

export default async function Home() {
  // Fetch tickers on the server
  const { tickers, source } = await getTickers();

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

        {/* Ticker Management - Client Component */}
        <TickerManager initialTickers={tickers} source={source} />

        {/* Trading Strategy Info */}
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

        {/* Dry Run Tester - Client Component */}
        <DryRunTester />
      </main>
    </div>
  );
}
