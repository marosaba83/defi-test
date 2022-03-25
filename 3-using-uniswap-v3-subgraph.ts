// https://thegraph.com/hosted-service/subgraph/uniswap/uniswap-v3?query=Example%20query

import Big from 'big.js';
import fetch from 'cross-fetch';
import {
  ApolloClient,
  InMemoryCache,
  gql,
  HttpLink,
} from '@apollo/client/core';

const APIURL = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';

const poolQuery = `
  query {
    pool ( 
      id: "0xcbcdf9626bc03e24f779434178a73a0b4bad62ed"
    ) {
      id
      token0 {id, symbol, name}
      token1 {id, symbol, name}
      token0Price
      token1Price
      volumeToken0
      volumeToken1
      volumeUSD
      feesUSD
    }
  }
`;

const client = new ApolloClient({
  link: new HttpLink({ uri: APIURL, fetch }),
  cache: new InMemoryCache(),
});

client
  .query({
    query: gql(poolQuery),
  })
  .then((data) => {
    // console.log('Subgraph data: ', data)
    // console.log('Subgraph data: ', data.data.pool)

    const token0 = {
      symbol: data.data.pool.token0.symbol,
      name: data.data.pool.token0.name,
      price: data.data.pool.token0Price,
    }

    const token1 = {
      symbol: data.data.pool.token1.symbol,
      name: data.data.pool.token1.name,
      price: data.data.pool.token1Price,
    }

    console.log(
      `Block: 1111111111 || Price ${token0.symbol}/${token1.symbol}: ${token0.price.toString()} || Fee: ${data.data.pool.feesUSD}`
    );
    console.log(
      `Block: 2222222222 || Price ${token1.symbol}/${token0.symbol}: ${token1.price.toString()} || Fee: ${data.data.pool.feesUSD}`
    );
  })
  .catch((err) => {
    console.log('Error fetching data: ', err);
  });
