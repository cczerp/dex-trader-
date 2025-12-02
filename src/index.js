#!/usr/bin/env node

/**
 * DEX Arbitrage Bot for Base Network
 * 
 * Features:
 * - Queries DEX smart contracts directly for fast price data
 * - Supports Uniswap V3 and Aerodrome CL pools
 * - Calculates arbitrage opportunities in real-time
 * - Accounts for gas fees in profitability analysis
 * - AI-powered error diagnosis and self-improvement recommendations
 * 
 * Usage:
 *   node src/index.js [pair] [tradeSize]
 * 
 * Examples:
 *   node src/index.js                    # Default: WETH/USDC with 1 ETH trade
 *   node src/index.js WETH/USDbC 2.5     # WETH/USDbC with 2.5 ETH trade
 *   node src/index.js --ai-report        # Generate AI optimization report
 */

import {
  createProvider,
  fetchPricesMultipleDEXes,
  estimateSwapGasCost
} from "./priceFetcher.js";
import { analyzeArbitrage, formatArbitrageAnalysis } from "./arbitrage.js";
import { BASE_RPC_URL, TOKENS, DEXES, POOLS, ARBITRAGE_CONFIG } from "./config.js";
import { AIAgent, AI_AGENT_CONFIG } from "./aiAgent.js";
import { SmartErrorHandler } from "./errorHandler.js";

// Initialize AI Agent and Error Handler
const aiAgent = new AIAgent();
const errorHandler = new SmartErrorHandler({ verboseLogging: false });

/**
 * Main function to run the arbitrage analysis
 */
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("        DEX ARBITRAGE BOT - BASE NETWORK (AI-Enhanced)        ");
  console.log("═══════════════════════════════════════════════════════════════\n");
  
  // Check for AI report flag
  if (process.argv.includes("--ai-report")) {
    return generateAIReport();
  }
  
  // Parse command line arguments
  const pair = process.argv[2] || "WETH/USDC";
  const tradeSize = parseFloat(process.argv[3]) || ARBITRAGE_CONFIG.TRADE_SIZE_ETH;
  
  // Display configuration
  console.log("CONFIGURATION:");
  console.log(`  Trading Pair: ${pair}`);
  console.log(`  Trade Size: ${tradeSize} ETH`);
  console.log(`  RPC Endpoint: ${BASE_RPC_URL}`);
  console.log(`  Min Price Diff: ${ARBITRAGE_CONFIG.MIN_PRICE_DIFF_PERCENT}%`);
  console.log(`  AI Agent: ${AI_AGENT_CONFIG.name} v${AI_AGENT_CONFIG.version}`);
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
    
    // Use error handler for price fetching
    const wrappedFetchPrices = errorHandler.wrapAsync(
      async (p) => await fetchPricesMultipleDEXes(p, pair),
      { operation: "price_fetch", pair }
    );
    
    const priceData = await wrappedFetchPrices(provider);
    const fetchDuration = Date.now() - startTime;
    
    console.log(`Prices fetched in ${fetchDuration}ms\n`);
    
    // Display raw price data
    console.log("RAW PRICE DATA:");
    for (const price of priceData.prices) {
      if (price.error) {
        console.log(`  ${price.dex}: Error - ${price.error}`);
        // Let AI analyze the error
        aiAgent.analyzeError(new Error(price.error), { 
          operation: "price_fetch", 
          dex: price.dex 
        });
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
    
    // AI Agent optimization check
    if (!analysis.isProfitableAfterGas && analysis.hasOpportunity) {
      console.log("\n" + "═".repeat(63));
      console.log("              AI AGENT OPTIMIZATION SUGGESTION                  ");
      console.log("═".repeat(63));
      const optimization = aiAgent.optimizeTradingParameters({
        lastTradeProfit: analysis.profitAnalysis?.netProfitUsd || 0,
        gasCost: gasCost.gasCostUsd
      });
      if (optimization.reasoning.length > 0) {
        console.log("\nSuggested parameter adjustments:");
        for (const reason of optimization.reasoning) {
          console.log(`  • ${reason}`);
        }
        console.log("\n⚠️  Authorization required to apply changes.");
      }
      console.log("═".repeat(63));
    }
    
    // Return results for programmatic use
    return {
      pair,
      priceData,
      gasCost,
      analysis,
      fetchDurationMs: fetchDuration,
      aiAgent: {
        diagnostics: aiAgent.diagnosticResults,
        recommendations: aiAgent.recommendations
      }
    };
    
  } catch (error) {
    console.error("Error during arbitrage analysis:");
    console.error(error.message);
    
    // Use AI Agent for comprehensive error analysis
    const diagnosis = aiAgent.analyzeError(error, { operation: "main" });
    console.log("\n" + aiAgent.formatDiagnosis(diagnosis));
    
    if (error.code === "NETWORK_ERROR") {
      console.error("\nNetwork connection failed. Please check:");
      console.error("  - Your internet connection");
      console.error("  - The RPC endpoint availability");
    }
    
    process.exit(1);
  }
}

