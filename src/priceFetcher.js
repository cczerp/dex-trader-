/**
 * DEX Price Fetcher
 * Queries DEX smart contracts directly for fast price data
 * Uses ethers.js to call slot0 on Uniswap V3 style pools
 */

import { ethers } from "ethers";
import { BASE_RPC_URL, POOLS, TOKENS, GAS_CONFIG } from "./config.js";
import { UNISWAP_V3_POOL_ABI, AERODROME_CL_POOL_ABI, UNISWAP_V2_PAIR_ABI } from "./abis.js";

/**
 * Creates an ethers provider for Base network
 * @param {string} rpcUrl - RPC endpoint URL
 * @returns {ethers.JsonRpcProvider} Provider instance
 */
export function createProvider(rpcUrl = BASE_RPC_URL) {
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Calculates price from sqrtPriceX96
 * sqrtPriceX96 = sqrt(price) * 2^96
 * price = (sqrtPriceX96 / 2^96)^2
 * 
 * Note: For arbitrage detection purposes, standard JavaScript Number precision
 * is sufficient since we're comparing relative prices. For actual trading,
 * consider using a high-precision library like decimal.js.
 * 
 * @param {bigint} sqrtPriceX96 - The sqrt price from slot0
 * @param {number} token0Decimals - Decimals of token0
 * @param {number} token1Decimals - Decimals of token1
 * @returns {number} The price of token0 in terms of token1
 */
export function sqrtPriceX96ToPrice(sqrtPriceX96, token0Decimals, token1Decimals) {
  // Validate input - return 0 for invalid/missing values
  if (sqrtPriceX96 === null || sqrtPriceX96 === undefined || sqrtPriceX96 === 0n) {
    return 0;
  }
  
  const Q96 = 2n ** 96n;
  
  // Convert to number for floating point math
  // Note: Precision loss is acceptable for arbitrage detection purposes
  const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
  const price = sqrtPrice * sqrtPrice;
  
  // Adjust for decimal differences
  const decimalAdjustment = 10 ** (token0Decimals - token1Decimals);
  return price * decimalAdjustment;
}

/**
 * Calculates price for inverted pair (token1/token0)
 * @param {bigint} sqrtPriceX96 - The sqrt price from slot0
 * @param {number} token0Decimals - Decimals of token0
 * @param {number} token1Decimals - Decimals of token1
 * @returns {number} The price of token1 in terms of token0
 */
export function sqrtPriceX96ToInversePrice(sqrtPriceX96, token0Decimals, token1Decimals) {
  const price = sqrtPriceX96ToPrice(sqrtPriceX96, token0Decimals, token1Decimals);
  return 1 / price;
}

/**
 * Fetches slot0 data from a Uniswap V3 style pool
 * @param {ethers.Contract} poolContract - Pool contract instance
 * @returns {Promise<Object>} Slot0 data
 */
async function fetchSlot0(poolContract) {
  const slot0 = await poolContract.slot0();
  return {
    sqrtPriceX96: slot0[0],
    tick: slot0[1],
    observationIndex: slot0[2],
    observationCardinality: slot0[3],
    observationCardinalityNext: slot0[4]
  };
}

/**
 * Fetches pool liquidity
 * @param {ethers.Contract} poolContract - Pool contract instance
 * @returns {Promise<bigint>} Liquidity value
 */
async function fetchLiquidity(poolContract) {
  return await poolContract.liquidity();
}

/**
 * Fetches price data from a Uniswap V3 pool
 * @param {ethers.Provider} provider - Ethers provider
 * @param {string} poolAddress - Pool contract address
 * @param {number} token0Decimals - Decimals of token0
 * @param {number} token1Decimals - Decimals of token1
 * @returns {Promise<Object>} Price data including sqrtPriceX96, tick, and calculated price
 */
export async function fetchUniswapV3Price(provider, poolAddress, token0Decimals, token1Decimals) {
  const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, provider);
  
  // Fetch slot0 and liquidity simultaneously
  const [slot0Data, liquidity] = await Promise.all([
    fetchSlot0(poolContract),
    fetchLiquidity(poolContract)
  ]);
  
  // Calculate prices
  const priceToken0InToken1 = sqrtPriceX96ToPrice(slot0Data.sqrtPriceX96, token0Decimals, token1Decimals);
  const priceToken1InToken0 = sqrtPriceX96ToInversePrice(slot0Data.sqrtPriceX96, token0Decimals, token1Decimals);
  
  return {
    dex: "Uniswap V3",
    poolAddress,
    sqrtPriceX96: slot0Data.sqrtPriceX96.toString(),
    tick: Number(slot0Data.tick),
    liquidity: liquidity.toString(),
    priceToken0InToken1,
    priceToken1InToken0,
    timestamp: Date.now()
  };
}

