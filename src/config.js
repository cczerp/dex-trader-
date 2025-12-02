/**
 * Configuration for Base network DEXes and tokens
 * Contains pool addresses for direct smart contract queries
 */

// Base network RPC endpoint (free public endpoint)
export const BASE_RPC_URL = "https://mainnet.base.org";

// Alternative RPC endpoints for redundancy
export const ALTERNATIVE_RPC_URLS = [
  "https://base.meowrpc.com",
  "https://base.publicnode.com",
  "https://1rpc.io/base"
];

/**
 * Base Network Tokens
 * 4 popular tokens on Base network
 */
export const TOKENS = {
  WETH: {
    symbol: "WETH",
    name: "Wrapped Ether",
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6
  },
  USDbC: {
    symbol: "USDbC",
    name: "USD Base Coin (Bridged)",
    address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
    decimals: 6
  },
  DAI: {
    symbol: "DAI",
    name: "Dai Stablecoin",
    address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    decimals: 18
  }
};

/**
 * DEX Configurations on Base Network
 * 4 major DEXes with their router/factory addresses
 */
export const DEXES = {
  UNISWAP_V3: {
    name: "Uniswap V3",
    type: "V3",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481"
  },
  AERODROME: {
    name: "Aerodrome",
    type: "V2/V3",
    factory: "0x420DD381b31aEf6683db6B902084cB0FFECe40Da",
    router: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
    // Aerodrome uses CL (Concentrated Liquidity) pools similar to Uniswap V3
    clFactory: "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A"
  },
  BASESWAP: {
    name: "BaseSwap",
    type: "V2",
    factory: "0xFDa619b6d20975be80A10332cD39b9a4b0FAa8BB",
    router: "0x327Df1E6de05895d2ab08513aaDD9313Fe505d86"
  },
  SWAPBASED: {
    name: "SwapBased",
    type: "V2",
    factory: "0x04C9f118d21e8B767D2e50C946f0cC9F6C367300",
    router: "0xaaa3b1F1bd7BCc97fD1917c18ADE665C5D31F066"
  }
};

/**
 * Known Pool Addresses on Base
 * Pre-computed pool addresses for common trading pairs
 * These are verified pools with liquidity
 */
export const POOLS = {
  // WETH/USDC pools on different DEXes
  "WETH/USDC": {
    UNISWAP_V3: {
      address: "0xd0b53D9277642d899DF5C87A3966A349A798F224", // 0.05% fee pool
      fee: 500,
      token0: TOKENS.WETH.address,
      token1: TOKENS.USDC.address,
      isToken0Base: true
    },
    AERODROME_CL: {
      address: "0xb2cc224c1c9feE385f8ad6a55b4d94E92359DC59", // Aerodrome CL pool
      fee: 100,
      token0: TOKENS.WETH.address,
      token1: TOKENS.USDC.address,
      isToken0Base: true
    }
  },
  // WETH/USDbC pools
  "WETH/USDbC": {
    UNISWAP_V3: {
      address: "0x4C36388bE6F416A29C8d8Eee81C771cE6bE14B18", // 0.05% fee pool
      fee: 500,
      token0: TOKENS.WETH.address,
      token1: TOKENS.USDbC.address,
      isToken0Base: true
    },
    AERODROME_CL: {
      address: "0xBb5DFE1380333CEE4C2EeBd7202c80dE2256AdF4", // Aerodrome CL pool WETH/USDbC
      fee: 100,
      token0: TOKENS.WETH.address,
      token1: TOKENS.USDbC.address,
      isToken0Base: true
    }
  }
};

/**
 * Gas configuration for Base network
 */
export const GAS_CONFIG = {
  // Typical gas for a swap on Base
  SWAP_GAS_LIMIT: 250000n,
  // Current Base gas price range (in gwei)
  MIN_GAS_PRICE_GWEI: 0.001,
  MAX_GAS_PRICE_GWEI: 0.01,
  // Minimum profit threshold in USD after gas
  MIN_PROFIT_THRESHOLD_USD: 1.0
};

/**
 * Arbitrage configuration
 */
export const ARBITRAGE_CONFIG = {
  // Minimum price difference percentage to consider arbitrage
  MIN_PRICE_DIFF_PERCENT: 0.1,
  // Trade size in ETH for calculating profitability
  TRADE_SIZE_ETH: 1.0,
  // Slippage tolerance percentage
  SLIPPAGE_TOLERANCE_PERCENT: 0.5
};
