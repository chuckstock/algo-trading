#!/usr/bin/env node

/**
 * Standalone script for running the trading bot locally
 * For production, use the Vercel API route at /api/trading-bot
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { RobinhoodClient } from '../lib/robinhood';
import { executeTradingStrategy } from '../lib/trading-strategy';

interface TickerConfig {
  tickers: string[];
}

/**
 * Load ticker configuration
 */
function loadTickers(): string[] {
  try {
    const configPath = join(process.cwd(), 'config', 'tickers.json');
    const config: TickerConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    return config.tickers;
  } catch (error) {
    console.error('Failed to load ticker config:', error);
    throw error;
  }
}

/**
 * Main trading bot execution
 */
async function runTradingBot() {
  console.log('\n🤖 Starting Trading Bot...');
  console.log(`⏰ Execution time: ${new Date().toISOString()}\n`);

  // Validate environment variables
  if (!process.env.ROBINHOOD_USERNAME || !process.env.ROBINHOOD_PASSWORD) {
    throw new Error('ROBINHOOD_USERNAME and ROBINHOOD_PASSWORD must be set in .env file');
  }

  // Load tickers
  const tickers = loadTickers();
  console.log(`📋 Monitoring ${tickers.length} tickers: ${tickers.join(', ')}\n`);

  // Initialize Robinhood client
  const robinhoodClient = new RobinhoodClient();

  // Login to Robinhood
  console.log('🔐 Authenticating with Robinhood...');
  try {
    await robinhoodClient.login({
      username: process.env.ROBINHOOD_USERNAME,
      password: process.env.ROBINHOOD_PASSWORD,
      mfaCode: process.env.ROBINHOOD_MFA_CODE,
    });
    console.log('✅ Authentication successful\n');
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    throw error;
  }

  // Execute trading strategy
  const dryRun = process.env.DRY_RUN === 'true';
  await executeTradingStrategy(tickers, robinhoodClient, dryRun);
}

// Main execution
if (require.main === module) {
  runTradingBot()
    .then(() => {
      console.log('✅ Bot execution complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Bot execution failed:', error);
      process.exit(1);
    });
}

export { runTradingBot };

