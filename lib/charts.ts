import QuickChart from 'quickchart-js';
import { TradingSignal } from './trading-strategy';

export interface ChartData {
  ticker: string;
  currentPrice: number;
  sma: number;
  smaPeriod: number;
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
            label: `${data.smaPeriod}-day SMA`,
            data: Array(data.historicalPrices?.length || 0).fill(data.sma),
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
export function generateSummaryChart(
  analyses: TradingSignal[],
  reportTitle: string = 'Daily Market Analysis'
): string {
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
          label: 'Deviation from SMA (%)',
          data: deviations,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
        }],
      },
      options: {
        title: {
          display: true,
          text: `${reportTitle} - All Tickers`,
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
export function formatAnalysisMessage(
  analyses: TradingSignal[],
  reportTitle: string = 'Daily Market Analysis'
): string {
  const issueDate = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });

  const buySignals = analyses.filter(a => a.action === 'buy');
  const sellSignals = analyses.filter(a => a.action === 'sell');
  const holdSignals = analyses.filter(a => a.action === 'hold');
  const leadAnalysis = [...buySignals, ...sellSignals, ...holdSignals]
    .sort((left, right) => Math.abs(right.deviation) - Math.abs(left.deviation))[0];

  const leadHeadline = leadAnalysis
    ? leadAnalysis.action === 'buy'
      ? `${leadAnalysis.symbol} breaks above trend and leads the tape`
      : leadAnalysis.action === 'sell'
        ? `${leadAnalysis.symbol} slips below trend and weakens the board`
        : `${leadAnalysis.symbol} holds the line near its moving average`
    : 'The market desk awaits fresh copy';

  const formatBrief = (analysis: TradingSignal): string => {
    const deviation = analysis.deviation * 100;
    const direction = deviation > 0 ? 'above' : deviation < 0 ? 'below' : 'near';
    const deviationText =
      direction === 'near'
        ? `${Math.abs(deviation).toFixed(2)}% from trend`
        : `${Math.abs(deviation).toFixed(2)}% ${direction} trend`;

    return [
      `*${analysis.symbol}*`,
      `$${analysis.currentPrice.toFixed(2)} print`,
      `${analysis.smaPeriod}-day SMA at $${analysis.sma.toFixed(2)}`,
      deviationText,
      `${analysis.reason}.`,
    ].join(' | ');
  };

  const formatSection = (
    heading: string,
    analysesForSection: TradingSignal[],
  ): string => {
    if (analysesForSection.length === 0) {
      return '';
    }

    const briefs = analysesForSection
      .map((analysis) => `- ${formatBrief(analysis)}`)
      .join('\n');

    return `*${heading}*\n${briefs}\n\n`;
  };

  let message = `*THE SIGNAL LEDGER*\n`;
  message += `${reportTitle}\n`;
  message += `${issueDate} ET\n\n`;
  message += `*Banner Headline*\n${leadHeadline}\n\n`;
  message += `*Market Breadth*\n`;
  message += `Buys: ${buySignals.length} | Sells: ${sellSignals.length} | Holds: ${holdSignals.length}\n\n`;
  message += formatSection('Above the Fold: Buy Calls', buySignals);
  message += formatSection('On the Wire: Sell Calls', sellSignals);
  message += formatSection('In Brief: Holds', holdSignals);
  message += `_Desk rule: buy above +1% from the configured SMA, sell below -1%, otherwise hold._`;

  return message.trim();
}
