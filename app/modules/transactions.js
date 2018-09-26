// @flow
/* eslint-disable camelcase */
import { api, sc, u, wallet } from 'neon-js'
import { flatMap, keyBy } from 'lodash-es'

import {
  showErrorNotification,
  showInfoNotification,
  showSuccessNotification
} from './notifications'
import {
  getNetwork,
  getWIF,
  getPublicKey,
  getSigningFunction,
  getAddress,
  getIsHardwareLogin,
  getAssetBalances,
  getTokenBalances
} from '../core/deprecated'
import {
  isToken,
  validateTransactionsBeforeSending,
  getTokenBalancesMap
} from '../core/wallet'
import { toNumber } from '../core/math'

const extractTokens = (sendEntries: Array<SendEntryType>) =>
  sendEntries.filter(({ symbol }) => isToken(symbol))

const extractAssets = (sendEntries: Array<SendEntryType>) =>
  sendEntries.filter(({ symbol }) => !isToken(symbol))

const buildIntents = (sendEntries: Array<SendEntryType>) => {
  const assetEntries = extractAssets(sendEntries)
  // $FlowFixMe
  return flatMap(assetEntries, ({ address, amount, symbol }) =>
    api.makeIntent({ [symbol]: toNumber(amount) }, address)
  )
}

const buildTransferScript = (
  net: NetworkType,
  sendEntries: Array<SendEntryType>,
  fromAddress: string,
  tokensBalanceMap: {
    [key: string]: TokenBalanceType
  }
) => {
  const tokenEntries = extractTokens(sendEntries)
  const fromAcct = new wallet.Account(fromAddress)
  const scriptBuilder = new sc.ScriptBuilder()

  tokenEntries.forEach(({ address, amount, symbol }) => {
    const toAcct = new wallet.Account(address)
    const { scriptHash, decimals } = tokensBalanceMap[symbol]
    const args = [
      u.reverseHex(fromAcct.scriptHash),
      u.reverseHex(toAcct.scriptHash),
      sc.ContractParam.byteArray(toNumber(amount), 'fixed8', decimals)
    ]

    scriptBuilder.emitAppCall(scriptHash, 'transfer', args)
  })

  return scriptBuilder.str
}

const makeRequest = (sendEntries: Array<SendEntryType>, config: Object) => {
  const script = buildTransferScript(
    config.net,
    sendEntries,
    config.address,
    config.tokensBalanceMap
  )

  if (script === '') {
    return api.sendAsset(
      { ...config, intents: buildIntents(sendEntries), approvalMessage: sendEntries.approvalMessage },
      api.neoscan
    )
  }
  return api.doInvoke(
    {
      ...config,
      intents: buildIntents(sendEntries),
      script,
      gas: 0,
      approvalMessage: sendEntries.approvalMessage
    },
    api.neoscan
  )
}

export const sendTransaction = ({
  sendEntries,
  fees
}: {
  sendEntries: Array<SendEntryType>,
  fees: number
}) => (dispatch: DispatchType, getState: GetStateType): Promise<*> =>
  new Promise(async (resolve, reject) => {
    const state = getState()
    // const wif = getWIF(state)
    const fromAddress = getAddress(state)
    const net = getNetwork(state)
    const tokenBalances = getTokenBalances(state)
    const tokensBalanceMap = keyBy(tokenBalances, 'symbol')
    const balances = {
      ...getAssetBalances(state),
      ...getTokenBalancesMap(tokenBalances)
    }
    const signingFunction = getSigningFunction(state)
    const publicKey = getPublicKey(state)
    const isHardwareSend = getIsHardwareLogin(state)

    const rejectTransaction = (message: string) =>
      dispatch(showErrorNotification({ message }))

    const error = validateTransactionsBeforeSending(balances, sendEntries)

    if (error) {
      rejectTransaction(error)
      return reject(error)
    }

    dispatch(
      showInfoNotification({
        message: 'Sending Transaction...',
        autoDismiss: 0
      })
    )

    if (isHardwareSend) {
      dispatch(
        showInfoNotification({
          message: 'Please sign the transaction on your hardware device',
          autoDismiss: 0
        })
      )
    }
    else {
      sendEntries.approvalMessage = (tx) => {
        dispatch(
          showInfoNotification({
            message: `Please authorize the transaction ${tx.hash} on your smartphone`,
            autoDismiss: 0
          })
        )
      }
    }

    try {
      const { response } = await makeRequest(sendEntries, {
        net,
        tokensBalanceMap,
        address: fromAddress,
        publicKey,
        // privateKey: new wallet.Account(wif).privateKey,
        signingFunction: isHardwareSend ? signingFunction : null,
        fees
      })

      if (!response.result) {
        throw new Error('Rejected by RPC server.')
      }

      dispatch(
        showSuccessNotification({
          message:
            'Transaction complete! Your balance will automatically update when the blockchain has processed it.'
        })
      )

      return resolve(response)
    } catch (err) {
      rejectTransaction(`Transaction failed: ${err.message}`)
      return reject(err)
    }
  })
