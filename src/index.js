#!/usr/bin/env node

/**
 * DEX Arbitrage Bot for Base Network
 * 
 * Features:
 * - Queries DEX smart contracts directly for fast price data
 * - Supports Uniswap V3 and Aerodrome CL pools
 * - Calculates arbitrage opportunities in real-time
 * - Accounts for gas fees in profitability analysis
 * 
 * Usage:
 *   node src/index.js [pair] [tradeSize]
 * 
 * Examples:
 *   node src/index.js                    # Default: WETH/USDC with 1 ETH trade
 *   node src/index.js WETH/USDbC 2.5     # WETH/USDbC with 2.5 ETH trade
 */

import {
  createProvider,
  fetchPricesMultipleDEXes,
  estimateSwapGasCost
} from "./priceFetcher.js";
import { analyzeArbitrage, formatArbitrageAnalysis } from "./arbitrage.js";
import { BASE_RPC_URL, TOKENS, DEXES, POOLS, ARBITRAGE_CONFIG } from "./config.js";

/**
 * Main function to run the arbitrage analysis
 */
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("        DEX ARBITRAGE BOT - BASE NETWORK (Direct Contract Queries)        ");
  console.log("═══════════════════════════════════════════════════════════════\n");
  
  // Parse command line arguments
  const pair = process.argv[2] || "WETH/USDC";
  const tradeSize = parseFloat(process.argv[3]) || ARBITRAGE_CONFIG.TRADE_SIZE_ETH;
  
  // Display configuration
  console.log("CONFIGURATION:");
  console.log(`  Trading Pair: ${pair}`);
  console.log(`  Trade Size: ${tradeSize} ETH`);
  console.log(`  RPC Endpoint: ${BASE_RPC_URL}`);
  console.log(`  Min Price Diff: ${ARBITRAGE_CONFIG.MIN_PRICE_DIFF_PERCENT}%`);
  console.log("");
  
  // Display tokens info
  console.log("BASE NETWORK TOKENS:");
  for (const [symbol, token] of Object.entries(TOKENS)) {
    console.log(`  ${symbol}: ${token.address} (${token.decimals} decimals)`);
  }
  console.log("");
  
  // Display DEXes info
  console.log("SUPPORTED DEXes:");
  for (const [key, dex] of Object.entries(DEXES)) {
    console.log(`  ${dex.name} (${dex.type})`);
  }
  console.log("");
  
  // Validate pair exists in config
  if (!POOLS[pair]) {
    console.error(`Error: Trading pair "${pair}" not configured.`);
    console.log(`Available pairs: ${Object.keys(POOLS).join(", ")}`);
    process.exit(1);
  }
  
  try {
    // Create provider
    console.log("Connecting to Base network...");
    const provider = createProvider();
    
    // Verify connection
    const network = await provider.getNetwork();
    console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})\n`);
    
    // Fetch prices from multiple DEXes simultaneously
    console.log(`Fetching ${pair} prices from DEXes...`);
    console.log("(Querying smart contracts directly via slot0)\n");
    
    const startTime = Date.now();
    const priceData = await fetchPricesMultipleDEXes(provider, pair);
    const fetchDuration = Date.now() - startTime;
    
    console.log(`Prices fetched in ${fetchDuration}ms\n`);
    
    // Display raw price data
    console.log("RAW PRICE DATA:");
    for (const price of priceData.prices) {
      if (price.error) {
        console.log(`  ${price.dex}: Error - ${price.error}`);
      } else {
        console.log(`  ${price.dex}:`);
        console.log(`    Pool: ${price.poolAddress}`);
        console.log(`    Price (${priceData.token0}/${priceData.token1}): ${price.priceToken0InToken1.toFixed(6)}`);
        console.log(`    Tick: ${price.tick}`);
        console.log(`    Liquidity: ${price.liquidity}`);
      }
    }
    console.log("");
    
    // Estimate gas costs
    console.log("Estimating gas costs...");
    // Use current ETH price from our price data, with a dynamic fallback
    // The fallback is used only if all price fetches failed
    const validPrice = priceData.prices.find(p => !p.error);
    let ethPriceUsd;
    if (validPrice) {
      ethPriceUsd = validPrice.priceToken0InToken1;
    } else {
      // No valid prices - use a conservative estimate and warn user
      console.warn("  Warning: Could not fetch live ETH price, using estimated fallback");
      ethPriceUsd = 2500; // Conservative estimate
    }
    const gasCost = await estimateSwapGasCost(provider, ethPriceUsd);
    
    console.log("GAS ESTIMATION:");
    console.log(`  Gas Price: ${gasCost.gasPriceGwei.toFixed(6)} gwei`);
    console.log(`  Gas Limit: ${gasCost.gasLimit} units`);
    console.log(`  Cost per swap: ${gasCost.gasCostEth.toFixed(8)} ETH ($${gasCost.gasCostUsd.toFixed(6)})`);
    console.log("");
    
    // Analyze arbitrage opportunity
    const analysis = analyzeArbitrage(priceData.prices, tradeSize, gasCost.gasCostUsd);
    
    // Display formatted analysis
    console.log("\n" + formatArbitrageAnalysis(analysis));
    
    // Return results for programmatic use
    return {
      pair,
      priceData,
      gasCost,
      analysis,
      fetchDurationMs: fetchDuration
    };
    
  } catch (error) {
    console.error("Error during arbitrage analysis:");
    console.error(error.message);
    
    if (error.code === "NETWORK_ERROR") {
      console.error("\nNetwork connection failed. Please check:");
      console.error("  - Your internet connection");
      console.error("  - The RPC endpoint availability");
    }
    
    process.exit(1);
  }
}

/**
 * Continuous monitoring mode
 * Runs arbitrage analysis repeatedly at specified interval
 */
async function monitor(intervalMs = 5000) {
  console.log(`Starting continuous monitoring (interval: ${intervalMs}ms)...`);
  console.log("Press Ctrl+C to stop\n");
  
  while (true) {
    try {
      await main();
      console.log(`\nNext check in ${intervalMs / 1000} seconds...\n`);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error("Error in monitoring loop:", error.message);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
}

// Export for programmatic use
export { main, monitor };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check for monitor flag
  const isMonitor = process.argv.includes("--monitor") || process.argv.includes("-m");
  
  if (isMonitor) {
    const intervalArg = process.argv.find(arg => arg.startsWith("--interval="));
    const interval = intervalArg ? parseInt(intervalArg.split("=")[1]) : 5000;
    monitor(interval);
  } else {
    main().then(() => {
      process.exit(0);
    });
  }
}
