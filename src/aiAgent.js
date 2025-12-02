/**
 * AI Agent for DEX Trading Bot
 * 
 * A self-diagnosing and self-improving system focused on:
 * - Analyzing and diagnosing trading errors
 * - Recommending code improvements for better trading efficiency
 * - Requiring authorization for any code changes
 * - Optimizing DEX swap logic
 * 
 * The AI Agent focuses ONLY on coding logic and DEX swapping logic.
 * It does not handle general conversations or non-trading topics.
 */

import { ARBITRAGE_CONFIG, GAS_CONFIG, TOKENS, DEXES, POOLS } from "./config.js";

/**
 * AI Agent Configuration
 * Basic parameters with ability to be modified through recommendations
 */
export const AI_AGENT_CONFIG = {
  // Core AI settings
  name: "DEX Trading AI Agent",
  version: "1.0.0",
  
  // Focus areas - the AI only thinks about these topics
  focusAreas: [
    "dex_swap_logic",
    "arbitrage_calculations",
    "price_fetching",
    "gas_optimization",
    "error_handling",
    "slippage_management",
    "liquidity_analysis"
  ],
  
  // Learning parameters
  learningEnabled: true,
  errorHistoryLimit: 100,
  
  // Authorization requirements
  requireAuthForChanges: true,
  authorizedActions: ["recommend", "analyze", "diagnose"],
  restrictedActions: ["execute_trade", "modify_config", "deploy_contract"],
  
  // Trading optimization thresholds
  optimizationThresholds: {
    minProfitImprovement: 0.5, // Minimum % improvement to recommend
    maxGasIncrease: 10, // Maximum % gas increase acceptable
    minSuccessRateImprovement: 1 // Minimum % success rate improvement
  }
};

/**
 * Error categories the AI can diagnose
 */
export const ERROR_CATEGORIES = {
  NETWORK: "network_error",
  CONTRACT: "contract_error",
  PRICE: "price_error",
  LIQUIDITY: "liquidity_error",
  GAS: "gas_error",
  SLIPPAGE: "slippage_error",
  CONFIG: "configuration_error",
  LOGIC: "logic_error",
  UNKNOWN: "unknown_error"
};

/**
 * AI Agent class - The brain of the self-diagnosing system
 * 
 * This class provides intelligent error diagnosis, code improvement recommendations,
 * and trading parameter optimization for the DEX trading bot.
 * 
 * Key Features:
 * - Error categorization into 8 distinct categories (network, contract, price, etc.)
 * - Root cause analysis with detailed reasoning
 * - Code change recommendations with implementation suggestions
 * - Trading parameter optimization based on error patterns
 * - Authorization workflow for all code changes
 * 
 * Usage:
 * ```javascript
 * const agent = new AIAgent();
 * 
 * // Analyze an error
 * const diagnosis = agent.analyzeError(error, { operation: 'price_fetch' });
 * console.log(agent.formatDiagnosis(diagnosis));
 * 
 * // Get optimization recommendations
 * const optimization = agent.optimizeTradingParameters();
 * 
 * // Generate comprehensive report
 * const report = agent.generateOptimizationReport();
 * ```
 * 
 * Authorization Workflow:
 * 1. Agent generates code change recommendations
 * 2. Changes are queued in pendingChanges
 * 3. User calls requestAuthorization() with callback
 * 4. Callback approves/rejects the change
 * 5. Approved changes tracked in authorizedChanges
 */
export class AIAgent {
  constructor(config = AI_AGENT_CONFIG) {
    this.config = { ...AI_AGENT_CONFIG, ...config };
    this.errorHistory = [];
    this.recommendations = [];
    this.pendingChanges = [];
    this.authorizedChanges = [];
    this.diagnosticResults = [];
    this.performanceMetrics = {
      totalAnalyses: 0,
      successfulDiagnoses: 0,
      recommendationsAccepted: 0,
      recommendationsRejected: 0
    };
  }

