/**
 * Error Handler with AI Agent Integration
 * 
 * Wraps the DEX trading operations with intelligent error handling
 * that uses the AI Agent to diagnose problems and recommend fixes.
 */

import { AIAgent, ERROR_CATEGORIES } from "./aiAgent.js";

/**
 * Error Handler Configuration
 */
export const ERROR_HANDLER_CONFIG = {
  // Whether to use AI agent for error analysis
  useAIAgent: true,
  
  // Retry configuration
  maxRetries: 3,
  retryDelayMs: 1000,
  exponentialBackoff: true,
  
  // Logging
  verboseLogging: true,
  
  // Authorization callback
  authCallback: null
};

/**
 * Smart Error Handler class
 */
export class SmartErrorHandler {
  constructor(config = {}) {
    this.config = { ...ERROR_HANDLER_CONFIG, ...config };
    this.aiAgent = new AIAgent();
    this.errorLog = [];
  }

  /**
   * Wrap an async function with intelligent error handling
   * @param {Function} fn - The async function to wrap
   * @param {Object} context - Context about the operation
   * @returns {Function} Wrapped function with error handling
   */
  wrapAsync(fn, context = {}) {
    return async (...args) => {
      let lastError = null;
      let retries = 0;
      
      while (retries <= this.config.maxRetries) {
        try {
          return await fn(...args);
        } catch (error) {
          lastError = error;
          retries++;
          
          // Log the error
          this._logError(error, context, retries);
          
          // Use AI Agent for analysis
          if (this.config.useAIAgent) {
            const diagnosis = this.aiAgent.analyzeError(error, {
              ...context,
              args,
              retryCount: retries
            });
            
            // Output diagnosis in verbose mode
            if (this.config.verboseLogging) {
              console.log("\n" + this.aiAgent.formatDiagnosis(diagnosis));
            }
            
            // Check if error is retryable
            if (!this._isRetryable(diagnosis.category)) {
              break;
            }
            
            // Apply any immediate fixes if authorized
            await this._applyImmediateFixes(diagnosis);
          }
          
          // Wait before retry
          if (retries <= this.config.maxRetries) {
            const delay = this._calculateDelay(retries);
            if (this.config.verboseLogging) {
              console.log(`Retrying in ${delay}ms (attempt ${retries}/${this.config.maxRetries})...`);
            }
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // All retries exhausted - return comprehensive error info
      throw this._enhanceError(lastError, context, retries);
    };
  }

  /**
   * Log error with context
   * @private
   */
  _logError(error, context, retryCount) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message: error.message,
      code: error.code || null,
      context,
      retryCount,
      stack: error.stack
    };
    
    this.errorLog.push(logEntry);
    
    if (this.config.verboseLogging) {
      console.error(`[ERROR] ${error.message} (attempt ${retryCount})`);
    }
  }

  /**
   * Determine if an error category is retryable
   * @private
   */
  _isRetryable(category) {
    const retryableCategories = [
      ERROR_CATEGORIES.NETWORK,
      ERROR_CATEGORIES.GAS,
      ERROR_CATEGORIES.PRICE
    ];
    return retryableCategories.includes(category);
  }

  /**
   * Calculate retry delay with optional exponential backoff
   * @private
   */
  _calculateDelay(retryCount) {
    if (this.config.exponentialBackoff) {
      return this.config.retryDelayMs * Math.pow(2, retryCount - 1);
    }
    return this.config.retryDelayMs;
  }

  /**
   * Apply immediate fixes that don't require code changes
   * @private
   */
  async _applyImmediateFixes(diagnosis) {
    // Immediate fixes that can be applied without authorization
    // These are runtime adjustments, not code changes
    for (const rec of diagnosis.recommendations) {
      if (rec.action === "Switch to backup RPC endpoint") {
        // This would trigger RPC failover in a real implementation
        if (this.config.verboseLogging) {
          console.log("[AI AGENT] Recommending RPC endpoint switch...");
        }
      }
    }
  }

  /**
   * Enhance error with AI analysis
   * @private
   */
  _enhanceError(error, context, retryCount) {
    const enhancedError = new Error(error.message);
    enhancedError.originalError = error;
    enhancedError.context = context;
    enhancedError.retryCount = retryCount;
    enhancedError.aiDiagnosis = this.aiAgent.diagnosticResults.slice(-1)[0];
    enhancedError.recommendations = this.aiAgent.recommendations;
    
    return enhancedError;
  }

  /**
   * Get AI Agent instance for direct access
   * @returns {AIAgent} The AI Agent instance
   */
  getAIAgent() {
    return this.aiAgent;
  }

  /**
   * Generate error report
   * @returns {Object} Error report with AI analysis
   */
  generateReport() {
    return {
      timestamp: new Date().toISOString(),
      totalErrors: this.errorLog.length,
      recentErrors: this.errorLog.slice(-10),
      aiReport: this.aiAgent.generateOptimizationReport()
    };
  }

  /**
   * Set authorization callback for code changes
   * @param {Function} callback - Authorization callback
   */
  setAuthCallback(callback) {
    this.config.authCallback = callback;
    this.aiAgent.config.authCallback = callback;
  }

  /**
   * Clear error log and reset AI agent
   */
  reset() {
    this.errorLog = [];
    this.aiAgent.reset();
  }
}

/**
 * Create a wrapped version of a function with error handling
 * Convenience function for quick wrapping
 * @param {Function} fn - Function to wrap
 * @param {Object} context - Operation context
 * @param {Object} config - Error handler config
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(fn, context = {}, config = {}) {
  const handler = new SmartErrorHandler(config);
  return handler.wrapAsync(fn, context);
}

// Export singleton handler for convenience
export const errorHandler = new SmartErrorHandler();

export default SmartErrorHandler;
