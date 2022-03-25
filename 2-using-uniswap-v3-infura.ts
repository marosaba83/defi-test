// Creating a Pool Instance
// https://docs.uniswap.org/sdk/guides/creating-a-pool

import { ethers } from 'ethers';
import { Pool } from '@uniswap/v3-sdk';
import { Token } from '@uniswap/sdk-core';
import { abi as IUniswapV3PoolABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { addSyntheticLeadingComment, getAllJSDocTagsOfKind } from 'typescript';

const provider = new ethers.providers.JsonRpcProvider(
  'https://mainnet.infura.io/v3/8496fe61720c4bb0bd280c68c7be2fdb'
);

const poolAddress = '0xcbcdf9626bc03e24f779434178a73a0b4bad62ed';

const poolContract = new ethers.Contract(
  poolAddress,
  IUniswapV3PoolABI,
  provider
);

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
  const [immutables, state] = await Promise.all([
    getPoolImmutables(),
    getPoolState(),
  ]);

  const WBTC = new Token(3, immutables.token0, 8, 'WBTC', 'Wrapped BTC');

  const ETH = new Token(3, immutables.token1, 18, 'ETH', 'Ether');

  const WBTC_ETH_POOL = new Pool(
    WBTC,
    ETH,
    immutables.fee,
    state.sqrtPriceX96.toString(),
    state.liquidity.toString(),
    state.tick
  );

  const token0Price = WBTC_ETH_POOL.token0Price;
  const token1Price = WBTC_ETH_POOL.token1Price;

  // console.log('poolExample', WBTC_ETH_POOL);

  console.log('token0Price', token0Price);
  console.log('token1Price', token1Price);

}

main();