/**
 * Generate AI optimization report
 */
function generateAIReport() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("              AI AGENT OPTIMIZATION REPORT                      ");
  console.log("═══════════════════════════════════════════════════════════════\n");
  
  const report = aiAgent.generateOptimizationReport();
  
  console.log("AGENT INFO:");
  console.log(`  Name: ${report.agentInfo.name}`);
  console.log(`  Version: ${report.agentInfo.version}`);
  console.log(`  Focus Areas: ${report.agentInfo.focusAreas.join(", ")}`);
  console.log("");
  
  console.log("PERFORMANCE METRICS:");
  console.log(`  Total Analyses: ${report.performanceMetrics.totalAnalyses}`);
  console.log(`  Successful Diagnoses: ${report.performanceMetrics.successfulDiagnoses}`);
  console.log(`  Recommendations Accepted: ${report.performanceMetrics.recommendationsAccepted}`);
  console.log(`  Recommendations Rejected: ${report.performanceMetrics.recommendationsRejected}`);
  console.log("");
  
  console.log("SYSTEM HEALTH:");
  console.log(`  Status: ${report.systemHealth.status.toUpperCase()}`);
  console.log(`  Health Score: ${report.systemHealth.score}/100`);
  console.log(`  Error Rate: ${report.systemHealth.errorRate}`);
  console.log(`  Recommendation: ${report.systemHealth.recommendation}`);
  console.log("");
  
  console.log("ERROR ANALYSIS:");
  console.log(`  Total Errors Recorded: ${report.errorAnalysis.totalErrors}`);
  console.log(`  Network Errors: ${report.errorAnalysis.networkErrors}`);
  console.log(`  Contract Errors: ${report.errorAnalysis.contractErrors}`);
  console.log(`  Price Errors: ${report.errorAnalysis.priceErrors}`);
  console.log(`  Liquidity Errors: ${report.errorAnalysis.liquidityErrors}`);
  console.log(`  Gas Errors: ${report.errorAnalysis.gasErrors}`);
  console.log(`  Slippage Errors: ${report.errorAnalysis.slippageErrors}`);
  console.log("");
  
  if (report.pendingAuthorizations.length > 0) {
    console.log("PENDING AUTHORIZATIONS:");
    for (const auth of report.pendingAuthorizations) {
      console.log(`  [${auth.id}] ${auth.description}`);
      console.log(`    File: ${auth.file}`);
      console.log(`    Type: ${auth.changeType}`);
    }
    console.log("");
  }
  
  console.log("═══════════════════════════════════════════════════════════════");
  
  return report;
}

/**
 * Continuous monitoring mode with AI enhancement
 * Runs arbitrage analysis repeatedly at specified interval
 */
async function monitor(intervalMs = 5000) {
  console.log(`Starting continuous monitoring (interval: ${intervalMs}ms)...`);
  console.log(`AI Agent: ${AI_AGENT_CONFIG.name} v${AI_AGENT_CONFIG.version}`);
  console.log("Press Ctrl+C to stop\n");
  
  let cycleCount = 0;
  
  while (true) {
    cycleCount++;
    try {
      await main();
      console.log(`\nNext check in ${intervalMs / 1000} seconds... (cycle ${cycleCount})\n`);
      
      // Periodically output AI optimization suggestions (every 10 cycles)
      if (cycleCount % 10 === 0) {
        const optimization = aiAgent.optimizeTradingParameters();
        if (optimization.reasoning.length > 0) {
          console.log("══════════════════════════════════════════════════════════════");
          console.log("         PERIODIC AI OPTIMIZATION CHECK (cycle " + cycleCount + ")");
          console.log("══════════════════════════════════════════════════════════════");
          for (const reason of optimization.reasoning) {
            console.log(`  • ${reason}`);
          }
          console.log("══════════════════════════════════════════════════════════════\n");
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error("Error in monitoring loop:", error.message);
      
      // Use AI to diagnose monitoring errors
      const diagnosis = aiAgent.analyzeError(error, { operation: "monitor", cycle: cycleCount });
      if (diagnosis.severity >= 4) {
        console.log("\n[AI AGENT] High severity error detected. Diagnosis:");
        console.log(`  Category: ${diagnosis.category}`);
        console.log(`  Root Cause: ${diagnosis.rootCause.cause}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
}

// Export for programmatic use
export { main, monitor, generateAIReport, aiAgent, errorHandler };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check for AI report flag first
  if (process.argv.includes("--ai-report")) {
    generateAIReport();
    process.exit(0);
  }
  
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
