// @flow
import { api, type Claims } from 'neon-js'
import { map, reduce } from 'lodash'

import {
  showErrorNotification,
  showSuccessNotification,
  showInfoNotification
} from './notifications'
import {
  getNetwork,
  getWIF,
  getAddress,
  getSigningFunction,
  getPublicKey,
  getIsHardwareLogin,
  getNEO
} from '../core/deprecated'
import { toBigNumber, toNumber } from '../core/math'
import { ASSETS } from '../core/constants'
import { FIVE_MINUTES_MS } from '../core/time'
import poll from '../util/poll'

const POLL_ATTEMPTS = 30
const POLL_FREQUENCY = 10000

const fetchClaims = async ({ net, address }) => {
  const response = await api.getClaimsFrom({ net, address }, api.neoscan)
  const { claims } = response.claims
  return map(claims, 'claim')
}

const calculateClaimableAmount = (claims: Claims) =>
  reduce(claims, (sum, claim) => claim.plus(sum), 0).toString()

const getClaimableAmount = async ({ net, address }) => {
  const claims = await fetchClaims({ net, address })
  return calculateClaimableAmount(claims)
}

const updateClaimableAmount = async ({
  net,
  address,
  publicKey,
  privateKey,
  signingFunction,
  balance,
  dispatch
}) => {
  const { response } = await api.sendAsset(
    {
      net,
      address,
      publicKey,
      privateKey,
      signingFunction,
      intents: api.makeIntent({ [ASSETS.NEO]: toNumber(balance) }, address),
      approvalMessage: (tx) => {
        if(dispatch) {
          dispatch(
            showInfoNotification({
              message: `Please authorize the Determine Claimable Amount transaction ${tx.hash} on your smartphone (1 of 2)`,
              autoDismiss: 0
            })
          )
        }
      }
    },
    api.neoscan
  )

  if (!response.result || !response.txid) {
    throw new Error('Rejected by RPC server.')
  }

  return response.result.response
}

const pollForUpdatedClaimableAmount = async ({
  net,
  address,
  claimableAmount
}) =>
  poll(
    async () => {
      const updatedClaimableAmount = await getClaimableAmount({ net, address })

      if (toBigNumber(updatedClaimableAmount).eq(claimableAmount)) {
        throw new Error('Waiting for updated claims took too long.')
      }

      return updatedClaimableAmount
    },
    { attempts: POLL_ATTEMPTS, frequency: POLL_FREQUENCY }
  )

const getUpdatedClaimableAmount = async ({
  net,
  address,
  balance,
  publicKey,
  privateKey,
  signingFunction,
  dispatch
}) => {
  const claimableAmount = await getClaimableAmount({ net, address })

  if (toBigNumber(balance).eq(0)) {
    return claimableAmount
  }
  await updateClaimableAmount({
    net,
    address,
    balance,
    publicKey,
    privateKey,
    signingFunction,
    dispatch
  })

  dispatch(showInfoNotification({
    message: 'Polling for updated GAS claimable amount, please wait...',
    autoDismiss: 0
  }))

  return pollForUpdatedClaimableAmount({ net, address, claimableAmount })
}

export const doGasClaim = () => async (
  dispatch: DispatchType,
  getState: GetStateType
) => {
  const state = getState()
  const address = getAddress(state)
  const net = getNetwork(state)
  const balance = getNEO(state)
  const publicKey = getPublicKey(state)
  // const privateKey = getWIF(state)
  const privateKey = null
  const signingFunction = getSigningFunction(state)
  const isHardwareClaim = getIsHardwareLogin(state)

  dispatch(disableClaim(true))

  if (isHardwareClaim) {
    dispatch(
      showInfoNotification({
        message: 'Please sign transaction 1 of 2 on hardware device.'
      })
    )
  } else {
    // dispatch(showInfoNotification({ message: 'Calculating claimable GAS...' }))
  }

  // step 1: update available claims
  try {
    await getUpdatedClaimableAmount({
      net,
      address,
      balance,
      publicKey,
      privateKey,
      signingFunction,
      dispatch
    })
  } catch (err) {
    dispatch(disableClaim(false))
    dispatch(
      showErrorNotification({
        message: `Error calculating claimable GAS: ${err.message}`
      })
    )
    return
  }

  if (isHardwareClaim) {
    dispatch(
      showInfoNotification({
        message: 'Please sign transaction 2 of 2 on hardware device.'
      })
    )
  } else {
    // dispatch(showInfoNotification({ message: 'Claiming GAS...' }))
  }

  // step 2: send claim request
  try {
    let { claims } = await api.getClaimsFrom({ net, address }, api.neoscan)
    if (isHardwareClaim) claims = claims.slice(0, 25)
    const { response } = await api.claimGas(
      { net, address, claims, publicKey, privateKey, signingFunction,
        approvalMessage: (tx) => {
          dispatch(
            showInfoNotification({
              message: `Please authorize the Gas Claim transaction ${tx.hash} on your smartphone (2 of 2)`,
              autoDismiss: 0
            })
          )
        }
      },
      api.neoscan
    )

    if (!response.result) {
      throw new Error('Rejected by RPC server.')
    }
  } catch (err) {
    dispatch(disableClaim(false))
    dispatch(
      showErrorNotification({ message: `Claiming GAS failed: ${err.message}` })
    )
    return
  }

  dispatch(
    showSuccessNotification({
      message:
        'Claim was successful! Your balance will update once the blockchain has processed it.'
    })
  )
  setTimeout(() => dispatch(disableClaim(false)), FIVE_MINUTES_MS)
}

// Constants
export const DISABLE_CLAIM = 'DISABLE_CLAIM'

// Actions
export function disableClaim(disableClaimButton: boolean) {
  return {
    type: DISABLE_CLAIM,
    payload: { disableClaimButton }
  }
}

// State Getters
export const getDisableClaimButton = (state: Object) =>
  state.claim.disableClaimButton

const initialState = {
  disableClaimButton: false
}

export default (state: Object = initialState, action: ReduxAction) => {
  switch (action.type) {
    case DISABLE_CLAIM:
      const { disableClaimButton } = action.payload
      return {
        ...state,
        disableClaimButton
      }
    default:
      return state
  }
}
