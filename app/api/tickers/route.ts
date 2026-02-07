import { NextResponse } from "next/server";
import { getTickers } from "@/lib/ticker-queries";

// GET - Fetch current tickers (kept for backward compatibility with external tools)
// For Next.js components, use getTickers from ticker-queries directly
export async function GET() {
  const data = await getTickers();
  return NextResponse.json(data);
}
