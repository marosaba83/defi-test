// https://github.com/RudreshVeerkhare/UniswapPriceMonitor

// https://defichain-value.com/d/pT8gjGInk/02-arbitrage-calculator?orgId=1&var-Exchange=DEX&var-Trade_Pair=All&var-Amount=1000%20DFI&var-query1=&var-Codes=ZB

import Web3 from 'web3';
import Big from 'big.js';
import IUniswapV2Pair from './IUniswapV2Pair.json';
import { AbiItem } from 'web3-utils';

Big.DP = 50;

const WSS_URL ='wss://mainnet.infura.io/ws/v3/8496fe61720c4bb0bd280c68c7be2fdb';
const web3Wss = new Web3(WSS_URL);

const PAIR_ADDR = '0xbb2b8038a1640196fbe3e38816f3e67cba72d940';
const TOKEN_0 = 'WBTC'
const TOKEN_1 = 'ETH';

// reserve state
let state = {
  blockNumber: undefined,
  token0: undefined,
  token1: undefined,
  fee: undefined,
};

const updateState = (data) => {
  // console.log('updateState', data);

  // update state
  state.token0 = Big(data.returnValues.reserve0);
  state.token1 = Big(data.returnValues.reserve1);
  state.blockNumber = data.blockNumber;
  // state.fee = data.fee;

  // calculate price and print
  console.log(
    `Block: ${state.blockNumber} || Price ${TOKEN_0}/${TOKEN_1}: ${state.token0.div(state.token1).toString()} || Fee: ${state.fee}`
  );
  console.log(
    `Block: ${state.blockNumber} || Price ${TOKEN_1}/${TOKEN_0}: ${state.token1.div(state.token0).toString()} || Fee: ${state.fee}`
  );
};

const PairContractWSS = new web3Wss.eth.Contract(
  IUniswapV2Pair.abi as AbiItem[],
  PAIR_ADDR
);

// function to get reserves
const getReserves = async (ContractObj) => {
  // call getReserves function of Pair contract
  const _reserves = await ContractObj.methods.getReserves().call();

  // return data in Big Number
  return [Big(_reserves.reserve0), Big(_reserves.reserve1)];
};

const mainWSS = async () => {
  // fetch current state of reserves
  [state.token0, state.token1] = await getReserves(PairContractWSS);

  // get current block number
  state.blockNumber = await web3Wss.eth.getBlockNumber();
  // state.fee = await web3Wss.eth.estimateGas({ from: PAIR_ADDR });

  // subscribe to Sync event of Pair
  // PairContractWSS.events.Sync({}).on('data', (data) => {
  //   console.log('data', data);
  //   updateState(data)
  // });
  
  // PairContractWSS.events.allEvents({}).on('event', (event) => console.log('event', event))
  PairContractWSS.events.allEvents({}, e => console.log('event', e))

  // calculate price and print
  console.log(
    `Block: ${state.blockNumber} || Price ${TOKEN_0}/${TOKEN_1}: ${state.token0.div(state.token1).toString()} || Fee: ${state.fee}`
  );
  console.log(
    `Block: ${state.blockNumber} || Price ${TOKEN_1}/${TOKEN_0}: ${state.token1.div(state.token0).toString()} || Fee: ${state.fee}`
  );
};

mainWSS();
