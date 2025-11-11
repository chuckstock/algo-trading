import { get } from "@vercel/edge-config";
import { readFileSync } from "fs";
import { join } from "path";
import { unstable_cache } from "next/cache";

interface TickerConfig {
  tickers: string[];
}

// Query function to get tickers from Edge Config with fallback to file
// This is for Server Components, not actions
async function getTickersUncached(): Promise<{
  tickers: string[];
  source: "edge-config" | "file";
  error?: string;
}> {
  try {
    // Try to get tickers from Edge Config first
    const tickers = await get<string[]>("tickers");

    if (tickers && Array.isArray(tickers)) {
      return {
        tickers,
        source: "edge-config",
      };
    }

    // Fallback to file if Edge Config is not configured or returns null
    const configPath = join(process.cwd(), "config", "tickers.json");
    const config: TickerConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    return {
      tickers: config.tickers,
      source: "file",
    };
  } catch (error) {
    console.error("Error fetching tickers:", error);

    // Fallback to file on error
    try {
      const configPath = join(process.cwd(), "config", "tickers.json");
      const config: TickerConfig = JSON.parse(readFileSync(configPath, "utf-8"));
      return {
        tickers: config.tickers,
        source: "file",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } catch (fileError) {
      return {
        tickers: [],
        source: "file",
        error: "Failed to load tickers from both Edge Config and file",
      };
    }
  }
}

// Cached version for Server Components
// Revalidates when tickers are updated via actions
export const getTickers = unstable_cache(
  getTickersUncached,
  ["tickers"],
  {
    revalidate: 60, // Revalidate every 60 seconds as fallback
    tags: ["tickers"], // Can be revalidated on-demand via revalidateTag
  }
);