/**
 * Fetches price data from an Aerodrome CL pool
 * @param {ethers.Provider} provider - Ethers provider
 * @param {string} poolAddress - Pool contract address
 * @param {number} token0Decimals - Decimals of token0
 * @param {number} token1Decimals - Decimals of token1
 * @returns {Promise<Object>} Price data
 */
export async function fetchAerodromeCLPrice(provider, poolAddress, token0Decimals, token1Decimals) {
  const poolContract = new ethers.Contract(poolAddress, AERODROME_CL_POOL_ABI, provider);
  
  // Fetch slot0 and liquidity simultaneously
  const [slot0Data, liquidity] = await Promise.all([
    fetchSlot0(poolContract),
    fetchLiquidity(poolContract)
  ]);
  
  // Calculate prices
  const priceToken0InToken1 = sqrtPriceX96ToPrice(slot0Data.sqrtPriceX96, token0Decimals, token1Decimals);
  const priceToken1InToken0 = sqrtPriceX96ToInversePrice(slot0Data.sqrtPriceX96, token0Decimals, token1Decimals);
  
  return {
    dex: "Aerodrome CL",
    poolAddress,
    sqrtPriceX96: slot0Data.sqrtPriceX96.toString(),
    tick: Number(slot0Data.tick),
    liquidity: liquidity.toString(),
    priceToken0InToken1,
    priceToken1InToken0,
    timestamp: Date.now()
  };
}

/**
 * Fetches prices from multiple DEXes for a trading pair simultaneously
 * @param {ethers.Provider} provider - Ethers provider
 * @param {string} pair - Trading pair name (e.g., "WETH/USDC")
 * @returns {Promise<Object[]>} Array of price data from each DEX
 */
export async function fetchPricesMultipleDEXes(provider, pair) {
  const poolConfig = POOLS[pair];
  if (!poolConfig) {
    throw new Error(`Unknown trading pair: ${pair}`);
  }
  
  // Determine token decimals
  const [token0Symbol, token1Symbol] = pair.split("/");
  const token0Decimals = TOKENS[token0Symbol]?.decimals ?? 18;
  const token1Decimals = TOKENS[token1Symbol]?.decimals ?? 6;
  
  const pricePromises = [];
  
  // Fetch from Uniswap V3 if pool exists
  if (poolConfig.UNISWAP_V3) {
    pricePromises.push(
      fetchUniswapV3Price(
        provider,
        poolConfig.UNISWAP_V3.address,
        token0Decimals,
        token1Decimals
      ).catch(err => ({ dex: "Uniswap V3", error: err.message }))
    );
  }
  
  // Fetch from Aerodrome CL if pool exists
  if (poolConfig.AERODROME_CL) {
    pricePromises.push(
      fetchAerodromeCLPrice(
        provider,
        poolConfig.AERODROME_CL.address,
        token0Decimals,
        token1Decimals
      ).catch(err => ({ dex: "Aerodrome CL", error: err.message }))
    );
  }
  
  // Execute all price fetches simultaneously
  const results = await Promise.all(pricePromises);
  
  return {
    pair,
    token0: token0Symbol,
    token1: token1Symbol,
    prices: results,
    queriedAt: new Date().toISOString()
  };
}

/**
 * Fetches current gas price from the network
 * @param {ethers.Provider} provider - Ethers provider
 * @returns {Promise<Object>} Gas price data
 */
export async function fetchGasPrice(provider) {
  const feeData = await provider.getFeeData();
  return {
    gasPrice: feeData.gasPrice?.toString() ?? "0",
    gasPriceGwei: feeData.gasPrice ? Number(ethers.formatUnits(feeData.gasPrice, "gwei")) : 0,
    maxFeePerGas: feeData.maxFeePerGas?.toString() ?? null,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString() ?? null
  };
}

/**
 * Estimates gas cost for a swap transaction
 * @param {ethers.Provider} provider - Ethers provider
 * @param {number} ethPriceUsd - Current ETH price in USD
 * @returns {Promise<Object>} Estimated gas cost in ETH and USD
 */
export async function estimateSwapGasCost(provider, ethPriceUsd) {
  const gasData = await fetchGasPrice(provider);
  const gasPriceWei = BigInt(gasData.gasPrice);
  const gasLimit = GAS_CONFIG.SWAP_GAS_LIMIT;
  
  const totalGasCostWei = gasPriceWei * gasLimit;
  const gasCostEth = Number(ethers.formatEther(totalGasCostWei));
  const gasCostUsd = gasCostEth * ethPriceUsd;
  
  return {
    gasLimit: gasLimit.toString(),
    gasPriceWei: gasPriceWei.toString(),
    gasPriceGwei: gasData.gasPriceGwei,
    gasCostEth,
    gasCostUsd
  };
}
