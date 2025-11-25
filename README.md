# DEX Trader - Base Network Arbitrage Bot

A high-performance DEX arbitrage bot for the Base network that queries smart contracts directly for fast price data. This bot bypasses slow public APIs by calling the `slot0` function on Uniswap V3 style pool contracts to get real-time price and liquidity information.

## Features

- **Direct Contract Queries**: Queries DEX smart contracts directly using ethers.js for sub-second price data
- **Multiple DEX Support**: Supports Uniswap V3 and Aerodrome CL (Concentrated Liquidity) pools on Base
- **Simultaneous Price Fetching**: Fetches prices from multiple DEXes in parallel for speed
- **Arbitrage Detection**: Automatically identifies arbitrage opportunities between DEXes
- **Gas Fee Calculation**: Accounts for gas fees when calculating profitability
- **Configurable Parameters**: Customizable trade sizes, slippage tolerance, and profit thresholds

## Supported Tokens (Base Network)

| Token | Symbol | Address | Decimals |
|-------|--------|---------|----------|
| Wrapped Ether | WETH | 0x4200000000000000000000000000000000000006 | 18 |
| USD Coin | USDC | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 | 6 |
| USD Base Coin (Bridged) | USDbC | 0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA | 6 |
| Dai Stablecoin | DAI | 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb | 18 |

## Supported DEXes

| DEX | Type | Description |
|-----|------|-------------|
| Uniswap V3 | V3 | Leading DEX with concentrated liquidity |
| Aerodrome | V2/V3 | Major Base-native DEX with CL pools |
| BaseSwap | V2 | Popular V2-style DEX on Base |
| SwapBased | V2 | Alternative V2 DEX on Base |

## Installation

```bash
# Clone the repository
git clone https://github.com/cczerp/dex-trader-.git
cd dex-trader-

# Install dependencies
npm install
```

## Usage

### Basic Usage

```bash
# Run arbitrage analysis for default pair (WETH/USDC) with 1 ETH trade size
npm start

# Or run directly
node src/index.js
```

### Custom Trading Pairs and Sizes

```bash
# Analyze WETH/USDC with 2.5 ETH trade size
node src/index.js WETH/USDC 2.5

# Analyze WETH/USDbC pair
node src/index.js WETH/USDbC 1.0
```

### Continuous Monitoring

```bash
# Monitor for arbitrage opportunities (checks every 5 seconds)
node src/index.js --monitor

# Custom interval (10 seconds)
node src/index.js --monitor --interval=10000
```

## How It Works

### 1. Direct Smart Contract Queries

Instead of using slow public APIs, this bot queries DEX smart contracts directly:

```javascript
// Calls slot0() on Uniswap V3 style pools
const slot0 = await poolContract.slot0();
// Returns: sqrtPriceX96, tick, observationIndex, etc.
```

### 2. Price Calculation

The `sqrtPriceX96` value from `slot0()` is converted to a human-readable price:

```javascript
// sqrtPriceX96 = sqrt(price) * 2^96
const price = (sqrtPriceX96 / 2^96)^2 * 10^(token0Decimals - token1Decimals)
```

### 3. Arbitrage Detection

The bot compares prices across DEXes and identifies opportunities when:
- Price difference exceeds minimum threshold (default: 0.1%)
- Net profit after gas fees exceeds minimum (default: $1.00)

### 4. Profitability Analysis

```
Gross Profit = (Sell Price - Buy Price) × Trade Amount
Net Profit = Gross Profit - (Gas Cost × 2)  // Two swaps needed
```

## Configuration

Edit `src/config.js` to customize:

```javascript
// Arbitrage settings
export const ARBITRAGE_CONFIG = {
  MIN_PRICE_DIFF_PERCENT: 0.1,      // Minimum price difference to consider
  TRADE_SIZE_ETH: 1.0,               // Default trade size
  SLIPPAGE_TOLERANCE_PERCENT: 0.5    // Expected slippage
};

// Gas settings
export const GAS_CONFIG = {
  SWAP_GAS_LIMIT: 250000n,           // Gas limit per swap
  MIN_PROFIT_THRESHOLD_USD: 1.0      // Minimum profit after gas
};
```

## Example Output

```
═══════════════════════════════════════════════════════════════
                    ARBITRAGE ANALYSIS REPORT                   
═══════════════════════════════════════════════════════════════

Status: ✅ PROFITABLE OPPORTUNITY

PRICE COMPARISON:
  Uniswap V3: $3000.123456 ← BUY
  Aerodrome CL: $3015.789012 ← SELL

ARBITRAGE DIRECTION:
  Buy from:  Uniswap V3 @ $3000.123456
  Sell to:   Aerodrome CL @ $3015.789012
  Price Diff: 0.5213%

PROFIT ANALYSIS:
  Trade Size:      1 ETH
  Gross Profit:    $15.6656
  Gas Cost (2 swaps): $0.0024
  Net Profit:      $15.6632

RECOMMENDATION: PROFITABLE - Net profit after gas: $15.6632
═══════════════════════════════════════════════════════════════
```

## Running Tests

```bash
npm test
```

## Project Structure

```
dex-trader-/
├── src/
│   ├── index.js         # Main entry point
│   ├── config.js        # Configuration (tokens, DEXes, pools)
│   ├── abis.js          # Smart contract ABIs
│   ├── priceFetcher.js  # Direct contract price queries
│   └── arbitrage.js     # Arbitrage calculation logic
├── test/
│   └── arbitrage.test.js
├── package.json
├── .gitignore
├── LICENSE
└── README.md
```

## Technical Details

### Pool Contracts

- **Uniswap V3**: Uses `slot0()` to get `sqrtPriceX96` and current tick
- **Aerodrome CL**: Compatible with Uniswap V3 interface, also uses `slot0()`

### Key Functions

| Function | Description |
|----------|-------------|
| `slot0()` | Returns current price (sqrtPriceX96), tick, and observation data |
| `liquidity()` | Returns current in-range liquidity |
| `token0()` / `token1()` | Returns pool token addresses |

### RPC Endpoints

Default: `https://mainnet.base.org`

Alternative endpoints in `config.js` for redundancy:
- `https://base.meowrpc.com`
- `https://base.publicnode.com`
- `https://1rpc.io/base`

## Disclaimer

⚠️ **This software is for educational purposes only.**

- Arbitrage trading carries significant financial risk
- Past arbitrage opportunities do not guarantee future profits
- Gas fees and slippage can eliminate profits
- Always test with small amounts first
- The authors are not responsible for any financial losses

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details. 
