import { NextResponse } from "next/server";
import { get } from "@vercel/edge-config";
import { readFileSync } from "fs";
import { join } from "path";

interface TickerConfig {
  tickers: string[];
}

// Fallback to local file if Edge Config is not available
function loadTickersFromFile(): string[] {
  try {
    const configPath = join(process.cwd(), "config", "tickers.json");
    const config: TickerConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    return config.tickers;
  } catch (error) {
    console.error("Error loading tickers from file:", error);
    return [];
  }
}

// GET - Fetch current tickers
export async function GET() {
  try {
    // Try to get tickers from Edge Config first
    const tickers = await get<string[]>("tickers");

    if (tickers && Array.isArray(tickers)) {
      return NextResponse.json({
        tickers,
        source: "edge-config"
      });
    }

    // Fallback to file if Edge Config is not configured or returns null
    const fileTickers = loadTickersFromFile();
    return NextResponse.json({
      tickers: fileTickers,
      source: "file"
    });
  } catch (error) {
    console.error("Error fetching tickers:", error);

    // Fallback to file on error
    const fileTickers = loadTickersFromFile();
    return NextResponse.json({
      tickers: fileTickers,
      source: "file",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

// PUT - Update tickers in Edge Config
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { tickers } = body;

    if (!Array.isArray(tickers)) {
      return NextResponse.json(
        { error: "Tickers must be an array" },
        { status: 400 }
      );
    }

    // Validate ticker format (basic validation)
    const invalidTickers = tickers.filter(
      (ticker) => typeof ticker !== "string" || ticker.trim().length === 0
    );

    if (invalidTickers.length > 0) {
      return NextResponse.json(
        { error: "All tickers must be non-empty strings" },
        { status: 400 }
      );
    }

    // Check if Edge Config token is available
    const edgeConfigToken = process.env.EDGE_CONFIG;
    if (!edgeConfigToken) {
      return NextResponse.json(
        {
          error: "Edge Config is not configured. Please set EDGE_CONFIG environment variable.",
          fallbackAvailable: true
        },
        { status: 503 }
      );
    }

    // Update Edge Config using Vercel API
    // Note: We need to use the Vercel API to update Edge Config
    // The @vercel/edge-config package only provides read access
    const vercelToken = process.env.VERCEL_API_TOKEN;
    const edgeConfigId = process.env.EDGE_CONFIG_ID;

    if (!vercelToken || !edgeConfigId) {
      return NextResponse.json(
        {
          error: "Missing VERCEL_API_TOKEN or EDGE_CONFIG_ID environment variables",
          fallbackAvailable: true
        },
        { status: 503 }
      );
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

    return NextResponse.json({
      success: true,
      tickers,
      message: "Tickers updated successfully in Edge Config",
    });
  } catch (error) {
    console.error("Error updating tickers:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 500 }
    );
  }
}
