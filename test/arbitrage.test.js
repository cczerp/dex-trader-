/**
 * Tests for DEX Arbitrage Bot
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";

import {
  sqrtPriceX96ToPrice,
  sqrtPriceX96ToInversePrice
} from "../src/priceFetcher.js";

import {
  calculatePriceDifference,
  determineArbitrageDirection,
  calculatePotentialProfit,
  calculateNetProfit,
  analyzeArbitrage
} from "../src/arbitrage.js";

describe("Price Calculations", () => {
  it("should convert sqrtPriceX96 to price correctly for WETH/USDC", () => {
    // Example sqrtPriceX96 value (approximately $3000 ETH)
    // sqrtPriceX96 = sqrt(3000 * 10^-12) * 2^96
    // For WETH (18 decimals) / USDC (6 decimals)
    const sqrtPriceX96 = 4339614439632553729548697n;
    const token0Decimals = 18; // WETH
    const token1Decimals = 6;  // USDC
    
    const price = sqrtPriceX96ToPrice(sqrtPriceX96, token0Decimals, token1Decimals);
    
    // Should be around 3000 (ETH price in USDC)
    assert.ok(price > 2000 && price < 5000, `Price ${price} should be between 2000 and 5000`);
  });
  
  it("should calculate inverse price correctly", () => {
    const sqrtPriceX96 = 4339614439632553729548697n;
    const token0Decimals = 18;
    const token1Decimals = 6;
    
    const price = sqrtPriceX96ToPrice(sqrtPriceX96, token0Decimals, token1Decimals);
    const inversePrice = sqrtPriceX96ToInversePrice(sqrtPriceX96, token0Decimals, token1Decimals);
    
    // Price * InversePrice should be approximately 1
    const product = price * inversePrice;
    assert.ok(Math.abs(product - 1) < 0.0001, `Product ${product} should be approximately 1`);
  });
  
  it("should handle zero sqrtPriceX96", () => {
    const price = sqrtPriceX96ToPrice(0n, 18, 6);
    assert.strictEqual(price, 0);
  });
});

describe("Arbitrage Calculations", () => {
  describe("calculatePriceDifference", () => {
    it("should calculate percentage difference correctly", () => {
      const diff = calculatePriceDifference(3000, 3030);
      assert.ok(diff > 0.9 && diff < 1.1, `Difference ${diff}% should be approximately 1%`);
    });
    
    it("should return 0 for identical prices", () => {
      const diff = calculatePriceDifference(3000, 3000);
      assert.strictEqual(diff, 0);
    });
    
    it("should handle zero prices", () => {
      const diff = calculatePriceDifference(0, 3000);
      assert.strictEqual(diff, 0);
    });
    
    it("should be symmetric", () => {
      const diff1 = calculatePriceDifference(3000, 3030);
      const diff2 = calculatePriceDifference(3030, 3000);
      assert.strictEqual(diff1, diff2);
    });
  });
  
  describe("determineArbitrageDirection", () => {
    it("should correctly identify buy and sell DEXes", () => {
      const priceData1 = { dex: "Uniswap V3", priceToken0InToken1: 3000 };
      const priceData2 = { dex: "Aerodrome CL", priceToken0InToken1: 3030 };
      
      const direction = determineArbitrageDirection(priceData1, priceData2, "WETH");
      
      assert.strictEqual(direction.buyFrom, "Uniswap V3");
      assert.strictEqual(direction.sellTo, "Aerodrome CL");
      assert.strictEqual(direction.buyPrice, 3000);
      assert.strictEqual(direction.sellPrice, 3030);
    });
    
    it("should swap direction when prices are reversed", () => {
      const priceData1 = { dex: "Uniswap V3", priceToken0InToken1: 3030 };
      const priceData2 = { dex: "Aerodrome CL", priceToken0InToken1: 3000 };
      
      const direction = determineArbitrageDirection(priceData1, priceData2, "WETH");
      
      assert.strictEqual(direction.buyFrom, "Aerodrome CL");
      assert.strictEqual(direction.sellTo, "Uniswap V3");
    });
  });
  
  describe("calculatePotentialProfit", () => {
    it("should calculate gross profit correctly", () => {
      const result = calculatePotentialProfit(3000, 3030, 1.0, 0);
      
      // Buy 1 ETH at 3000, sell at 3030 = $30 profit
      assert.ok(Math.abs(result.grossProfitQuote - 30) < 0.01);
    });
    
    it("should account for slippage", () => {
      const result = calculatePotentialProfit(3000, 3030, 1.0, 0.5);
      
      // With slippage, profit should be less
      assert.ok(result.grossProfitQuote < 30);
      assert.ok(result.effectiveBuyPrice > 3000);
      assert.ok(result.effectiveSellPrice < 3030);
    });
  });
  
  describe("calculateNetProfit", () => {
    it("should subtract gas costs from gross profit", () => {
      const result = calculateNetProfit(30, 0.5); // $30 profit, $0.50 gas per swap
      
      // 2 swaps = $1.00 total gas
      assert.strictEqual(result.totalGasCostUsd, 1.0);
      assert.strictEqual(result.netProfitUsd, 29);
      assert.strictEqual(result.isProfitable, true);
    });
    
    it("should identify unprofitable trades", () => {
      const result = calculateNetProfit(0.5, 0.5); // $0.50 profit, $0.50 gas per swap
      
      // $1.00 gas > $0.50 profit = not profitable
      assert.strictEqual(result.isProfitable, false);
      assert.ok(result.netProfitUsd < 0);
    });
  });
  
  describe("analyzeArbitrage", () => {
    it("should return no opportunity when prices are too similar", () => {
      const prices = [
        { dex: "Uniswap V3", priceToken0InToken1: 3000, liquidity: "1000000" },
        { dex: "Aerodrome CL", priceToken0InToken1: 3001, liquidity: "1000000" }
      ];
      
      const analysis = analyzeArbitrage(prices, 1.0, 0.01);
      
      // Price diff of ~0.03% is below 0.1% threshold
      assert.strictEqual(analysis.hasOpportunity, false);
    });
    
    it("should identify arbitrage opportunity with significant price difference", () => {
      const prices = [
        { dex: "Uniswap V3", priceToken0InToken1: 3000, liquidity: "1000000" },
        { dex: "Aerodrome CL", priceToken0InToken1: 3030, liquidity: "1000000" }
      ];
      
      const analysis = analyzeArbitrage(prices, 1.0, 0.01);
      
      // 1% price diff should trigger opportunity
      assert.strictEqual(analysis.hasOpportunity, true);
      assert.strictEqual(analysis.direction.buyFrom, "Uniswap V3");
      assert.strictEqual(analysis.direction.sellTo, "Aerodrome CL");
    });
    
    it("should handle prices with errors", () => {
      const prices = [
        { dex: "Uniswap V3", priceToken0InToken1: 3000, liquidity: "1000000" },
        { dex: "Aerodrome CL", error: "Pool not found" }
      ];
      
      const analysis = analyzeArbitrage(prices, 1.0, 0.01);
      
      assert.strictEqual(analysis.hasOpportunity, false);
      assert.ok(analysis.reason.includes("Insufficient"));
    });
    
    it("should return no opportunity when all prices are from same DEX", () => {
      const prices = [
        { dex: "Uniswap V3", priceToken0InToken1: 3000, liquidity: "1000000" }
      ];
      
      const analysis = analyzeArbitrage(prices, 1.0, 0.01);
      
      assert.strictEqual(analysis.hasOpportunity, false);
    });
  });
});

describe("Configuration", () => {
  it("should have valid token configurations", async () => {
    const { TOKENS } = await import("../src/config.js");
    
    assert.ok(TOKENS.WETH);
    assert.strictEqual(TOKENS.WETH.decimals, 18);
    assert.ok(TOKENS.WETH.address.startsWith("0x"));
    
    assert.ok(TOKENS.USDC);
    assert.strictEqual(TOKENS.USDC.decimals, 6);
  });
  
  it("should have valid DEX configurations", async () => {
    const { DEXES } = await import("../src/config.js");
    
    assert.ok(DEXES.UNISWAP_V3);
    assert.strictEqual(DEXES.UNISWAP_V3.type, "V3");
    
    assert.ok(DEXES.AERODROME);
    assert.ok(DEXES.BASESWAP);
    assert.ok(DEXES.SWAPBASED);
  });
  
  it("should have valid pool configurations", async () => {
    const { POOLS } = await import("../src/config.js");
    
    assert.ok(POOLS["WETH/USDC"]);
    assert.ok(POOLS["WETH/USDC"].UNISWAP_V3);
    assert.ok(POOLS["WETH/USDC"].AERODROME_CL);
    
    // Verify pool addresses are valid
    assert.ok(POOLS["WETH/USDC"].UNISWAP_V3.address.startsWith("0x"));
    assert.ok(POOLS["WETH/USDC"].AERODROME_CL.address.startsWith("0x"));
  });
});
