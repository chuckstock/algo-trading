"use server";

import { get } from "@vercel/edge-config";
import { analyzeTicker } from "@/lib/trading-strategy";
import { readFileSync } from "fs";
import { join } from "path";

interface TickerConfig {
  tickers: string[];
}

// Get tickers from Edge Config with fallback to file
export async function getTickers(): Promise<{
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

// Preview a ticker with current market data
export async function previewTicker(ticker: string): Promise<{
  success: boolean;
  ticker?: string;
  data?: {
    symbol: string;
    action: "buy" | "sell" | "hold" | "error";
    currentPrice: number;
    sma200: number;
    deviation: number;
    reason: string;
  };
  error?: string;
}> {
  try {
    if (!ticker || typeof ticker !== "string") {
      return {
        success: false,
        error: "Ticker symbol is required and must be a string",
      };
    }

    const normalizedTicker = ticker.trim().toUpperCase();

    if (normalizedTicker.length === 0) {
      return {
        success: false,
        error: "Ticker symbol cannot be empty",
      };
    }

    // Analyze the ticker to get current market data
    const analysis = await analyzeTicker(normalizedTicker);

    return {
      success: true,
      ticker: normalizedTicker,
      data: analysis,
    };
  } catch (error) {
    console.error("Error previewing ticker:", error);

    // Check if it's a Yahoo Finance error (ticker not found)
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isTickerNotFound =
      errorMessage.includes("Not Found") ||
      errorMessage.includes("No data found") ||
      errorMessage.includes("Invalid ticker");

    return {
      success: false,
      error: isTickerNotFound
        ? `Ticker "${ticker}" not found. Please verify the symbol is correct.`
        : errorMessage,
    };
  }
}

// Update tickers in Edge Config
export async function updateTickers(tickers: string[]): Promise<{
  success: boolean;
  tickers?: string[];
  message?: string;
  error?: string;
}> {
  try {
    if (!Array.isArray(tickers)) {
      return {
        success: false,
        error: "Tickers must be an array",
      };
    }

    // Validate ticker format (basic validation)
    const invalidTickers = tickers.filter(
      (ticker) => typeof ticker !== "string" || ticker.trim().length === 0
    );

    if (invalidTickers.length > 0) {
      return {
        success: false,
        error: "All tickers must be non-empty strings",
      };
    }

    // Check if Edge Config token is available
    const edgeConfigToken = process.env.EDGE_CONFIG;
    if (!edgeConfigToken) {
      return {
        success: false,
        error: "Edge Config is not configured. Please set EDGE_CONFIG environment variable.",
      };
    }

    // Update Edge Config using Vercel API
    const vercelToken = process.env.VERCEL_API_TOKEN;
    const edgeConfigId = process.env.EDGE_CONFIG_ID;

    if (!vercelToken || !edgeConfigId) {
      return {
        success: false,
        error: "Missing VERCEL_API_TOKEN or EDGE_CONFIG_ID environment variables",
      };
    }

    // Update Edge Config via Vercel API
    const response = await fetch(
      `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              operation: "upsert",
              key: "tickers",
              value: tickers,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to update Edge Config");
    }

    return {
      success: true,
      tickers,
      message: "Tickers updated successfully in Edge Config",
    };
  } catch (error) {
    console.error("Error updating tickers:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
