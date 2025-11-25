/**
 * Arbitrage Calculator
 * Calculates arbitrage opportunities between DEXes
 * Includes gas fee considerations for profitability analysis
 */

import { ARBITRAGE_CONFIG, GAS_CONFIG } from "./config.js";

/**
 * Calculates the percentage difference between two prices
 * @param {number} price1 - First price
 * @param {number} price2 - Second price
 * @returns {number} Percentage difference
 */
export function calculatePriceDifference(price1, price2) {
  if (price1 === 0 || price2 === 0) {
    return 0;
  }
  const avgPrice = (price1 + price2) / 2;
  const diff = Math.abs(price1 - price2);
  return (diff / avgPrice) * 100;
}

/**
 * Determines which DEX has the lower price (buy from) and higher price (sell to)
 * @param {Object} priceData1 - Price data from first DEX
 * @param {Object} priceData2 - Price data from second DEX
 * @param {string} baseToken - The base token (e.g., "WETH")
 * @returns {Object} Arbitrage direction information
 */
export function determineArbitrageDirection(priceData1, priceData2, baseToken) {
  // For WETH/USDC: priceToken0InToken1 = how many USDC per WETH
  // Lower price = cheaper to buy
  // Higher price = better to sell
  
  const price1 = priceData1.priceToken0InToken1;
  const price2 = priceData2.priceToken0InToken1;
  
  if (price1 < price2) {
    return {
      buyFrom: priceData1.dex,
      buyPrice: price1,
      sellTo: priceData2.dex,
      sellPrice: price2,
      priceDiffPercent: calculatePriceDifference(price1, price2)
    };
  } else {
    return {
      buyFrom: priceData2.dex,
      buyPrice: price2,
      sellTo: priceData1.dex,
      sellPrice: price1,
      priceDiffPercent: calculatePriceDifference(price1, price2)
    };
  }
}

/**
 * Calculates potential profit from an arbitrage trade
 * @param {number} buyPrice - Price to buy at
 * @param {number} sellPrice - Price to sell at
 * @param {number} tradeAmount - Amount of base token to trade
 * @param {number} slippagePercent - Expected slippage percentage
 * @returns {Object} Profit calculation results
 */
export function calculatePotentialProfit(buyPrice, sellPrice, tradeAmount, slippagePercent = ARBITRAGE_CONFIG.SLIPPAGE_TOLERANCE_PERCENT) {
  // Calculate effective prices after slippage
  const effectiveBuyPrice = buyPrice * (1 + slippagePercent / 100);
  const effectiveSellPrice = sellPrice * (1 - slippagePercent / 100);
  
  // Calculate profit in quote token (e.g., USDC)
  const costToBuy = tradeAmount * effectiveBuyPrice;
  const revenueFromSell = tradeAmount * effectiveSellPrice;
  const grossProfitQuote = revenueFromSell - costToBuy;
  
  // Calculate profit percentage
  const profitPercent = (grossProfitQuote / costToBuy) * 100;
  
  return {
    tradeAmount,
    costToBuy,
    revenueFromSell,
    grossProfitQuote,
    profitPercent,
    effectiveBuyPrice,
    effectiveSellPrice
  };
}

/**
 * Calculates net profit after gas fees
 * @param {number} grossProfitUsd - Gross profit in USD
 * @param {number} gasCostUsd - Total gas cost for both swaps in USD
 * @returns {Object} Net profit calculation
 */
export function calculateNetProfit(grossProfitUsd, gasCostUsd) {
  // Need two swaps: buy on DEX A, sell on DEX B
  const totalGasCost = gasCostUsd * 2;
  const netProfitUsd = grossProfitUsd - totalGasCost;
  const isProfitable = netProfitUsd > GAS_CONFIG.MIN_PROFIT_THRESHOLD_USD;
  
  return {
    grossProfitUsd,
    totalGasCostUsd: totalGasCost,
    netProfitUsd,
    isProfitable,
    profitAfterGasPercent: grossProfitUsd > 0 ? ((netProfitUsd / grossProfitUsd) * 100) : 0
  };
}

/**
 * Performs complete arbitrage analysis
 * @param {Object[]} prices - Array of price data from multiple DEXes
 * @param {number} tradeAmountEth - Amount of ETH to trade
 * @param {number} gasCostUsd - Gas cost per swap in USD
 * @returns {Object} Complete arbitrage analysis
 */
