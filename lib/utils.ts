import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Utility to retry a promise-based function with exponential backoff and 429 support
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	maxRetries: number = 3,
	baseDelay: number = 2000,
	context: string = "Request",
): Promise<T> {
	let lastError: unknown;

	for (let i = 0; i <= maxRetries; i++) {
		try {
			return await fn();
		} catch (error: unknown) {
			lastError = error;

			const err = error as {
				response?: { status?: number; headers?: Record<string, string> };
				status?: number;
				headers?: Record<string, string>;
				message?: string;
			};

			// Check for 429 Too Many Requests
			const status =
				err.response?.status ||
				err.status ||
				(err.message?.includes("429") ? 429 : null);

			if (i === maxRetries) break;

			if (status === 429) {
				const retryAfter =
					err.response?.headers?.["retry-after"] ||
					err.headers?.["retry-after"];
				let delay = 0;

				if (retryAfter) {
					delay = Number.isNaN(Number(retryAfter))
						? new Date(retryAfter).getTime() - Date.now()
						: Number(retryAfter) * 1000;
				} else {
					delay = baseDelay * 2 ** i;
				}

				// Safety check for negative delay or extremely long delays
				delay = Math.max(1000, Math.min(delay, 60000));

				console.warn(
					`⚠️ ${context} rate limited (429). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`,
				);
				await new Promise((resolve) => setTimeout(resolve, delay));
				continue;
			}

			// For other errors, use exponential backoff
			const delay = baseDelay * 2 ** i;
			console.warn(
				`⚠️ ${context} failed: ${err.message || "Unknown error"}. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`,
			);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError;
}
