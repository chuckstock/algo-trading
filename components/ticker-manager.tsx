"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { previewTicker, updateTickers } from "@/lib/ticker-actions";

interface TradingSignal {
  symbol: string;
  action: "buy" | "sell" | "hold" | "error";
  currentPrice: number;
  sma200: number;
  deviation: number;
  reason: string;
}

interface TickerPreview {
  ticker: string;
  data: TradingSignal;
}

interface TickerManagerProps {
  initialTickers: string[];
  source: "edge-config" | "file";
}

export function TickerManager({ initialTickers, source }: TickerManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Ticker management state
  const [tickerSource, setTickerSource] = useState<"edge-config" | "file">(source);
  const [newTicker, setNewTicker] = useState("");
  const [previewData, setPreviewData] = useState<TickerPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [pendingTickers, setPendingTickers] = useState<string[]>(initialTickers);

  const handlePreviewTicker = async () => {
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
      const result = await previewTicker(normalizedTicker);

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

  const handleSaveTickers = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const result = await updateTickers(pendingTickers);

      if (!result.success) {
        throw new Error(result.error || "Failed to save tickers");
      }

      setSaveMessage("✓ Tickers saved successfully to Edge Config!");
      setTickerSource("edge-config");

      // Refresh the page to get updated data from server
      startTransition(() => {
        router.refresh();
      });

      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage(`✗ ${err instanceof Error ? err.message : "Failed to save tickers"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = JSON.stringify(initialTickers) !== JSON.stringify(pendingTickers);

  const getActionColor = (action: string) => {
    switch (action) {
      case "buy":
        return "text-green-600 dark:text-green-400";
      case "sell":
        return "text-red-600 dark:text-red-400";
      case "hold":
        return "text-yellow-600 dark:text-yellow-400";
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
      default:
        return "bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-900";
    }
  };

  return (
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
          Current Tickers {isPending && "(Updating...)"}
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
              onKeyDown={(e) => e.key === "Enter" && handlePreviewTicker()}
              placeholder="e.g., AAPL"
              className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handlePreviewTicker}
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
              onClick={handleSaveTickers}
              disabled={isSaving || isPending}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save Changes to Edge Config"}
            </button>
            <button
              type="button"
              onClick={() => setPendingTickers(initialTickers)}
              disabled={isSaving || isPending}
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
  );
}
