import { NextResponse } from "next/server";
import { analyzeTicker } from "@/lib/trading-strategy";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticker } = body;

    if (!ticker || typeof ticker !== "string") {
      return NextResponse.json(
        { error: "Ticker symbol is required and must be a string" },
        { status: 400 }
      );
    }

    const normalizedTicker = ticker.trim().toUpperCase();

    if (normalizedTicker.length === 0) {
      return NextResponse.json(
        { error: "Ticker symbol cannot be empty" },
        { status: 400 }
      );
    }

    // Analyze the ticker to get current market data
    const analysis = await analyzeTicker(normalizedTicker);

    return NextResponse.json({
      success: true,
      ticker: normalizedTicker,
      data: analysis,
    });
  } catch (error) {
    console.error("Error previewing ticker:", error);

    // Check if it's a Yahoo Finance error (ticker not found)
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isTickerNotFound = errorMessage.includes("Not Found") ||
                             errorMessage.includes("No data found") ||
                             errorMessage.includes("Invalid ticker");

    return NextResponse.json(
      {
        success: false,
        error: isTickerNotFound
          ? `Ticker "${body.ticker}" not found. Please verify the symbol is correct.`
          : errorMessage,
      },
      { status: isTickerNotFound ? 404 : 500 }
    );
  }
}