  /**
   * Analyze an error and provide diagnosis
   * @param {Error} error - The error to analyze
   * @param {Object} context - Additional context about the error
   * @returns {Object} Diagnosis with recommended fixes
   */
  analyzeError(error, context = {}) {
    this.performanceMetrics.totalAnalyses++;
    
    const diagnosis = {
      timestamp: new Date().toISOString(),
      errorMessage: error.message || String(error),
      errorCode: error.code || null,
      category: this._categorizeError(error, context),
      severity: this._assessSeverity(error, context),
      rootCause: null,
      recommendations: [],
      codeChanges: [],
      requiresAuth: this.config.requireAuthForChanges
    };

    // Perform root cause analysis
    diagnosis.rootCause = this._findRootCause(error, context, diagnosis.category);
    
    // Generate recommendations based on diagnosis
    diagnosis.recommendations = this._generateRecommendations(diagnosis, context);
    
    // Generate code change suggestions
    diagnosis.codeChanges = this._generateCodeChanges(diagnosis, context);

    // Store in error history
    this._recordError(diagnosis);
    
    this.performanceMetrics.successfulDiagnoses++;
    this.diagnosticResults.push(diagnosis);

    return diagnosis;
  }

  /**
   * Categorize an error into one of the known categories
   * @private
   */
  _categorizeError(error, context) {
    const message = (error.message || "").toLowerCase();
    const code = error.code || "";

    // Network errors
    if (code === "NETWORK_ERROR" || message.includes("network") || 
        message.includes("timeout") || message.includes("connection")) {
      return ERROR_CATEGORIES.NETWORK;
    }

    // Contract errors
    if (message.includes("contract") || message.includes("revert") ||
        message.includes("execution reverted") || code === "CALL_EXCEPTION") {
      return ERROR_CATEGORIES.CONTRACT;
    }

    // Price errors
    if (message.includes("price") || message.includes("sqrtprice") ||
        message.includes("slot0") || context.operation === "price_fetch") {
      return ERROR_CATEGORIES.PRICE;
    }

    // Liquidity errors
    if (message.includes("liquidity") || message.includes("insufficient")) {
      return ERROR_CATEGORIES.LIQUIDITY;
    }

    // Gas errors
    if (message.includes("gas") || message.includes("fee") ||
        code === "INSUFFICIENT_FUNDS") {
      return ERROR_CATEGORIES.GAS;
    }

    // Slippage errors
    if (message.includes("slippage") || message.includes("price impact") ||
        message.includes("too much")) {
      return ERROR_CATEGORIES.SLIPPAGE;
    }

    // Configuration errors
    if (message.includes("config") || message.includes("invalid address") ||
        message.includes("unknown pair")) {
      return ERROR_CATEGORIES.CONFIG;
    }

    // Logic errors
    if (message.includes("cannot read") || message.includes("undefined") ||
        message.includes("null") || message.includes("nan")) {
      return ERROR_CATEGORIES.LOGIC;
    }

    return ERROR_CATEGORIES.UNKNOWN;
  }

  /**
   * Assess the severity of an error (1-5, 5 being most severe)
   * @private
   */
  _assessSeverity(error, context) {
    const category = this._categorizeError(error, context);
    
    const severityMap = {
      [ERROR_CATEGORIES.NETWORK]: 3,
      [ERROR_CATEGORIES.CONTRACT]: 4,
      [ERROR_CATEGORIES.PRICE]: 3,
      [ERROR_CATEGORIES.LIQUIDITY]: 4,
      [ERROR_CATEGORIES.GAS]: 3,
      [ERROR_CATEGORIES.SLIPPAGE]: 2,
      [ERROR_CATEGORIES.CONFIG]: 5,
      [ERROR_CATEGORIES.LOGIC]: 5,
      [ERROR_CATEGORIES.UNKNOWN]: 3
    };

    return severityMap[category] || 3;
  }

