import {
	handleTradingBotRequest,
	isLastDayOfMonth,
} from "@/app/api/trading-bot/route";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	if (!isLastDayOfMonth()) {
		const now = new Date();
		console.log(
			`⏭️ Skipping monthly execution for ${now.toISOString()} - not the last day of the month`,
		);
		return NextResponse.json({
			success: true,
			message: "Skipped monthly run - not the last day of the month",
			timestamp: now.toISOString(),
		});
	}

	return handleTradingBotRequest(request, "monthly");
}
