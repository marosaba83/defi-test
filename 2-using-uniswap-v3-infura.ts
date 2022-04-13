// Creating a Pool Instance
// https://docs.uniswap.org/sdk/guides/creating-a-pool

import { BigNumber, Contract, ethers } from 'ethers';
import { Pool, Route, Trade } from '@uniswap/v3-sdk';
import { AlphaRouter } from '@uniswap/smart-order-router';
import {
  Price,
  CurrencyAmount,
  Token,
  TradeType,
  Currency,
  Percent,
} from '@uniswap/sdk-core';
import { abi as IUniswapV3PoolABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { abi as QuoterABI } from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json';
import { formatEther, formatUnits } from 'ethers/lib/utils';

const provider = new ethers.providers.JsonRpcProvider(
  'https://mainnet.infura.io/v3/8496fe61720c4bb0bd280c68c7be2fdb'
);

const router = new AlphaRouter({ chainId: 1, provider });

// https://docs.ethers.io/v4/api-providers.html#:~:text=The%20frequency%20(in,your%20API%20calls.
provider.pollingInterval = 10000;

const poolAddress = '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640';

const poolContract: Contract = new Contract(
  poolAddress,
  IUniswapV3PoolABI,
  provider
);

const quoterAddress = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';

const quoterContract = new ethers.Contract(quoterAddress, QuoterABI, provider);

const V3_SWAP_ROUTER_ADDRESS = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';

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

async function getPool() {
  const [immutables, state] = await Promise.all([
    getPoolImmutables(),
    getPoolState(),
  ]);

  /**
   * ChainID -- 1 o 3 ??
   * segun https://chainlist.org/
   * es 1
   * segun https://docs.uniswap.org/sdk/guides/creating-a-pool
   * es 3
   * pero funciona con ambas
   */
  const USDC = new Token(1, immutables.token0, 6, 'USDC', 'USD Coin');

  const ETH = new Token(1, immutables.token1, 18, 'ETH', 'Ether');

  const USDC_ETH_POOL = new Pool(
    USDC,
    ETH,
    immutables.fee,
    state.sqrtPriceX96.toString(),
    state.liquidity.toString(),
    state.tick
  );

  const amountOneThousend = 100000;
  const amountTenThousend = 10000;
  const amountUndredThousend = 100000;
  const amountMillion = 1000000;

  // call the quoter contract to determine the amount out of a swap, given an amount in
  const quoteOneThousendOut =
    await quoterContract.callStatic.quoteExactInputSingle(
      immutables.token0,
      immutables.token1,
      immutables.fee,
      amountOneThousend.toString(),
      0
    );

  // create an instance of the route object in order to construct a trade object
  const swapRoute = new Route([USDC_ETH_POOL], USDC, ETH);

  // create an unchecked trade instance
  const uncheckedTradeExample = await Trade.createUncheckedTrade({
    route: swapRoute,
    inputAmount: CurrencyAmount.fromRawAmount(
      USDC,
      amountOneThousend.toString()
    ),
    outputAmount: CurrencyAmount.fromRawAmount(
      ETH,
      quoteOneThousendOut.toString()
    ),
    tradeType: TradeType.EXACT_INPUT,
  });

  //

  // const typedValueParsed = '1';

  const wethAmount = CurrencyAmount.fromRawAmount(ETH, 1);

  const route = await router.route(wethAmount, USDC, TradeType.EXACT_INPUT, {
    recipient: '0xaEFd7f5275fe45B8ce3C6d1DDEEcEd2f20DfB984',
    slippageTolerance: new Percent(5, 100),
    deadline: Math.floor(Date.now() / 1000 + 1800),
  });

  // const transaction = {
  //   data: route.methodParameters.calldata,
  //   to: V3_SWAP_ROUTER_ADDRESS,
  //   value: BigNumber.from(route.methodParameters.value),
  //   from: MY_ADDRESS,
  //   gasPrice: BigNumber.from(route.gasPriceWei),
  // };

  // await web3Provider.sendTransaction(transaction);

  return { USDC_ETH_POOL, uncheckedTradeExample, route };
}

async function main() {
  let lastToken0Price = '-1';
  let lastToken1Price = '-1';

  const wait = 5000;

  // clearInterval(intervalId)

  // With Debounce
  const intervalId = setInterval(async () => {
    const poolData = await getPool();

    const pool = poolData.USDC_ETH_POOL;
    const trade = poolData.uncheckedTradeExample;
    const route = poolData.route;

    console.log(new Date().toLocaleString());

    console.log(
      'pool Change',
      ' | ',
      pool.token0.name,
      pool.token0Price.toFixed(7),
      ' | ',
      pool.token1.name,
      pool.token1Price.toFixed(2),
      ' | ',
      'pool Tick',
      pool.tickCurrent,

      '\n',
      ' | ',
      'trade 1000 - input amount',
      trade.inputAmount.toFixed(6),
      ' | ',
      'trade 1000 - output amount',
      trade.outputAmount.toFixed(6),
      ' | ',
      'trade 1000 - execution price',
      trade.executionPrice.toFixed(6),
      ' | ',
      'trade 1000 - price impact',
      trade.priceImpact.toFixed(6),

      '\n',
      ' | ',
      'quote Exact In',
      route.quote.toFixed(2),
      ' | ',
      'gas adjusted quote In',
      route.quoteGasAdjusted.toFixed(2),
      ' | ',
      'gas used USD',
      route.estimatedGasUsedUSD.toFixed(6),

      ' | ',
      'fee',
      pool.fee
    );
  }, wait);

  // poolContract.on(
  //   'Swap',
  //   async (
  //     sender,
  //     recipient,
  //     amount0: BigNumber,
  //     amount1: BigNumber,
  //     sqrtPriceX96: BigNumber,
  //     liquidity,
  //     tick
  //   ) => {
  //     const pool = (await getPool()).USDC_ETH_POOL;
  //     const trade = (await getPool()).uncheckedTradeExample;
  //     const route = (await getPool()).route;

  //     // const Q96 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(96));
  //     // const Q192 = JSBI.exponentiate(Q96, JSBI.BigInt(2));
  //     // const poolPrice = new Price(
  //     //   pool.token0,
  //     //   pool.token1,
  //     //   Q192,
  //     //   JSBI.multiply(sqrtPriceX96, sqrtPriceX96)
  //     // );

  //     if (
  //       lastToken0Price !== pool.token0Price.toFixed(pool.token0.decimals) ||
  //       lastToken1Price !== pool.token1Price.toFixed(pool.token1.decimals)
  //     ) {
  //       console.log(
  //         'Pool Change | ',
  //         new Date(Date.now()).toISOString(),
  //         ' | ',
  //         pool.token0.name,
  //         pool.token0Price.toFixed(7),
  //         ' | ',
  //         pool.token1.name,
  //         pool.token1Price.toFixed(2),
  //         ' | ',
  //         'Token0',
  //         formatUnits(amount0, pool.token0.decimals),
  //         ' | ',
  //         'Token1',
  //         formatUnits(amount1, pool.token1.decimals),
  //         // '\n',

  //         ' | ',
  //         'Pool Tick',
  //         pool.tickCurrent,
  //         ' | ',
  //         'Swap Tick',
  //         tick,

  //         '\n',
  //         ' | ',
  //         'trade 1000 - input amount',
  //         trade.inputAmount.toFixed(6),
  //         ' | ',
  //         'trade 1000 - output amount',
  //         trade.outputAmount.toFixed(6),
  //         ' | ',
  //         'trade 1000 - execution price',
  //         trade.executionPrice.toFixed(6),
  //         ' | ',
  //         'trade 1000 - price impact',
  //         trade.priceImpact.toFixed(6),
  //         // ' | ',
  //         // 'trade 1000 - min amount slippage tolerance',
  //         // trade.minimumAmountOut.toString(),
  //         // ' | ',
  //         // 'trade 1000 - min amount slippage tolerance',
  //         // trade.maximumAmountIn.toString(),

  //         '\n',
  //         ' | ',
  //         'Quote Exact In',
  //         route.quote.toFixed(2),
  //         ' | ',
  //         'Gas Adjusted Quote In:',
  //         route.quoteGasAdjusted.toFixed(2),
  //         ' | ',
  //         'Gas Used USD:',
  //         route.estimatedGasUsedUSD.toFixed(6),

  //         // ' | ',
  //         // 'Token0/Token1',
  //         // formatUnits(amount0.div(amount1), pool.token0.decimals).toString(),
  //         // ' | ',
  //         // 'Token1/Token0',
  //         // formatUnits(amount1.div(amount0), pool.token1.decimals).toString(),
  //         // ' | ',
  //         // 'Token0*Token1',
  //         // formatUnits(amount0.mul(amount1), pool.token1.decimals).toString(),
  //         ' | ',
  //         'Fee',
  //         pool.fee
  //       );

  //       lastToken0Price = pool.token0Price.toFixed(pool.token0.decimals);
  //       lastToken1Price = pool.token1Price.toFixed(pool.token1.decimals);
  //     }
  //   }
  // );
}

main();