  /**
   * Find the root cause of an error
   * @private
   */
  _findRootCause(error, context, category) {
    const rootCauses = {
      [ERROR_CATEGORIES.NETWORK]: {
        cause: "Network connectivity or RPC endpoint issue",
        details: "The connection to the blockchain RPC endpoint failed or timed out",
        possibleReasons: [
          "RPC endpoint is down or overloaded",
          "Network latency is too high",
          "Rate limiting from the RPC provider",
          "Internet connectivity issues"
        ]
      },
      [ERROR_CATEGORIES.CONTRACT]: {
        cause: "Smart contract execution failure",
        details: "The smart contract call failed during execution",
        possibleReasons: [
          "Contract address is incorrect",
          "ABI mismatch with actual contract",
          "Contract state has changed",
          "Insufficient permissions or allowances"
        ]
      },
      [ERROR_CATEGORIES.PRICE]: {
        cause: "Price data retrieval or calculation error",
        details: "Failed to fetch or calculate accurate price data",
        possibleReasons: [
          "Pool address is incorrect or pool doesn't exist",
          "sqrtPriceX96 value is invalid or zero",
          "Decimal calculations are incorrect",
          "Pool has no liquidity"
        ]
      },
      [ERROR_CATEGORIES.LIQUIDITY]: {
        cause: "Insufficient liquidity in pool",
        details: "The trading pool lacks sufficient liquidity for the trade",
        possibleReasons: [
          "Trade size exceeds available liquidity",
          "Pool is new with minimal deposits",
          "Liquidity has been withdrawn",
          "Price range has no active positions"
        ]
      },
      [ERROR_CATEGORIES.GAS]: {
        cause: "Gas estimation or payment failure",
        details: "Transaction gas requirements could not be met",
        possibleReasons: [
          "Gas price spiked during execution",
          "Gas limit too low for operation",
          "Wallet has insufficient ETH for gas",
          "Network congestion causing high fees"
        ]
      },
      [ERROR_CATEGORIES.SLIPPAGE]: {
        cause: "Price slippage exceeded tolerance",
        details: "The actual execution price deviated too much from expected",
        possibleReasons: [
          "Trade size too large for pool depth",
          "Other trades executed during transaction",
          "Slippage tolerance set too tight",
          "Price manipulation or sandwich attack"
        ]
      },
      [ERROR_CATEGORIES.CONFIG]: {
        cause: "Configuration parameter error",
        details: "One or more configuration parameters are invalid",
        possibleReasons: [
          "Token address is incorrect",
          "Pool address doesn't exist",
          "DEX configuration mismatch",
          "Network configuration wrong"
        ]
      },
      [ERROR_CATEGORIES.LOGIC]: {
        cause: "Code logic or data handling error",
        details: "The code encountered an unexpected data state",
        possibleReasons: [
          "Null or undefined value not handled",
          "Array index out of bounds",
          "Type mismatch in calculations",
          "Async operation not awaited properly"
        ]
      },
      [ERROR_CATEGORIES.UNKNOWN]: {
        cause: "Unidentified error",
        details: "The error does not match known patterns",
        possibleReasons: [
          "New type of error not yet categorized",
          "External dependency failure",
          "Unexpected edge case",
          "Environment-specific issue"
        ]
      }
    };

    return rootCauses[category] || rootCauses[ERROR_CATEGORIES.UNKNOWN];
  }

