// @flow
import axios from 'axios'
import { api } from 'neon-js'
import { createActions } from 'spunky'

import { getDefaultTokens } from '../core/nep5'

export const NEO_ID =
  'c56f33fc6ecfcd0c225c4ab356fee59390af8560be0e930faebe74a6daff7c9b'
export const GAS_ID =
  '602c79718b16e442de58778e148d0b1084e3b2dffd5de6b7b16cee7969282de7'

type Props = {
  net: string,
  address: string,
  shouldIncrementPagination: boolean
}

function parseAbstractData(data, currentUserAddress, tokens) {
  const parsedIconType = abstract => {
    if (
      abstract.address_to === currentUserAddress &&
      abstract.address_from !== 'claim'
    )
      return 'RECEIVE'
    if (abstract.address_from === 'claim') return 'CLAIM'
    return 'SEND'
  }

  const parsedAsset = abstract => {
    const token = tokens.find(token => token.scriptHash === abstract.asset)
    if (token) return token
    if (abstract.asset === NEO_ID) {
      return {
        symbol: 'NEO'
      }
    }
    if (abstract.asset === GAS_ID) {
      return {
        symbol: 'GAS'
      }
    }
    return {}
  }

  const parsedTo = abstract => {
    if (abstract.address_to === 'fees') return 'NETWORK FEES'
    if (abstract.address_to === 'mint') return 'MINT TOKENS'
    return abstract.address_to
  }

  const parsedFrom = abstract => {
    if (abstract.address_from === 'mint') return 'MINT TOKENS'
    return abstract.address_from
  }

  return data.map(abstract => {
    const asset = parsedAsset(abstract)
    const iconType = parsedIconType(abstract)
    const summary = {
      to: parsedTo(abstract),
      isNetworkFee: abstract.address_to === 'fees',
      from: parsedFrom(abstract),
      txid: abstract.txid,
      time: abstract.time,
      amount: abstract.amount,
      asset,
      label: iconType === 'CLAIM' ? 'Gas Claim' : asset.symbol,
      iconType,
      id: `_${Math.random()
        .toString(36)
        .substr(2, 9)}`
    }

    return summary
  })
}

export const ID = 'transactionHistory'

// TODO: Refactor to use immutable data types!
// hold entries in memory for infinite scroll
let entries = []
let page = 1
let totalPages
export default createActions(
  ID,
  ({ net, address, shouldIncrementPagination = false }: Props = {}) => async (
    state: Object
  ) => {
    // If refresh action dispatched reset pagination
    // to grab the most recent abstracts
    if (!shouldIncrementPagination) {
      page = 1
    }

    // $FlowFixMe
    const tokens = await getDefaultTokens()
    const endpoint = api.neoscan.getAPIEndpoint(net)
    const { data } = await axios.get(
      `${endpoint}/v1/get_address_abstracts/${address}/${page}`
    )
    totalPages = data.total_pages

    const parsedEntries = parseAbstractData(data.entries, address, tokens)
    page += 1
    if (shouldIncrementPagination) {
      if (page === 1) entries = []
      entries.push(...parsedEntries)
      return entries
    }
    entries = [...parsedEntries]
    return entries
  }
)