export function analyzeArbitrage(prices, tradeAmountEth, gasCostUsd) {
  // Filter out prices with errors
  const validPrices = prices.filter(p => !p.error && p.priceToken0InToken1);
  
  if (validPrices.length < 2) {
    return {
      hasOpportunity: false,
      reason: "Insufficient valid price data from DEXes",
      validDexCount: validPrices.length
    };
  }
  
  // Find best buy (lowest price) and best sell (highest price)
  let bestBuy = validPrices[0];
  let bestSell = validPrices[0];
  
  for (const price of validPrices) {
    if (price.priceToken0InToken1 < bestBuy.priceToken0InToken1) {
      bestBuy = price;
    }
    if (price.priceToken0InToken1 > bestSell.priceToken0InToken1) {
      bestSell = price;
    }
  }
  
  // If best buy and sell are the same DEX, no arbitrage possible
  if (bestBuy.dex === bestSell.dex) {
    return {
      hasOpportunity: false,
      reason: "Best buy and sell prices are from the same DEX",
      prices: validPrices.map(p => ({ dex: p.dex, price: p.priceToken0InToken1 }))
    };
  }
  
  // Calculate arbitrage details
  const direction = determineArbitrageDirection(bestBuy, bestSell, "WETH");
  const profitCalc = calculatePotentialProfit(
    direction.buyPrice,
    direction.sellPrice,
    tradeAmountEth
  );
  
  // Calculate net profit after gas
  const netProfitCalc = calculateNetProfit(profitCalc.grossProfitQuote, gasCostUsd);
  
  // Determine if opportunity exists
  const hasOpportunity = direction.priceDiffPercent >= ARBITRAGE_CONFIG.MIN_PRICE_DIFF_PERCENT;
  
  return {
    hasOpportunity,
    isProfitableAfterGas: netProfitCalc.isProfitable,
    direction: {
      buyFrom: direction.buyFrom,
      buyPrice: direction.buyPrice,
      sellTo: direction.sellTo,
      sellPrice: direction.sellPrice
    },
    priceDifference: {
      percent: direction.priceDiffPercent,
      meetsThreshold: direction.priceDiffPercent >= ARBITRAGE_CONFIG.MIN_PRICE_DIFF_PERCENT
    },
    profitAnalysis: {
      tradeAmountEth: tradeAmountEth,
      grossProfitUsd: profitCalc.grossProfitQuote,
      gasCostUsd: netProfitCalc.totalGasCostUsd,
      netProfitUsd: netProfitCalc.netProfitUsd,
      profitAfterSlippage: profitCalc.profitPercent
    },
    recommendation: getRecommendation(netProfitCalc, direction.priceDiffPercent),
    allPrices: validPrices.map(p => ({
      dex: p.dex,
      price: p.priceToken0InToken1,
      liquidity: p.liquidity
    })),
    timestamp: new Date().toISOString()
  };
}

/**
 * Generates a human-readable recommendation
 * @param {Object} netProfitCalc - Net profit calculation
 * @param {number} priceDiffPercent - Price difference percentage
 * @returns {string} Recommendation
 */
function getRecommendation(netProfitCalc, priceDiffPercent) {
  if (priceDiffPercent < ARBITRAGE_CONFIG.MIN_PRICE_DIFF_PERCENT) {
    return "NO TRADE - Price difference below minimum threshold";
  }
  
  if (!netProfitCalc.isProfitable) {
    return `NO TRADE - Gas costs ($${netProfitCalc.totalGasCostUsd.toFixed(4)}) exceed potential profit ($${netProfitCalc.grossProfitUsd.toFixed(4)})`;
  }
  
  return `PROFITABLE - Net profit after gas: $${netProfitCalc.netProfitUsd.toFixed(4)}`;
}

/**
 * Formats arbitrage analysis for display
 * @param {Object} analysis - Arbitrage analysis result
 * @returns {string} Formatted output
 */
export function formatArbitrageAnalysis(analysis) {
  const lines = [
    "═══════════════════════════════════════════════════════════════",
    "                    ARBITRAGE ANALYSIS REPORT                   ",
    "═══════════════════════════════════════════════════════════════",
    ""
  ];
  
  if (!analysis.hasOpportunity) {
    lines.push(`Status: NO OPPORTUNITY`);
    lines.push(`Reason: ${analysis.reason}`);
    if (analysis.prices) {
      lines.push(`\nPrices found:`);
      for (const p of analysis.prices) {
        lines.push(`  ${p.dex}: $${p.price.toFixed(6)}`);
      }
    }
    return lines.join("\n");
  }
  
  lines.push(`Status: ${analysis.isProfitableAfterGas ? "✅ PROFITABLE OPPORTUNITY" : "⚠️ OPPORTUNITY EXISTS (not profitable after gas)"}`);
  lines.push("");
  lines.push("PRICE COMPARISON:");
  for (const p of analysis.allPrices) {
    const marker = p.dex === analysis.direction.buyFrom ? " ← BUY" : p.dex === analysis.direction.sellTo ? " ← SELL" : "";
    lines.push(`  ${p.dex}: $${p.price.toFixed(6)}${marker}`);
  }
  lines.push("");
  lines.push("ARBITRAGE DIRECTION:");
  lines.push(`  Buy from:  ${analysis.direction.buyFrom} @ $${analysis.direction.buyPrice.toFixed(6)}`);
  lines.push(`  Sell to:   ${analysis.direction.sellTo} @ $${analysis.direction.sellPrice.toFixed(6)}`);
  lines.push(`  Price Diff: ${analysis.priceDifference.percent.toFixed(4)}%`);
  lines.push("");
  lines.push("PROFIT ANALYSIS:");
  lines.push(`  Trade Size:      ${analysis.profitAnalysis.tradeAmountEth} ETH`);
  lines.push(`  Gross Profit:    $${analysis.profitAnalysis.grossProfitUsd.toFixed(4)}`);
  lines.push(`  Gas Cost (2 swaps): $${analysis.profitAnalysis.gasCostUsd.toFixed(4)}`);
  lines.push(`  Net Profit:      $${analysis.profitAnalysis.netProfitUsd.toFixed(4)}`);
  lines.push("");
  lines.push(`RECOMMENDATION: ${analysis.recommendation}`);
  lines.push("");
  lines.push(`Analyzed at: ${analysis.timestamp}`);
  lines.push("═══════════════════════════════════════════════════════════════");
  
  return lines.join("\n");
}