  /**
   * Generate recommendations based on diagnosis
   * @private
   */
  _generateRecommendations(diagnosis, context) {
    const recommendations = [];

    switch (diagnosis.category) {
      case ERROR_CATEGORIES.NETWORK:
        recommendations.push({
          priority: "high",
          action: "Switch to backup RPC endpoint",
          reasoning: "Primary RPC may be experiencing issues",
          implementation: "Use ALTERNATIVE_RPC_URLS from config",
          expectedImprovement: "Network reliability +50%"
        });
        recommendations.push({
          priority: "medium",
          action: "Implement exponential backoff retry",
          reasoning: "Temporary network issues may resolve with retries",
          implementation: "Add retry logic with increasing delays",
          expectedImprovement: "Success rate +30%"
        });
        break;

      case ERROR_CATEGORIES.CONTRACT:
        recommendations.push({
          priority: "high",
          action: "Verify contract address and ABI",
          reasoning: "Contract interaction failed",
          implementation: "Cross-check pool address with DEX documentation",
          expectedImprovement: "Eliminates contract errors"
        });
        recommendations.push({
          priority: "medium",
          action: "Add contract existence validation",
          reasoning: "Validate contract before interaction",
          implementation: "Check code exists at address before calls",
          expectedImprovement: "Prevents invalid contract calls"
        });
        break;

      case ERROR_CATEGORIES.PRICE:
        recommendations.push({
          priority: "high",
          action: "Add sqrtPriceX96 validation",
          reasoning: "Invalid price data causes calculation errors",
          implementation: "Validate sqrtPriceX96 > 0 before calculations",
          expectedImprovement: "Price calculation reliability +95%"
        });
        recommendations.push({
          priority: "medium",
          action: "Implement price sanity checks",
          reasoning: "Detect anomalous prices before use",
          implementation: "Compare against historical price range",
          expectedImprovement: "Prevents bad trade decisions"
        });
        break;

      case ERROR_CATEGORIES.LIQUIDITY:
        recommendations.push({
          priority: "high",
          action: "Check liquidity before trade analysis",
          reasoning: "Low liquidity pools are unsuitable for large trades",
          implementation: "Add minimum liquidity threshold check",
          expectedImprovement: "Trade success rate +40%"
        });
        recommendations.push({
          priority: "medium",
          action: "Implement dynamic trade sizing",
          reasoning: "Adjust trade size based on available liquidity",
          implementation: "Scale trade amount to pool depth",
          expectedImprovement: "Slippage reduction -60%"
        });
        break;

      case ERROR_CATEGORIES.GAS:
        recommendations.push({
          priority: "high",
          action: "Implement dynamic gas pricing",
          reasoning: "Static gas settings may be outdated",
          implementation: "Fetch real-time gas prices before execution",
          expectedImprovement: "Gas cost optimization +20%"
        });
        recommendations.push({
          priority: "medium",
          action: "Add gas buffer margin",
          reasoning: "Gas estimates can be inaccurate",
          implementation: "Increase gas limit by 20% safety margin",
          expectedImprovement: "Transaction success rate +15%"
        });
        break;

      case ERROR_CATEGORIES.SLIPPAGE:
        recommendations.push({
          priority: "high",
          action: "Adjust slippage tolerance dynamically",
          reasoning: "Fixed slippage may not suit all market conditions",
          implementation: "Calculate slippage based on trade size and liquidity",
          expectedImprovement: "Trade execution rate +25%"
        });
        recommendations.push({
          priority: "medium",
          action: "Implement trade splitting",
          reasoning: "Large trades cause more slippage",
          implementation: "Split large trades into smaller chunks",
          expectedImprovement: "Slippage cost reduction -40%"
        });
        break;

      case ERROR_CATEGORIES.CONFIG:
        recommendations.push({
          priority: "critical",
          action: "Validate all configuration on startup",
          reasoning: "Invalid config causes runtime failures",
          implementation: "Add config validation module with address checksums",
          expectedImprovement: "Eliminates config-related crashes"
        });
        break;

      case ERROR_CATEGORIES.LOGIC:
        recommendations.push({
          priority: "critical",
          action: "Add comprehensive null/undefined checks",
          reasoning: "Unhandled null values cause crashes",
          implementation: "Add defensive programming patterns",
          expectedImprovement: "Runtime stability +80%"
        });
        recommendations.push({
          priority: "high",
          action: "Implement input validation",
          reasoning: "Invalid inputs should fail fast",
          implementation: "Validate all function parameters at entry",
          expectedImprovement: "Error detection +50%"
        });
        break;

      default:
        recommendations.push({
          priority: "medium",
          action: "Add detailed error logging",
          reasoning: "Unknown errors need more context",
          implementation: "Log full error stack and context",
          expectedImprovement: "Debugging efficiency +100%"
        });
    }

    return recommendations;
  }

