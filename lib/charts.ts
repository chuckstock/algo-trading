import QuickChart from 'quickchart-js';
import { TradingSignal } from './trading-strategy';

export interface ChartData {
  ticker: string;
  currentPrice: number;
  sma200: number;
  deviation: number;
  signal: 'buy' | 'sell' | 'hold';
  historicalPrices?: number[];
  historicalDates?: string[];
}

/**
 * Generate a price chart with SMA overlay for a single ticker
 */
export function generatePriceChart(data: ChartData): string {
  const chart = new QuickChart();

  const signalColor =
    data.signal === 'buy' ? '#22c55e' :
    data.signal === 'sell' ? '#ef4444' :
    '#6b7280';

  chart
    .setConfig({
      type: 'line',
      data: {
        labels: data.historicalDates || [],
        datasets: [
          {
            label: 'Price',
            data: data.historicalPrices || [],
            borderColor: signalColor,
            backgroundColor: signalColor + '20',
            fill: false,
            borderWidth: 2,
          },
          {
            label: '200-day SMA',
            data: Array(data.historicalPrices?.length || 0).fill(data.sma200),
            borderColor: '#3b82f6',
            borderDash: [5, 5],
            fill: false,
            borderWidth: 2,
          },
        ],
      },
      options: {
        title: {
          display: true,
          text: `${data.ticker} - ${data.signal} Signal`,
          fontSize: 20,
          fontColor: '#1f2937',
        },
        legend: {
          display: true,
          position: 'bottom',
        },
        scales: {
          yAxes: [{
            ticks: {
              callback: (value: number) => `$${value.toFixed(2)}`,
            },
            scaleLabel: {
              display: true,
              labelString: 'Price (USD)',
            },
          }],
          xAxes: [{
            ticks: {
              maxTicksLimit: 10,
            },
          }],
        },
        annotation: {
          annotations: [{
            type: 'line',
            mode: 'horizontal',
            scaleID: 'y-axis-0',
            value: data.currentPrice,
            borderColor: signalColor,
            borderWidth: 2,
            label: {
              enabled: true,
              content: `Current: $${data.currentPrice.toFixed(2)}`,
            },
          }],
        },
      },
    })
    .setWidth(800)
    .setHeight(400)
    .setBackgroundColor('#ffffff');

  return chart.getUrl();
}

/**
 * Generate a summary chart showing all tickers and their signals
 */
export function generateSummaryChart(analyses: TradingSignal[]): string {
  const chart = new QuickChart();

  const tickers = analyses.map(a => a.symbol);
  const deviations = analyses.map(a => a.deviation * 100); // Convert to percentage
  const colors = analyses.map(a =>
    a.action === 'buy' ? '#22c55e' :
    a.action === 'sell' ? '#ef4444' :
    '#6b7280'
  );

  chart
    .setConfig({
      type: 'bar',
      data: {
        labels: tickers,
        datasets: [{
          label: 'Deviation from 200-day SMA (%)',
          data: deviations,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
        }],
      },
      options: {
        title: {
          display: true,
          text: 'Weekly Market Analysis - All Tickers',
          fontSize: 20,
          fontColor: '#1f2937',
        },
        legend: {
          display: false,
        },
        scales: {
          yAxes: [{
            ticks: {
              callback: (value: number) => `${value.toFixed(1)}%`,
            },
            scaleLabel: {
              display: true,
              labelString: 'Deviation from SMA (%)',
            },
          }],
          xAxes: [{
            scaleLabel: {
              display: true,
              labelString: 'Ticker',
            },
          }],
        },
        annotation: {
          annotations: [
            {
              type: 'line',
              mode: 'horizontal',
              scaleID: 'y-axis-0',
              value: 1,
              borderColor: '#22c55e',
              borderWidth: 2,
              borderDash: [5, 5],
              label: {
                enabled: true,
                content: 'Buy Threshold (+1%)',
                position: 'right',
              },
            },
            {
              type: 'line',
              mode: 'horizontal',
              scaleID: 'y-axis-0',
              value: -1,
              borderColor: '#ef4444',
              borderWidth: 2,
              borderDash: [5, 5],
              label: {
                enabled: true,
                content: 'Sell Threshold (-1%)',
                position: 'right',
              },
            },
          ],
        },
      },
    })
    .setWidth(1000)
    .setHeight(500)
    .setBackgroundColor('#ffffff');

  return chart.getUrl();
}

/**
 * Format analysis results as a text message
 */
export function formatAnalysisMessage(analyses: TradingSignal[]): string {
  const timestamp = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });

  let message = `📊 *Weekly Market Analysis*\n`;
  message += `🕐 ${timestamp} ET\n\n`;

  const buySignals = analyses.filter(a => a.action === 'buy');
  const sellSignals = analyses.filter(a => a.action === 'sell');
  const holdSignals = analyses.filter(a => a.action === 'hold');

  message += `*Summary:*\n`;
  message += `🟢 Buy Signals: ${buySignals.length}\n`;
  message += `🔴 Sell Signals: ${sellSignals.length}\n`;
  message += `⚪️ Hold Signals: ${holdSignals.length}\n\n`;

  if (buySignals.length > 0) {
    message += `*🟢 BUY SIGNALS*\n`;
    buySignals.forEach(a => {
      const deviation = a.deviation * 100;
      message += `• *${a.symbol}*: $${a.currentPrice.toFixed(2)} (${deviation > 0 ? '+' : ''}${deviation.toFixed(2)}% vs SMA)\n`;
    });
    message += `\n`;
  }

  if (sellSignals.length > 0) {
    message += `*🔴 SELL SIGNALS*\n`;
    sellSignals.forEach(a => {
      const deviation = a.deviation * 100;
      message += `• *${a.symbol}*: $${a.currentPrice.toFixed(2)} (${deviation.toFixed(2)}% vs SMA)\n`;
    });
    message += `\n`;
  }

  if (holdSignals.length > 0) {
    message += `*⚪️ HOLD SIGNALS*\n`;
    holdSignals.forEach(a => {
      const deviation = a.deviation * 100;
      message += `• *${a.symbol}*: $${a.currentPrice.toFixed(2)} (${deviation > 0 ? '+' : ''}${deviation.toFixed(2)}% vs SMA)\n`;
    });
    message += `\n`;
  }

  message += `_Strategy: 200-day SMA momentum trading_\n`;
  message += `_Buy threshold: +1% above SMA_\n`;
  message += `_Sell threshold: -1% below SMA_`;

  return message;
}
