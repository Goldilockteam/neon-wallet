
import ClipboardAction from './clipboard-action.js'

import {
  showErrorNotification,
  showSuccessNotification,
  showInfoNotification
} from '../../app/modules/notifications'

export const openExternal = (srcLink: string) => {
  console.log(`opening ${srcLink}`)
  window.open(srcLink)
}

export const shell = {
  openExternal: openExternal
}

// import { clipboard } from 'electron'
  // .writeText(text)

export const clipboard = {
  writeText: (text) => {
    const ca = new ClipboardAction({ text: text, container: document.body })
    ca.destroy()
  }
}

// const { dialog } = require('electron').remote
  // .showSaveDialog
  // .showOpenDialog

export const remote = {
  dialog: {
    showSaveDialog: () => {

      // no wallet file export in web wallet
      showErrorNotification({
        message: 'Wallet export is disabled' })
      cb()

      // TBD if wallet export enabled:
      // 1. read wallet _with_ pkeys from the server
      // 2. FileSaver.js/.saveAs()
      // 3. do not call `cb()`
    },
    showOpenDialog: (cb) => {

      // no wallet file import in web wallet
      showErrorNotification({
        message: 'Wallet import is disabled' })
      cb()

      // TBD if wallet import enabled:
      // 1. show <input type=file/>
      // 2. return the selected path: cb([ fileName ])
      // 3. --> ./fs.js/readFile()
    }
  }
}
