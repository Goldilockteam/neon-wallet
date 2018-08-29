// @flow
import React, { Component } from 'react'
import classNames from 'classnames'

import TextInput from '../../components/Inputs/TextInput'
import Button from '../../components/Button'
import CopyToClipboard from '../../components/CopyToClipboard'
import { ROUTES } from '../../core/constants'
import styles from './DisplayWalletAccounts.scss'
import FullHeightPanel from '../../components/Panel/FullHeightPanel'
import CloseButton from '../../components/CloseButton'
import BackButton from '../../components/BackButton'
import AddIcon from '../../assets/icons/add.svg'
import CheckIcon from '../../assets/icons/check.svg'
import DialogueBox from '../../components/DialogueBox'
import WarningIcon from '../../assets/icons/warning.svg'

type Props = {
  walletName: string,
  address: string,
  wif: string,
  passphrase: string,
  isImport: boolean,
  authenticated: boolean
}

class DisplayWalletAccounts extends Component<Props> {
  publicCanvas: ?HTMLCanvasElement

  encryptedCanvas: ?HTMLCanvasElement

  privateCanvas: ?HTMLCanvasElement

  render() {
    const {
      passphrase,
      address,
      wif,
      walletName,
      isImport,
      authenticated
    } = this.props
    const fields = [
      { label: 'Passphrase', value: passphrase },
      { label: 'Private Key', value: wif },
      { label: 'Public Address', value: address }
    ]
    if (walletName) {
      fields.unshift({ label: 'Wallet Name', value: walletName })
    }
    const conditionalPanelProps = {}
    if (authenticated) {
      conditionalPanelProps.renderBackButton = () => (
        <BackButton routeTo={ROUTES.WALLET_MANAGER} />
      )
      conditionalPanelProps.renderCloseButton = () => (
        <CloseButton routeTo={ROUTES.DASHBOARD} />
      )
    } else {
      conditionalPanelProps.renderCloseButton = () => (
        <CloseButton routeTo={ROUTES.HOME} />
      )
    }
    return (
      <FullHeightPanel
        headerText={isImport ? 'Wallet Imported!' : 'Wallet Created!'}
        renderInstructions={false}
        headerContainerClassName={styles.headerIconMargin}
        renderHeaderIcon={() => <CheckIcon />}
        {...conditionalPanelProps}
        iconColor="#F7BC33"
      >
        <div id="newWallet" className={styles.newWalletContainer}>
          <DialogueBox
            icon={<WarningIcon />}
            renderText={() => (
              <div className={styles.saveDetails}>
                {/*
                <div>
                  <b>Save these details!</b> If you lose these credentials,{' '}
                </div>
                <div>you lose access to your assets.</div>
                */}
                <b>IMPORTANT - READ CAREFULLY:</b><br/>
                After you press Save Account, your encrypted private key will be stored and protected by Goldilock.<br/>
                Make sure to backup the passphrase, as your passphrase will never be stored by Goldilock, and if you lose it, Goldilock will not be able do decrypt your private key and you will lose access to your assets.<br/>
                You can also save and backup the private key yourself, but Goldilock cannot protect and cannot be held accountable for key copies saved externally. Therefore, if you decide to backup your encrypted private key, choose your physical backup location very carefuly.
                A backed-up encrypted private key, along with the passphrase, can be used to log into any stock Neon Wallet. This should only ever be done in the case of Goldilock not being able to provide its services anymore.<br/>
                <b>IMPORTANT:</b> Verify that you can log in to the account and see the correct public address before sending anything to the address below!
              </div>
            )}
            className={styles.displayWalletAccountsDialogue}
          />
          <div className={styles.detailsContainer}>
            {fields.map(item => (
              <div key={item.label} className={styles.detailRow}>
                <div
                  className={classNames(styles.input, {
                    [styles.reducedInputFontSize]: item.label === 'Private Key'
                  })}
                >
                  <TextInput label={item.label} value={item.value} disabled />
                </div>
                <CopyToClipboard
                  className={styles.clipboardCopy}
                  text={item.value}
                  tooltip={`Copy ${item.label}`}
                />
              </div>
            ))}
            <div className={styles.buttonContainer}>
              <Button renderIcon={AddIcon} primary onClick={this.handlePrint}>
                Print
              </Button>
            </div>
          </div>
        </div>
      </FullHeightPanel>
    )
  }

  handlePrint = () => {
    window.print()
  }
}

export default DisplayWalletAccounts