  /**
   * Generate specific code change suggestions
   * @private
   */
  _generateCodeChanges(diagnosis, context) {
    const changes = [];

    // Generate code changes based on the error category
    switch (diagnosis.category) {
      case ERROR_CATEGORIES.NETWORK:
        changes.push({
          file: "src/priceFetcher.js",
          description: "Add retry logic with fallback RPC endpoints",
          changeType: "enhancement",
          code: `
// Suggested addition: Retry wrapper with fallback
async function fetchWithRetry(fetchFn, maxRetries = 3, providers = []) {
  if (!providers || providers.length === 0) {
    throw new Error('No providers available for retry');
  }
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchFn(providers[i % providers.length]);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}`,
          requiresAuth: true
        });
        break;

      case ERROR_CATEGORIES.PRICE:
        changes.push({
          file: "src/priceFetcher.js",
          description: "Add price sanity validation",
          changeType: "enhancement",
          code: `
// Suggested addition: Price validation
function validatePrice(price, expectedRange = { min: 100, max: 100000 }) {
  if (price <= 0 || isNaN(price) || !isFinite(price)) {
    throw new Error('Invalid price: must be positive finite number');
  }
  if (price < expectedRange.min || price > expectedRange.max) {
    console.warn('Price outside expected range:', price);
  }
  return price;
}`,
          requiresAuth: true
        });
        break;

      case ERROR_CATEGORIES.LIQUIDITY:
        changes.push({
          file: "src/arbitrage.js",
          description: "Add liquidity check before analysis",
          changeType: "enhancement",
          code: `
// Suggested addition: Liquidity adequacy check
// Trade amount is in ETH, liquidity is pool's total liquidity
// A good rule of thumb: trade should be < 1% of pool liquidity
function hasAdequateLiquidity(priceData, tradeAmountEth, ethPriceUsd = 3000) {
  const liquidity = BigInt(priceData.liquidity || '0');
  const tradeValueUsd = tradeAmountEth * ethPriceUsd;
  // Estimate: if trade value > 1% of liquidity value, may cause high slippage
  const liquidityValue = Number(liquidity) / 1e12; // Rough USD estimate
  const tradeToLiquidityRatio = tradeValueUsd / (liquidityValue || 1);
  return tradeToLiquidityRatio < 0.01; // Trade < 1% of pool liquidity
}`,
          requiresAuth: true
        });
        break;

      case ERROR_CATEGORIES.SLIPPAGE:
        changes.push({
          file: "src/config.js",
          description: "Make slippage tolerance dynamic",
          changeType: "modification",
          code: `
// Suggested modification: Dynamic slippage calculation
export function calculateDynamicSlippage(tradeSize, liquidity) {
  const baseSlippage = ARBITRAGE_CONFIG.SLIPPAGE_TOLERANCE_PERCENT;
  const sizeImpact = (tradeSize / Number(liquidity)) * 100;
  return Math.min(baseSlippage + sizeImpact, 3.0); // Cap at 3%
}`,
          requiresAuth: true
        });
        break;

      case ERROR_CATEGORIES.GAS:
        changes.push({
          file: "src/priceFetcher.js",
          description: "Add gas price monitoring and optimization",
          changeType: "enhancement",
          code: `
// Suggested addition: Smart gas pricing
async function getOptimalGasPrice(provider) {
  const feeData = await provider.getFeeData();
  const baseFee = feeData.gasPrice || 0n;
  const priorityFee = feeData.maxPriorityFeePerGas || 0n;
  
  // Use 120% of base fee for faster inclusion
  return {
    maxFeePerGas: baseFee * 120n / 100n + priorityFee,
    maxPriorityFeePerGas: priorityFee
  };
}`,
          requiresAuth: true
        });
        break;
    }

    return changes;
  }

  /**
   * Record error to history for learning
   * @private
   */
  _recordError(diagnosis) {
    this.errorHistory.push({
      timestamp: diagnosis.timestamp,
      category: diagnosis.category,
      severity: diagnosis.severity,
      resolved: false
    });

    // Maintain history limit
    if (this.errorHistory.length > this.config.errorHistoryLimit) {
      this.errorHistory.shift();
    }
  }

