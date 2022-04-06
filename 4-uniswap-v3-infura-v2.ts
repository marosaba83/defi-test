import { ethers } from 'ethers';
import { Pool, Route, Trade } from '@uniswap/v3-sdk';
import { CurrencyAmount, Token, TradeType } from '@uniswap/sdk-core';
import { abi as IUniswapV3PoolABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { abi as QuoterABI } from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json';

const provider = new ethers.providers.JsonRpcProvider(
  'https://mainnet.infura.io/v3/8496fe61720c4bb0bd280c68c7be2fdb'
);

// USDC-WETH pool address on mainnet for fee tier 0.05%
const poolAddress = '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640';

const poolContract = new ethers.Contract(
  poolAddress,
  IUniswapV3PoolABI,
  provider
);

const quoterAddress = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';

const quoterContract = new ethers.Contract(quoterAddress, QuoterABI, provider);

interface Immutables {
  factory: string;
  token0: string;
  token1: string;
  fee: number;
  tickSpacing: number;
  maxLiquidityPerTick: ethers.BigNumber;
}

interface State {
  liquidity: ethers.BigNumber;
  sqrtPriceX96: ethers.BigNumber;
  tick: number;
  observationIndex: number;
  observationCardinality: number;
  observationCardinalityNext: number;
  feeProtocol: number;
  unlocked: boolean;
}

async function getPoolImmutables() {
  const [factory, token0, token1, fee, tickSpacing, maxLiquidityPerTick] =
    await Promise.all([
      poolContract.factory(),
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
      poolContract.tickSpacing(),
      poolContract.maxLiquidityPerTick(),
    ]);

  const immutables: Immutables = {
    factory,
    token0,
    token1,
    fee,
    tickSpacing,
    maxLiquidityPerTick,
  };
  return immutables;
}

async function getPoolState() {
  // note that data here can be desynced if the call executes over the span of two or more blocks.
  const [liquidity, slot] = await Promise.all([
    poolContract.liquidity(),
    poolContract.slot0(),
  ]);

  const PoolState: State = {
    liquidity,
    sqrtPriceX96: slot[0],
    tick: slot[1],
    observationIndex: slot[2],
    observationCardinality: slot[3],
    observationCardinalityNext: slot[4],
    feeProtocol: slot[5],
    unlocked: slot[6],
  };

  return PoolState;
}

async function main() {
  // query the state and immutable variables of the pool
  const [immutables, state] = await Promise.all([
    getPoolImmutables(),
    getPoolState(),
  ]);

  // create instances of the Token object to represent the two tokens in the given pool
  const USDC = new Token(1, immutables.token0, 6, 'USDC', 'USD Coin');

  const ETH = new Token(1, immutables.token1, 18, 'ETH', 'Ether');

  // create an instance of the pool object for the given pool
  const poolExample = new Pool(
    USDC,
    ETH,
    immutables.fee,
    state.sqrtPriceX96.toString(), //note the description discrepancy - sqrtPriceX96 and sqrtRatioX96 are interchangable values
    state.liquidity.toString(),
    state.tick
  );

  // assign an input amount for the swap
  const amountIn = 1500;

  // call the quoter contract to determine the amount out of a swap, given an amount in
  const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(
    immutables.token0,
    immutables.token1,
    immutables.fee,
    amountIn.toString(),
    0
  );

  // create an instance of the route object in order to construct a trade object
  const swapRoute = new Route([poolExample], USDC, ETH);

  // create an unchecked trade instance
  const uncheckedTradeExample = await Trade.createUncheckedTrade({
    route: swapRoute,
    inputAmount: CurrencyAmount.fromRawAmount(USDC, amountIn.toString()),
    outputAmount: CurrencyAmount.fromRawAmount(ETH, quotedAmountOut.toString()),
    tradeType: TradeType.EXACT_INPUT,
  });

  // print the quote and the unchecked trade instance in the console
  console.log('The quoted amount out is', ethers.utils.formatEther(quotedAmountOut), quotedAmountOut.toString());
  console.log('The unchecked trade object is', uncheckedTradeExample);

  console.log('inputAmount', uncheckedTradeExample.inputAmount.toFixed());
  console.log('outputAmount', uncheckedTradeExample.outputAmount.toFixed());

  // console.log('CurrencyAmount.fromRawAmount(TokenA, amountIn.toString())', CurrencyAmount.fromRawAmount(TokenA, amountIn.toString()))

  // console.log('immutables.token0,', immutables.token0);
  // console.log('immutables.token1,', immutables.token1);
  // console.log('immutables.fee,', immutables.fee);
}

main();


modelo historico
modelo live
gas fee

