import axios, { type AxiosInstance } from "axios";
import crypto from "crypto";

export interface RobinhoodCredentials {
	username: string;
	password: string;
	mfaCode?: string;
}

export interface OrderParams {
	symbol: string;
	quantity: number;
	side: "buy" | "sell";
	orderType?: "market" | "limit";
	limitPrice?: number;
}

export class RobinhoodClient {
	private client: AxiosInstance;
	private accessToken: string | null = null;
	private refreshToken: string | null = null;
	private deviceToken: string | null = null;
	private baseUrl = "https://api.robinhood.com";

	constructor() {
		this.client = axios.create({
			baseURL: this.baseUrl,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	/**
	 * Generate a device token for authentication
	 * Based on Robinhood's OAuth2 authentication flow
	 * See: https://docs.robinhood.com/crypto/trading/#section/Authentication
	 */
	private async generateDeviceToken(): Promise<string> {
		try {
			// Generate a unique device ID
			const deviceId = crypto.randomUUID();

			const response = await this.client.post("/oauth2/device/", {
				client_id:
					process.env.ROBINHOOD_CLIENT_ID ||
					"c82SH0WZOsabOXGP2sxqcj34FxkvfnWRZBKlBjFS",
				device_token: deviceId,
			});

			this.deviceToken = response.data.device_token || deviceId;
			return this.deviceToken || deviceId;
		} catch (error: unknown) {
			// If device token generation fails, use a fallback UUID
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			console.warn(
				"Device token generation failed, using fallback:",
				errorMessage,
			);
			const fallbackToken = crypto.randomUUID();
			this.deviceToken = fallbackToken;
			return fallbackToken;
		}
	}

	/**
	 * Authenticate with Robinhood using OAuth2
	 * Implements the authentication flow as per:
	 * https://docs.robinhood.com/crypto/trading/#section/Authentication
	 */
	async login(credentials: RobinhoodCredentials): Promise<void> {
		try {
			// Step 1: Generate device token
			const deviceToken = await this.generateDeviceToken();

			// Step 2: Request OAuth2 token
			const tokenData: Record<string, string> = {
				grant_type: "password",
				client_id:
					process.env.ROBINHOOD_CLIENT_ID ||
					"c82SH0WZOsabOXGP2sxqcj34FxkvfnWRZBKlBjFS",
				device_token: deviceToken,
				username: credentials.username,
				password: credentials.password,
			};

			// Add MFA code if provided
			if (credentials.mfaCode) {
				tokenData.mfa_code = credentials.mfaCode;
			}

			const response = await this.client.post("/oauth2/token/", tokenData, {
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
			});

			this.accessToken = response.data.access_token;
			this.refreshToken = response.data.refresh_token;

			if (!this.accessToken) {
				throw new Error("No access token received from Robinhood");
			}

			// Set authorization header for subsequent requests
			this.client.defaults.headers.common["Authorization"] =
				`Bearer ${this.accessToken}`;
		} catch (error: unknown) {
			const axiosError = error as {
				response?: { data?: unknown; status?: number };
				message?: string;
			};
			const errorMessage = axiosError.message || "Unknown error";
			console.error(
				"Robinhood login failed:",
				axiosError.response?.data || errorMessage,
			);

			// Handle specific error cases
			if (axiosError.response?.status === 400) {
				throw new Error("Invalid credentials or missing MFA code");
			} else if (axiosError.response?.status === 401) {
				throw new Error("Authentication failed - check your credentials");
			}

			throw new Error(`Failed to authenticate with Robinhood: ${errorMessage}`);
		}
	}

	/**
	 * Refresh the access token using refresh token
	 */
	async refreshAccessToken(): Promise<void> {
		if (!this.refreshToken) {
			throw new Error("No refresh token available");
		}

		try {
			const response = await this.client.post("/oauth2/token/", {
				grant_type: "refresh_token",
				refresh_token: this.refreshToken,
				client_id:
					process.env.ROBINHOOD_CLIENT_ID ||
					"c82SH0WZOsabOXGP2sxqcj34FxkvfnWRZBKlBjFS",
			});

			this.accessToken = response.data.access_token;
			this.refreshToken = response.data.refresh_token || this.refreshToken;

			this.client.defaults.headers.common["Authorization"] =
				`Bearer ${this.accessToken}`;
		} catch (error) {
			console.error("Token refresh failed:", error);
			throw new Error("Failed to refresh access token");
		}
	}

	/**
	 * Get current quote for a symbol
	 */
	async getQuote(symbol: string): Promise<number> {
		try {
			const response = await this.client.get(`/quotes/${symbol}/`);
			return parseFloat(response.data.last_trade_price);
		} catch (error) {
			console.error(`Failed to get quote for ${symbol}:`, error);
			throw error;
		}
	}

	/**
	 * Place a buy order
	 */
	async buyOrder(params: OrderParams): Promise<void> {
		try {
			// First, get the instrument ID for the symbol
			const instrumentResponse = await this.client.get(`/instruments/`, {
				params: { symbol: params.symbol },
			});

			const instrumentId = instrumentResponse.data.results[0]?.id;
			if (!instrumentId) {
				throw new Error(`Instrument not found for symbol: ${params.symbol}`);
			}

			// Get account info
			const accountResponse = await this.client.get("/accounts/");
			const accountId = accountResponse.data.results[0]?.account_number;
			if (!accountId) {
				throw new Error("Account not found");
			}

			// Place the order
			const orderData: Record<string, string | number> = {
				account: accountId,
				instrument: instrumentId,
				symbol: params.symbol,
				type: params.orderType || "market",
				time_in_force: "gfd",
				trigger: "immediate",
				quantity: params.quantity,
				side: "buy",
			};

			if (params.orderType === "limit" && params.limitPrice) {
				orderData.price = params.limitPrice;
			}

			await this.client.post("/orders/", orderData);
			console.log(
				`✅ Buy order placed: ${params.quantity} shares of ${params.symbol}`,
			);
		} catch (error) {
			console.error(`Failed to place buy order for ${params.symbol}:`, error);
			throw error;
		}
	}

	/**
	 * Place a sell order
	 */
	async sellOrder(params: OrderParams): Promise<void> {
		try {
			// First, get the instrument ID for the symbol
			const instrumentResponse = await this.client.get(`/instruments/`, {
				params: { symbol: params.symbol },
			});

			const instrumentId = instrumentResponse.data.results[0]?.id;
			if (!instrumentId) {
				throw new Error(`Instrument not found for symbol: ${params.symbol}`);
			}

			// Get account info
			const accountResponse = await this.client.get("/accounts/");
			const accountId = accountResponse.data.results[0]?.account_number;
			if (!accountId) {
				throw new Error("Account not found");
			}

			// Place the order
			const orderData: Record<string, string | number> = {
				account: accountId,
				instrument: instrumentId,
				symbol: params.symbol,
				type: params.orderType || "market",
				time_in_force: "gfd",
				trigger: "immediate",
				quantity: params.quantity,
				side: "sell",
			};

			if (params.orderType === "limit" && params.limitPrice) {
				orderData.price = params.limitPrice;
			}

			await this.client.post("/orders/", orderData);
			console.log(
				`✅ Sell order placed: ${params.quantity} shares of ${params.symbol}`,
			);
		} catch (error) {
			console.error(`Failed to place sell order for ${params.symbol}:`, error);
			throw error;
		}
	}

	/**
	 * Get current positions
	 */
	async getPositions(): Promise<Array<{ symbol: string; quantity: number }>> {
		try {
			interface Position {
				instrument: string;
				quantity: string;
			}
			interface PositionResponse {
				results: Position[];
			}
			const response = await this.client.get<PositionResponse>("/positions/");
			return response.data.results.map((pos: Position) => ({
				symbol: pos.instrument.split("/").pop() || "",
				quantity: parseFloat(pos.quantity),
			}));
		} catch (error) {
			console.error("Failed to get positions:", error);
			throw error;
		}
	}
}
