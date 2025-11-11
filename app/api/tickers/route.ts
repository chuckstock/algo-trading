import { NextResponse } from "next/server";
import { getTickers } from "@/lib/ticker-actions";

// GET - Fetch current tickers (kept for backward compatibility)
// Consider using the getTickers server action directly instead
export async function GET() {
  const data = await getTickers();
  return NextResponse.json(data);
}
