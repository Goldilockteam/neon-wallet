// @flow
import React from 'react'
import { uniqueId } from 'lodash'
import { wallet } from 'neon-js'
import {
  toNumber,
  toBigNumber,
  multiplyNumber,
  minusNumber
} from '../../core/math'

import { isBlacklisted } from '../../core/wallet'

import SendPageHeader from '../../components/Send/SendPageHeader'
import SendAmountsPanel from '../../components/Send/SendAmountsPanel'
import SendPanel from '../../components/Send/SendPanel'
import styles from './Send.scss'

type Props = {
  sendableAssets: Object,
  prices: Object,
  sendTransaction: (Array<SendEntryType>) => Object,
  contacts: Object,
  currencyCode: string,
  address: string,
  loading: boolean,
  loadWalletData: Function
}

type State = {
  showConfirmSend: boolean,
  sendSuccess: boolean,
  sendError: boolean,
  sendErrorMessage: string,
  txid: string,
  sendRowDetails: Array<Object>,
  address?: string
}

export default class Send extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      showConfirmSend: false,
      sendSuccess: false,
      sendError: false,
      sendErrorMessage: '',
      txid: '',
      sendRowDetails: []
    }
  }

  componentDidMount() {
    this.setState((prevState: Object) => {
      const newState = [...prevState.sendRowDetails]

      newState.push(this.generateRow())

      return { sendRowDetails: newState }
    })
  }

  generateRow = () => {
    const { sendableAssets } = this.props
    const sendableAssetNames = Object.keys(sendableAssets)
    const firstSendableAssetName = sendableAssetNames[0]

    if (sendableAssetNames.length > 0) {
      return {
        asset: firstSendableAssetName,
        amount: 0,
        address: '',
        max: this.calculateMaxValue(firstSendableAssetName),
        id: uniqueId(),
        errors: {}
      }
    }
    return {}
  }

  createSendAmountsData = () => {
    const { sendableAssets, prices } = this.props
    const { showConfirmSend, sendSuccess, sendRowDetails } = this.state

    let assets = Object.keys(sendableAssets)

    if (showConfirmSend || sendSuccess) {
      assets = (assets.filter((asset: string) =>
        sendRowDetails
          .reduce(
            (accumulator: Array<*>, row: Object) =>
              accumulator.concat(row.asset),
            []
          )
          .includes(asset)
      ): Array<*>)
    }

    return (assets
      .filter((asset: string) => !!prices[asset])
      .map((asset: string) => {
        const { balance } = sendableAssets[asset]
        const currentBalance = minusNumber(
          balance,
          this.calculateRowAmounts(asset)
        )
        const price = prices[asset]

        const totalBalanceWorth = multiplyNumber(balance, price)
        const remainingBalanceWorth = multiplyNumber(currentBalance, price)

        return {
          symbol: asset,
          totalBalance: balance,
          price,
          currentBalance,
          totalBalanceWorth,
          remainingBalanceWorth
        }
      }): Array<*>)
  }

  removeRow = (index: number) => {
    this.setState((prevState: Object) => {
      const newState = [...prevState.sendRowDetails]

      if (newState.length > 1) {
        newState.splice(index, 1)
      }
      return { sendRowDetails: newState }
    })
  }

  addRow = () => {
    this.setState((prevState: Object) => {
      const newState = [...prevState.sendRowDetails]

      if (newState.length < 5) {
        newState.push(this.generateRow())

        return { sendRowDetails: newState }
      }
    })
  }

  updateRowField = (index: number, field: string, value: string) => {
    this.setState((prevState: Object) => {
      const newState = [...prevState.sendRowDetails]

      const objectToModify = newState[index]

      objectToModify[field] = value

      if (field === 'asset') {
        objectToModify.amount = 0
        const maxValue = this.calculateMaxValue(objectToModify.asset)
        objectToModify.max = maxValue
      }

      if (field === 'amount') {
        const maxValue =
          this.calculateMaxValue(objectToModify.asset) + Number(value)
        objectToModify.max = maxValue
      }

      return { sendRowDetails: newState }
    })
  }

  calculateMaxValue = (asset: string) => {
    const { sendableAssets } = this.props

    const existingAmounts = this.calculateRowAmounts(asset)

    if (sendableAssets[asset]) {
      return minusNumber(sendableAssets[asset].balance, existingAmounts)
    }
    return 0
  }

  calculateRowAmounts = (asset: string) => {
    const rows = [...this.state.sendRowDetails]

    if (rows.length > 0) {
      return (rows
        .filter((row: Object) => row.asset === asset)
        .map((row: Object) => row.amount)
        .reduce(
          (accumulator: Object, currentValue: number | void) =>
            accumulator.plus(currentValue || 0),
          toBigNumber(0)
        ): number)
    }
    return 0
  }

  resetViews = () => {
    this.setState(() => {
      const newState = []

      newState.push(this.generateRow())

      return {
        showConfirmSend: false,
        sendSuccess: false,
        sendRowDetails: newState
      }
    })
  }

  handleSubmit = (event: Object) => {
    event.preventDefault()
    const rows = [...this.state.sendRowDetails]
    const promises = rows.map((row: Object, index: number) =>
      this.validateRow(row, index)
    )

    Promise.all(promises).then(values => {
      const isValid = values.every((result: boolean) => result)

      if (isValid) {
        this.setState({ showConfirmSend: true })
      }
    })
  }

  handleSend = (event: Object) => {
    event.preventDefault()
    const { sendTransaction } = this.props
    const { sendRowDetails } = this.state

    const entries = sendRowDetails.map((row: Object) => ({
      address: row.address,
      amount: toNumber(row.amount),
      symbol: row.asset
    }))

    sendTransaction(entries)
      .then((result: Object) => {
        this.setState({ sendSuccess: true, txid: result.txid })
      })
      .catch((error: Object) => {
        this.setState({ sendError: true, sendErrorMessage: error.message })
      })
  }

  handleEditRecipientsClick = () => this.setState({ showConfirmSend: false })

  validateRow = async (row: Object, index: number) => {
    const validAmount = this.validateAmount(
      row.amount,
      row.max,
      row.asset,
      index
    )
    const validAddress = await this.validateAddress(row.address, index)

    return validAmount && validAddress
  }

  validateAmount = (
    amount: number,
    max: number,
    asset: string,
    index: number
  ) => {
    const { errors } = this.state.sendRowDetails[index]

    const amountNum = Number(amount)

    if (typeof amountNum !== 'number') {
      errors.amount = 'Amount must be a number.'
    }

    if (asset === 'NEO' && !toBigNumber(amountNum).isInteger()) {
      errors.amount = 'You cannot send fractional amounts of NEO.'
    }

    if (amountNum < 0) {
      errors.amount = `You cannot send negative amounts of ${asset}.`
    }

    if (amountNum === 0) {
      errors.amount = `Can not send 0 ${asset}.`
    }

    if (amountNum > max) {
      errors.amount = `You do not have enough balance to send ${amount} ${asset}.`
    }

    if (errors.amount) {
      this.updateRowField(index, 'errors', errors)
      return false
    }
    return true
  }

  validateAddress = async (formAddress: string, index: number) => {
    const { address } = this.props
    const { errors } = this.state.sendRowDetails[index]

    if (!wallet.isAddress(formAddress)) {
      errors.address = 'You need to specify a valid NEO address.'
    }

    if (formAddress === address) {
      // eslint-disable-next-line quotes
      errors.address = "You can't send to your own address."
    }

    const blackListedAddress = await isBlacklisted(formAddress)
    if (blackListedAddress) {
      errors.address =
        'Address is blacklisted. This is a known phishing address.'
    }

    if (errors.address) {
      this.updateRowField(index, 'errors', errors)
      return false
    }

    return true
  }

  clearErrors = (index: number, field: string) => {
    this.setState((prevState: Object) => {
      const newState = [...prevState.sendRowDetails]

      const objectToClear = newState[index]
      if (objectToClear.errors[field]) {
        objectToClear.errors[field] = null
      }

      return newState
    })
  }

  resetViewsAfterError = () =>
    this.setState({ sendError: false, sendErrorMessage: '' })

  render() {
    const {
      sendRowDetails,
      showConfirmSend,
      sendSuccess,
      sendError,
      sendErrorMessage,
      txid
    } = this.state
    const {
      sendableAssets,
      contacts,
      currencyCode,
      loading,
      loadWalletData
    } = this.props
    const noSendableAssets = Object.keys(sendableAssets).length === 0

    return (
      <section className={styles.sendContainer}>
        <SendPageHeader loading={loading} loadWalletData={loadWalletData} />
        {!noSendableAssets && (
          <SendAmountsPanel
            sendAmountsData={this.createSendAmountsData()}
            currencyCode={currencyCode}
          />
        )}
        <SendPanel
          sendRowDetails={sendRowDetails}
          sendableAssets={sendableAssets}
          showConfirmSend={showConfirmSend}
          sendSuccess={sendSuccess}
          sendError={sendError}
          sendErrorMessage={sendErrorMessage}
          noSendableAssets={noSendableAssets}
          contacts={contacts}
          txid={txid}
          addRow={this.addRow}
          removeRow={this.removeRow}
          updateRowField={this.updateRowField}
          clearErrors={this.clearErrors}
          handleSubmit={this.handleSubmit}
          resetViewsAfterError={this.resetViewsAfterError}
          handleEditRecipientsClick={this.handleEditRecipientsClick}
          handleSend={this.handleSend}
          resetViews={this.resetViews}
        />
      </section>
    )
  }
}
