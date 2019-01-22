// @flow
import { openExternal } from './electron'
import { EXPLORERS } from './constants'
import { isMainNetwork } from './networks'

const { NEO_SCAN, NEO_TRACKER, ANT_CHAIN } = EXPLORERS

export const getExplorerBaseURL = (
  networkId: string,
  explorer: ExplorerType
) => {
  const isMainNet = isMainNetwork(networkId)
  switch (explorer) {
    case NEO_TRACKER: {
      return isMainNet
        ? 'https://neotracker.io'
        : 'https://testnet.neotracker.io'
    }
    case NEO_SCAN: {
      if (isGoldiNetwork(networkId))
        return 'https://neo.goldilock.com'
      return isMainNet ? 'https://neoscan.io' : 'https://neoscan-testnet.io'
    }
    case ANT_CHAIN: {
      return isMainNet ? 'http://antcha.in' : 'http://testnet.antcha.in'
    }
    default:
      throw new Error(`Unknown explorer ${explorer}`)
  }
}

export const getExplorerTxLink = (
  networkId: string,
  explorer: ExplorerType,
  txId: string
) => {
  const baseURL = getExplorerBaseURL(networkId, explorer)

  switch (explorer) {
    case NEO_TRACKER:
      return `${baseURL}/tx/${txId}`
    case NEO_SCAN:
      return `${baseURL}/transaction/${txId}`
    case ANT_CHAIN:
      return `${baseURL}/tx/hash/0x${txId}`
    default:
      throw new Error(`Unknown explorer ${explorer}`)
  }
}

export const getExplorerAddressLink = (
  networkId: string,
  explorer: ExplorerType,
  address: string
) => {
  // TMPFIX: hard-set to neo-scan bc default-setting
  // doesn't seem to work yet
  explorer = EXPLORERS.NEO_SCAN

  const baseURL = getExplorerBaseURL(networkId, explorer)

  switch (explorer) {
    case NEO_TRACKER:
      return `${baseURL}/address/${address}`
    case NEO_SCAN:
      return `${baseURL}/address/${address}/1`
    case ANT_CHAIN:
      return `${baseURL}/address/info/${address}`
    default:
      throw new Error(`Unknown explorer ${explorer}`)
  }
}

export const getExplorerAssetLink = (
  networkId: string,
  explorer: ExplorerType,
  assetId: string
) => {
  const baseURL = getExplorerBaseURL(networkId, explorer)
  switch (explorer) {
    case NEO_TRACKER:
    case NEO_SCAN:
      return `${baseURL}/asset/${assetId}`
    case ANT_CHAIN:
      return `${baseURL}/assets/hash/${assetId}`
    default:
      throw new Error(`Unknown explorer ${explorer}`)
  }
}

export const openExplorerTx = (
  networkId: string,
  explorer: ExplorerType,
  txId: string
) => openExternal(getExplorerTxLink(networkId, explorer, txId))

export const openExplorerAddress = (
  networkId: string,
  explorer: ExplorerType,
  address: string
) => openExternal(getExplorerAddressLink(networkId, explorer, address))

export const openExplorerAsset = (
  networkId: string,
  explorer: ExplorerType,
  assetId: string
) => openExternal(getExplorerAssetLink(networkId, explorer, assetId))
