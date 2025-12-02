/**
 * Tests for AI Agent functionality
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";

import {
  AIAgent,
  AI_AGENT_CONFIG,
  ERROR_CATEGORIES
} from "../src/aiAgent.js";

import { SmartErrorHandler } from "../src/errorHandler.js";

describe("AI Agent", () => {
  let agent;

  beforeEach(() => {
    agent = new AIAgent();
  });

  describe("Error Categorization", () => {
    it("should categorize network errors correctly", () => {
      const error = new Error("Network connection failed");
      error.code = "NETWORK_ERROR";
      
      const diagnosis = agent.analyzeError(error);
      
      assert.strictEqual(diagnosis.category, ERROR_CATEGORIES.NETWORK);
    });

    it("should categorize contract errors correctly", () => {
      const error = new Error("execution reverted");
      error.code = "CALL_EXCEPTION";
      
      const diagnosis = agent.analyzeError(error);
      
      assert.strictEqual(diagnosis.category, ERROR_CATEGORIES.CONTRACT);
    });

    it("should categorize price errors correctly", () => {
      const error = new Error("Invalid sqrtPriceX96 value");
      
      const diagnosis = agent.analyzeError(error, { operation: "price_fetch" });
      
      assert.strictEqual(diagnosis.category, ERROR_CATEGORIES.PRICE);
    });

    it("should categorize liquidity errors correctly", () => {
      const error = new Error("Insufficient liquidity for trade");
      
      const diagnosis = agent.analyzeError(error);
      
      assert.strictEqual(diagnosis.category, ERROR_CATEGORIES.LIQUIDITY);
    });

    it("should categorize gas errors correctly", () => {
      const error = new Error("Gas estimation failed");
      error.code = "INSUFFICIENT_FUNDS";
      
      const diagnosis = agent.analyzeError(error);
      
      assert.strictEqual(diagnosis.category, ERROR_CATEGORIES.GAS);
    });

    it("should categorize slippage errors correctly", () => {
      const error = new Error("Slippage tolerance exceeded");
      
      const diagnosis = agent.analyzeError(error);
      
      assert.strictEqual(diagnosis.category, ERROR_CATEGORIES.SLIPPAGE);
    });

    it("should categorize config errors correctly", () => {
      const error = new Error("Invalid address in config");
      
      const diagnosis = agent.analyzeError(error);
      
      assert.strictEqual(diagnosis.category, ERROR_CATEGORIES.CONFIG);
    });

    it("should categorize logic errors correctly", () => {
      const error = new Error("Cannot read property of undefined");
      
      const diagnosis = agent.analyzeError(error);
      
      assert.strictEqual(diagnosis.category, ERROR_CATEGORIES.LOGIC);
    });

    it("should categorize unknown errors correctly", () => {
      const error = new Error("Something completely different happened");
      
      const diagnosis = agent.analyzeError(error);
      
      assert.strictEqual(diagnosis.category, ERROR_CATEGORIES.UNKNOWN);
    });
  });

  describe("Diagnosis Generation", () => {
    it("should generate a complete diagnosis object", () => {
      const error = new Error("Network timeout");
      error.code = "NETWORK_ERROR";
      
      const diagnosis = agent.analyzeError(error, { operation: "test" });
      
      assert.ok(diagnosis.timestamp);
      assert.ok(diagnosis.errorMessage);
      assert.ok(diagnosis.category);
      assert.ok(typeof diagnosis.severity === "number");
      assert.ok(diagnosis.rootCause);
      assert.ok(Array.isArray(diagnosis.recommendations));
      assert.ok(Array.isArray(diagnosis.codeChanges));
      assert.strictEqual(diagnosis.requiresAuth, true);
    });

    it("should include root cause analysis", () => {
      const error = new Error("Contract revert");
      error.code = "CALL_EXCEPTION";
      
      const diagnosis = agent.analyzeError(error);
      
      assert.ok(diagnosis.rootCause.cause);
      assert.ok(diagnosis.rootCause.details);
      assert.ok(Array.isArray(diagnosis.rootCause.possibleReasons));
      assert.ok(diagnosis.rootCause.possibleReasons.length > 0);
    });

    it("should generate recommendations based on error type", () => {
      const error = new Error("Network connection failed");
      error.code = "NETWORK_ERROR";
      
      const diagnosis = agent.analyzeError(error);
      
      assert.ok(diagnosis.recommendations.length > 0);
      
      // Should have recommendation for RPC failover
      const rpcRecommendation = diagnosis.recommendations.find(r => 
        r.action.toLowerCase().includes("rpc") || r.action.toLowerCase().includes("backup")
      );
      assert.ok(rpcRecommendation);
    });

    it("should assess severity correctly", () => {
      // Config errors should be severity 5 (most severe)
      const configError = new Error("Invalid config parameter");
      const configDiagnosis = agent.analyzeError(configError);
      assert.strictEqual(configDiagnosis.severity, 5);

      // Slippage errors should be severity 2 (less severe)
      const slippageError = new Error("Slippage too high");
      const slippageDiagnosis = agent.analyzeError(slippageError);
      assert.strictEqual(slippageDiagnosis.severity, 2);
    });
  });

  describe("Code Change Suggestions", () => {
    it("should generate code changes for network errors", () => {
      const error = new Error("Network error occurred");
      error.code = "NETWORK_ERROR";
      
      const diagnosis = agent.analyzeError(error);
      
      assert.ok(diagnosis.codeChanges.length > 0);
      const change = diagnosis.codeChanges[0];
      assert.ok(change.file);
      assert.ok(change.description);
      assert.ok(change.code);
      assert.strictEqual(change.requiresAuth, true);
    });

    it("should generate code changes for price errors", () => {
      const error = new Error("Invalid price data");
      
      const diagnosis = agent.analyzeError(error, { operation: "price_fetch" });
      
      const priceChange = diagnosis.codeChanges.find(c => 
        c.description.toLowerCase().includes("price")
      );
      assert.ok(priceChange);
    });
  });

  describe("Performance Metrics", () => {
    it("should track analysis count", () => {
      assert.strictEqual(agent.performanceMetrics.totalAnalyses, 0);
      
      agent.analyzeError(new Error("Test error 1"));
      agent.analyzeError(new Error("Test error 2"));
      
      assert.strictEqual(agent.performanceMetrics.totalAnalyses, 2);
    });

    it("should track successful diagnoses", () => {
      agent.analyzeError(new Error("Test error"));
      
      assert.strictEqual(agent.performanceMetrics.successfulDiagnoses, 1);
    });

    it("should maintain error history", () => {
      agent.analyzeError(new Error("Error 1"));
      agent.analyzeError(new Error("Error 2"));
      
      assert.strictEqual(agent.errorHistory.length, 2);
    });

    it("should respect error history limit", () => {
      const smallLimitAgent = new AIAgent({ errorHistoryLimit: 3 });
      
      for (let i = 0; i < 5; i++) {
        smallLimitAgent.analyzeError(new Error(`Error ${i}`));
      }
      
      assert.strictEqual(smallLimitAgent.errorHistory.length, 3);
    });
  });

  describe("Authorization System", () => {
    it("should create authorization request for changes", async () => {
      const change = {
        file: "src/test.js",
        description: "Test change",
        changeType: "modification"
      };
      
      const result = await agent.requestAuthorization(change);
      
      assert.strictEqual(result.authorized, false);
      assert.strictEqual(result.pending, true);
      assert.ok(result.authRequestId);
    });

    it("should track pending changes", async () => {
      const change = {
        file: "src/test.js",
        description: "Test change",
        changeType: "enhancement"
      };
      
      await agent.requestAuthorization(change);
      
      assert.strictEqual(agent.pendingChanges.length, 1);
    });

    it("should process authorization callback", async () => {
      const change = {
        file: "src/test.js",
        description: "Test change",
        changeType: "modification"
      };
      
      const mockCallback = async () => ({ authorized: true, reason: "Approved" });
      
      const result = await agent.requestAuthorization(change, mockCallback);
      
      assert.strictEqual(result.authorized, true);
      assert.strictEqual(agent.performanceMetrics.recommendationsAccepted, 1);
    });

    it("should track rejected changes", async () => {
      const change = {
        file: "src/test.js",
        description: "Test change",
        changeType: "modification"
      };
      
      const mockCallback = async () => ({ authorized: false, reason: "Rejected" });
      
      await agent.requestAuthorization(change, mockCallback);
      
      assert.strictEqual(agent.performanceMetrics.recommendationsRejected, 1);
    });
  });

  describe("Trading Parameter Optimization", () => {
    it("should generate optimization recommendations", () => {
      // Add some error history to trigger optimization suggestions
      for (let i = 0; i < 5; i++) {
        agent.analyzeError(new Error("Slippage tolerance exceeded"));
      }
      
      const optimization = agent.optimizeTradingParameters();
      
      assert.ok(optimization.timestamp);
      assert.ok(optimization.currentParams);
      assert.ok(optimization.recommendedParams);
      assert.ok(Array.isArray(optimization.reasoning));
    });

    it("should recommend slippage increase after slippage errors", () => {
      // Generate slippage errors
      for (let i = 0; i < 3; i++) {
        agent.analyzeError(new Error("Slippage tolerance exceeded"));
      }
      
      const optimization = agent.optimizeTradingParameters();
      
      if (optimization.recommendedParams.SLIPPAGE_TOLERANCE_PERCENT) {
        assert.ok(
          optimization.recommendedParams.SLIPPAGE_TOLERANCE_PERCENT > 
          optimization.currentParams.SLIPPAGE_TOLERANCE_PERCENT
        );
      }
    });

    it("should recommend trade size reduction after liquidity errors", () => {
      // Generate liquidity errors
      for (let i = 0; i < 4; i++) {
        agent.analyzeError(new Error("Insufficient liquidity"));
      }
      
      const optimization = agent.optimizeTradingParameters();
      
      if (optimization.recommendedParams.TRADE_SIZE_ETH) {
        assert.ok(
          optimization.recommendedParams.TRADE_SIZE_ETH < 
          optimization.currentParams.TRADE_SIZE_ETH
        );
      }
    });
  });

  describe("Optimization Report", () => {
    it("should generate comprehensive report", () => {
      agent.analyzeError(new Error("Test error"));
      
      const report = agent.generateOptimizationReport();
      
      assert.ok(report.timestamp);
      assert.ok(report.agentInfo);
      assert.ok(report.performanceMetrics);
      assert.ok(report.errorAnalysis);
      assert.ok(report.systemHealth);
    });

    it("should include agent info in report", () => {
      const report = agent.generateOptimizationReport();
      
      assert.strictEqual(report.agentInfo.name, AI_AGENT_CONFIG.name);
      assert.strictEqual(report.agentInfo.version, AI_AGENT_CONFIG.version);
      assert.ok(Array.isArray(report.agentInfo.focusAreas));
    });

    it("should assess system health correctly", () => {
      const report = agent.generateOptimizationReport();
      
      assert.ok(report.systemHealth.status);
      assert.ok(typeof report.systemHealth.score === "number");
      assert.ok(report.systemHealth.recommendation);
    });
  });

  describe("Diagnosis Formatting", () => {
    it("should format diagnosis as human-readable string", () => {
      const error = new Error("Test error for formatting");
      error.code = "TEST_ERROR";
      
      const diagnosis = agent.analyzeError(error);
      const formatted = agent.formatDiagnosis(diagnosis);
      
      assert.ok(typeof formatted === "string");
      assert.ok(formatted.includes("DIAGNOSTIC REPORT"));
      assert.ok(formatted.includes("ROOT CAUSE"));
      assert.ok(formatted.includes("RECOMMENDATIONS"));
    });
  });

  describe("Reset Functionality", () => {
    it("should reset all state", () => {
      agent.analyzeError(new Error("Test error"));
      agent.optimizeTradingParameters();
      
      agent.reset();
      
      assert.strictEqual(agent.errorHistory.length, 0);
      assert.strictEqual(agent.recommendations.length, 0);
      assert.strictEqual(agent.pendingChanges.length, 0);
      assert.strictEqual(agent.diagnosticResults.length, 0);
      assert.strictEqual(agent.performanceMetrics.totalAnalyses, 0);
    });
  });
});

describe("Smart Error Handler", () => {
  let handler;

  beforeEach(() => {
    handler = new SmartErrorHandler({ verboseLogging: false });
  });

  describe("Function Wrapping", () => {
    it("should wrap async functions and return results on success", async () => {
      const fn = async () => "success";
      const wrapped = handler.wrapAsync(fn);
      
      const result = await wrapped();
      
      assert.strictEqual(result, "success");
    });

    it("should retry on retryable errors", async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 2) {
          const error = new Error("Network timeout");
          error.code = "NETWORK_ERROR";
          throw error;
        }
        return "success after retry";
      };
      
      const wrapped = handler.wrapAsync(fn);
      const result = await wrapped();
      
      assert.strictEqual(result, "success after retry");
      assert.strictEqual(attempts, 2);
    });

    it("should not retry non-retryable errors", async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error("Invalid config");
      };
      
      const wrapped = handler.wrapAsync(fn);
      
      try {
        await wrapped();
        assert.fail("Should have thrown");
      } catch {
        // Config errors are not retryable
        assert.ok(attempts <= 2); // May retry once before categorizing
      }
    });

    it("should enhance error with AI diagnosis", async () => {
      const fn = async () => {
        throw new Error("Test error");
      };
      
      const wrapped = handler.wrapAsync(fn);
      
      try {
        await wrapped();
        assert.fail("Should have thrown");
      } catch (error) {
        assert.ok(error.aiDiagnosis);
        assert.ok(error.context !== undefined);
      }
    });
  });

  describe("Error Logging", () => {
    it("should maintain error log", async () => {
      const fn = async () => {
        throw new Error("Test error");
      };
      
      const wrapped = handler.wrapAsync(fn);
      
      try {
        await wrapped();
      } catch {
        // Expected
      }
      
      assert.ok(handler.errorLog.length > 0);
    });
  });

  describe("AI Agent Access", () => {
    it("should provide access to AI agent", () => {
      const agent = handler.getAIAgent();
      
      assert.ok(agent instanceof AIAgent);
    });
  });

  describe("Report Generation", () => {
    it("should generate combined error report", async () => {
      const fn = async () => {
        throw new Error("Test error");
      };
      
      const wrapped = handler.wrapAsync(fn);
      
      try {
        await wrapped();
      } catch {
        // Expected
      }
      
      const report = handler.generateReport();
      
      assert.ok(report.timestamp);
      assert.ok(typeof report.totalErrors === "number");
      assert.ok(report.aiReport);
    });
  });

  describe("Reset Functionality", () => {
    it("should reset handler and agent state", async () => {
      const fn = async () => {
        throw new Error("Test error");
      };
      
      const wrapped = handler.wrapAsync(fn);
      
      try {
        await wrapped();
      } catch {
        // Expected
      }
      
      handler.reset();
      
      assert.strictEqual(handler.errorLog.length, 0);
    });
  });
});

describe("AI Agent Configuration", () => {
  it("should have correct default configuration", () => {
    assert.ok(AI_AGENT_CONFIG.name);
    assert.ok(AI_AGENT_CONFIG.version);
    assert.ok(Array.isArray(AI_AGENT_CONFIG.focusAreas));
    assert.ok(AI_AGENT_CONFIG.focusAreas.includes("dex_swap_logic"));
    assert.strictEqual(AI_AGENT_CONFIG.requireAuthForChanges, true);
  });

  it("should have all required focus areas", () => {
    const requiredAreas = [
      "dex_swap_logic",
      "arbitrage_calculations",
      "price_fetching",
      "gas_optimization"
    ];
    
    for (const area of requiredAreas) {
      assert.ok(
        AI_AGENT_CONFIG.focusAreas.includes(area),
        `Missing focus area: ${area}`
      );
    }
  });

  it("should define restricted actions", () => {
    assert.ok(Array.isArray(AI_AGENT_CONFIG.restrictedActions));
    assert.ok(AI_AGENT_CONFIG.restrictedActions.includes("execute_trade"));
  });
});
