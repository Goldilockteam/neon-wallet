// @flow
import { map, isEmpty } from 'lodash'
import axios from 'axios'

import { toBigNumber } from './math'
import { COIN_DECIMAL_LENGTH } from './formatters'
import {
  TOKENS,
  TOKENS_TEST,
  TOKENS_GOLDI,
  // MAIN_NETWORK_ID,
  TEST_NETWORK_ID//,
  // GOLDI_NETWORK_ID
} from './constants'

let fetchedTokens

export const adjustDecimalAmountForTokenTransfer = (value: string): string =>
  toBigNumber(value)
    .times(10 ** COIN_DECIMAL_LENGTH)
    .round()
    .toNumber()

const getTokenEntry = ((): Function => {
  let id = 1
  return (
    symbol: string,
    scriptHash: string,
    networkId: string,
    image: string,
    name: string
  ) => ({
    id: `${id++}`, // eslint-disable-line no-plusplus
    symbol,
    scriptHash,
    networkId,
    isUserGenerated: false,
    image,
    name
  })
})()

export const getDefaultTokens = async (): Promise<Array<TokenItemType>> => {
  const tokens = []
  /*
  // Prevent duplicate requests here
  if (!fetchedTokens) {
    const response = await axios
      // use a time stamp query param to prevent caching
      .get(
        `https://raw.githubusercontent.com/CityOfZion/neo-tokens/master/tokenList.json?timestamp=${new Date().getTime()}`
      )
      .catch(error => {
        console.error('Falling back to hardcoded list of NEP5 tokens!', error)
        // if request to gh fails use hardcoded list
        fetchedTokens = TOKENS
      })
    if (response && response.data && !isEmpty(response.data)) {
      fetchedTokens = response.data
    } else {
      fetchedTokens = TOKENS
    }
  }

  tokens.push(
    ...map(fetchedTokens, tokenData =>
      getTokenEntry(
        tokenData.symbol,
        tokenData.networks['1'].hash,
        MAIN_NETWORK_ID,
        tokenData.image,
        tokenData.networks['1'].name
      )
    )
  )
  */
  tokens.push(
    ...map(TOKENS_TEST, (scriptHash, symbol) =>
      getTokenEntry(symbol, scriptHash, TEST_NETWORK_ID)
    )
  )
  /*
  tokens.push(
    ...map(TOKENS_GOLDI, (scriptHash, symbol) =>
      getTokenEntry(symbol, scriptHash, GOLDI_NETWORK_ID)
    )
  )
  */

  return tokens
}
