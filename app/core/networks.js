// @flow
import { MAIN_NETWORK_ID, TEST_NETWORK_ID, COZ_TEST_NETWORK_ID, GOLDI_NETWORK_ID } from './constants'

export const isMainNetwork = (networkId: string) =>
  networkId === MAIN_NETWORK_ID
export const isTestNetwork = (networkId: string) =>
  networkId === TEST_NETWORK_ID
export const isCozNetwork = (networkId: string) =>
  networkId === COZ_TEST_NETWORK_ID
export const isGoldiNetwork = (networkId: string) =>
  networkId === GOLDI_NETWORK_ID

export const getNetworks = () => [
  {
    id: MAIN_NETWORK_ID,
    label: 'MainNet',
    network: 'MainNet'
  },
  {
    id: TEST_NETWORK_ID,
    label: 'TestNet',
    network: 'TestNet'
  },
  {
    id: COZ_TEST_NETWORK_ID,
    label: 'CoZ TestNet',
    network: 'CozNet'
  },
  {
    id: GOLDI_NETWORK_ID,
    label: 'GoldiNet',
    network: 'GoldiNet'
  }
]

export const findNetwork = (networkId: string): NetworkItemType => {
  const networks = getNetworks()
  return networks.find(({ id }) => id === networkId) || networks[0]
}
