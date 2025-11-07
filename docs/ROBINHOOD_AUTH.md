# Robinhood Authentication Guide

## Important Warning

Robinhood does **not** provide an official public API. The authentication implementation in `lib/robinhood.ts` is a placeholder. You'll need to implement one of the following approaches:

## Option 1: Use a Third-Party Library

### npm: `robinhood-api`

```bash
npm install robinhood-api
```

Then update `lib/robinhood.ts` to use the library:

```typescript
import Robinhood from 'robinhood-api';

const robinhood = new Robinhood({
  username: process.env.ROBINHOOD_USERNAME,
  password: process.env.ROBINHOOD_PASSWORD,
});

await robinhood.login();
```

**Note**: Check if this package is actively maintained and compatible with current Robinhood API.

## Option 2: Implement OAuth2 Flow

Robinhood uses OAuth2 for authentication. You'll need to:

1. **Register an application** (if Robinhood allows this)
2. **Implement the OAuth flow**:
   - Authorization code flow
   - Device token generation
   - Token refresh

Example structure:

```typescript
async login() {
  // Step 1: Get device token
  const deviceToken = await this.getDeviceToken();
  
  // Step 2: Request OAuth token
  const tokenResponse = await axios.post('/oauth2/token/', {
    grant_type: 'password',
    client_id: YOUR_CLIENT_ID,
    device_token: deviceToken,
    username: this.username,
    password: this.password,
  });
  
  this.accessToken = tokenResponse.data.access_token;
}
```

## Option 3: Use Python Wrapper

If you prefer Python's `robin_stocks` library, you could:

1. Create a Python microservice that handles Robinhood operations
2. Call it from your Node.js bot via HTTP or gRPC
3. Or use a Node.js wrapper if one exists

## Option 4: Reverse Engineer (Not Recommended)

Some developers reverse-engineer Robinhood's mobile/web API. This approach:
- ⚠️ Violates Terms of Service
- ⚠️ Can break at any time
- ⚠️ May result in account restrictions
- ⚠️ Security risks

## Recommended Approach

1. **Start with DRY_RUN mode** - Test your strategy logic without real trades
2. **Use paper trading** - Robinhood offers paper trading for testing
3. **Consider alternative brokers** with official APIs:
   - Interactive Brokers (IBKR API)
   - TD Ameritrade (now Schwab)
   - Alpaca (designed for algo trading)
   - E*TRADE API

## Testing Without Real Authentication

You can test the SMA calculation and trading logic without Robinhood:

1. Set `DRY_RUN=true` in `.env`
2. Mock the `RobinhoodClient` in tests
3. Verify the strategy logic works correctly

## Resources

- [Robinhood API Documentation](https://docs.robinhood.com/) (unofficial)
- [Alpaca Markets API](https://alpaca.markets/docs/) (official, algo-trading friendly)
- [Interactive Brokers API](https://www.interactivebrokers.com/en/index.php?f=5041)