  /**
   * Request authorization for a code change
   * @param {Object} change - The proposed change
   * @param {Function} authCallback - Callback to request user authorization
   * @returns {Promise<Object>} Authorization result
   */
  async requestAuthorization(change, authCallback) {
    if (!this.config.requireAuthForChanges) {
      return { authorized: true, reason: "Auto-approved (auth disabled)" };
    }

    const authRequest = {
      id: `AUTH_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      changeType: change.changeType,
      file: change.file,
      description: change.description,
      impactAssessment: this._assessChangeImpact(change),
      requiresReview: true
    };

    this.pendingChanges.push(authRequest);

    // If callback provided, request authorization
    if (typeof authCallback === "function") {
      const result = await authCallback(authRequest);
      
      if (result.authorized) {
        this.authorizedChanges.push(authRequest);
        this.performanceMetrics.recommendationsAccepted++;
      } else {
        this.performanceMetrics.recommendationsRejected++;
      }
      
      return result;
    }

    // Return pending status if no callback
    return {
      authorized: false,
      pending: true,
      authRequestId: authRequest.id,
      message: "Authorization pending - please review and approve"
    };
  }

  /**
   * Assess the impact of a proposed change
   * @private
   */
  _assessChangeImpact(change) {
    return {
      riskLevel: change.changeType === "modification" ? "medium" : "low",
      affectedComponents: [change.file],
      testingRequired: true,
      rollbackPossible: true,
      estimatedEffort: "low"
    };
  }

  /**
   * Optimize trading parameters based on historical performance
   * @param {Object} performanceData - Historical trading performance
   * @returns {Object} Optimized parameters with recommendations
   */
  optimizeTradingParameters(performanceData = {}) {
    const currentConfig = { ...ARBITRAGE_CONFIG };
    const optimizations = {
      timestamp: new Date().toISOString(),
      currentParams: currentConfig,
      recommendedParams: {},
      reasoning: [],
      expectedImprovement: {}
    };

    // Analyze error patterns
    const errorPatterns = this._analyzeErrorPatterns();

    // Slippage optimization
    if (errorPatterns.slippageErrors > 2) {
      const newSlippage = Math.min(
        currentConfig.SLIPPAGE_TOLERANCE_PERCENT * 1.5,
        2.0
      );
      optimizations.recommendedParams.SLIPPAGE_TOLERANCE_PERCENT = newSlippage;
      optimizations.reasoning.push(
        `Increase slippage tolerance from ${currentConfig.SLIPPAGE_TOLERANCE_PERCENT}% to ${newSlippage}% due to ${errorPatterns.slippageErrors} slippage errors`
      );
      optimizations.expectedImprovement.slippageErrors = "-50%";
    }

    // Min price diff optimization
    if (errorPatterns.lowProfitTrades > 5) {
      const newMinDiff = currentConfig.MIN_PRICE_DIFF_PERCENT * 1.2;
      optimizations.recommendedParams.MIN_PRICE_DIFF_PERCENT = newMinDiff;
      optimizations.reasoning.push(
        `Increase minimum price difference from ${currentConfig.MIN_PRICE_DIFF_PERCENT}% to ${newMinDiff}% to filter low-profit opportunities`
      );
      optimizations.expectedImprovement.avgProfit = "+15%";
    }

    // Trade size optimization
    if (errorPatterns.liquidityErrors > 3) {
      const newTradeSize = currentConfig.TRADE_SIZE_ETH * 0.8;
      optimizations.recommendedParams.TRADE_SIZE_ETH = newTradeSize;
      optimizations.reasoning.push(
        `Reduce trade size from ${currentConfig.TRADE_SIZE_ETH} ETH to ${newTradeSize} ETH due to liquidity constraints`
      );
      optimizations.expectedImprovement.liquidityErrors = "-60%";
    }

    // Generate code change for parameters
    if (Object.keys(optimizations.recommendedParams).length > 0) {
      optimizations.codeChange = {
        file: "src/config.js",
        description: "Update trading parameters based on AI optimization",
        changeType: "modification",
        params: optimizations.recommendedParams,
        requiresAuth: true
      };
    }

    this.recommendations.push(optimizations);
    return optimizations;
  }

  /**
   * Analyze error patterns from history
   * @private
   */
  _analyzeErrorPatterns() {
    const patterns = {
      networkErrors: 0,
      contractErrors: 0,
      priceErrors: 0,
      liquidityErrors: 0,
      gasErrors: 0,
      slippageErrors: 0,
      configErrors: 0,
      logicErrors: 0,
      lowProfitTrades: 0, // Placeholder for trading performance data
      totalErrors: this.errorHistory.length
    };

    for (const error of this.errorHistory) {
      switch (error.category) {
        case ERROR_CATEGORIES.NETWORK:
          patterns.networkErrors++;
          break;
        case ERROR_CATEGORIES.CONTRACT:
          patterns.contractErrors++;
          break;
        case ERROR_CATEGORIES.PRICE:
          patterns.priceErrors++;
          break;
        case ERROR_CATEGORIES.LIQUIDITY:
          patterns.liquidityErrors++;
          break;
        case ERROR_CATEGORIES.GAS:
          patterns.gasErrors++;
          break;
        case ERROR_CATEGORIES.SLIPPAGE:
          patterns.slippageErrors++;
          break;
        case ERROR_CATEGORIES.CONFIG:
          patterns.configErrors++;
          break;
        case ERROR_CATEGORIES.LOGIC:
          patterns.logicErrors++;
          break;
      }
    }

    return patterns;
  }

  /**
   * Generate a comprehensive trading optimization report
   * @returns {Object} Detailed report with all recommendations
   */
  generateOptimizationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      agentInfo: {
        name: this.config.name,
        version: this.config.version,
        focusAreas: this.config.focusAreas
      },
      performanceMetrics: { ...this.performanceMetrics },
      errorAnalysis: this._analyzeErrorPatterns(),
      diagnosticHistory: this.diagnosticResults.slice(-10), // Last 10 diagnoses
      pendingAuthorizations: this.pendingChanges.filter(c => !this.authorizedChanges.includes(c)),
      recommendations: this.recommendations,
      systemHealth: this._assessSystemHealth()
    };

    return report;
  }

  /**
   * Assess overall system health
   * @private
   */
  _assessSystemHealth() {
    const errorRate = this.performanceMetrics.totalAnalyses > 0
      ? (this.errorHistory.length / this.performanceMetrics.totalAnalyses) * 100
      : 0;

    let healthStatus = "healthy";
    let healthScore = 100;

    if (errorRate > 50) {
      healthStatus = "critical";
      healthScore = 20;
    } else if (errorRate > 30) {
      healthStatus = "degraded";
      healthScore = 50;
    } else if (errorRate > 10) {
      healthStatus = "warning";
      healthScore = 75;
    }

    return {
      status: healthStatus,
      score: healthScore,
      errorRate: errorRate.toFixed(2) + "%",
      recentErrors: this.errorHistory.slice(-5),
      recommendation: healthScore < 75 
        ? "Review and implement pending recommendations"
        : "System operating normally"
    };
  }

  /**
   * Format diagnosis for human-readable output
   * @param {Object} diagnosis - Diagnosis object
   * @returns {string} Formatted string
   */
  formatDiagnosis(diagnosis) {
    const lines = [
      "═══════════════════════════════════════════════════════════════",
      "              AI AGENT DIAGNOSTIC REPORT                        ",
      "═══════════════════════════════════════════════════════════════",
      "",
      `Timestamp: ${diagnosis.timestamp}`,
      `Error Category: ${diagnosis.category.toUpperCase()}`,
      `Severity: ${"★".repeat(diagnosis.severity)}${"☆".repeat(5 - diagnosis.severity)} (${diagnosis.severity}/5)`,
      "",
      "ROOT CAUSE ANALYSIS:",
      `  Cause: ${diagnosis.rootCause.cause}`,
      `  Details: ${diagnosis.rootCause.details}`,
      "",
      "  Possible Reasons:"
    ];

    for (const reason of diagnosis.rootCause.possibleReasons) {
      lines.push(`    • ${reason}`);
    }

    lines.push("");
    lines.push("RECOMMENDATIONS:");
    
    for (const rec of diagnosis.recommendations) {
      lines.push(`  [${rec.priority.toUpperCase()}] ${rec.action}`);
      lines.push(`    Reasoning: ${rec.reasoning}`);
      lines.push(`    Expected Improvement: ${rec.expectedImprovement}`);
      lines.push("");
    }

    if (diagnosis.codeChanges.length > 0) {
      lines.push("SUGGESTED CODE CHANGES:");
      for (const change of diagnosis.codeChanges) {
        lines.push(`  File: ${change.file}`);
        lines.push(`  Description: ${change.description}`);
        lines.push(`  Requires Auth: ${change.requiresAuth ? "YES" : "NO"}`);
        lines.push("");
      }
    }

    lines.push("═══════════════════════════════════════════════════════════════");

    return lines.join("\n");
  }

  /**
   * Clear error history and reset metrics
   */
  reset() {
    this.errorHistory = [];
    this.recommendations = [];
    this.pendingChanges = [];
    this.authorizedChanges = [];
    this.diagnosticResults = [];
    this.performanceMetrics = {
      totalAnalyses: 0,
      successfulDiagnoses: 0,
      recommendationsAccepted: 0,
      recommendationsRejected: 0
    };
  }
}

// Export singleton instance for convenience
export const aiAgent = new AIAgent();

// Export for external use
export default AIAgent;
