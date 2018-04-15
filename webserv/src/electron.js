
// import { clipboard } from 'electron'
  // .writeText(text)

export const clipboard = {
  writeText: (text) => {
  }
}

// const { dialog } = require('electron').remote
  // .showSaveDialog
  // .showOpenDialog

export const remote = {
  dialog: {
    showSaveDialog: () => {
      const fileName = null
      cb()
      // -> ./fs.writeFile
    },
    showOpenDialog: (cb) => {
      const fileName = null
      // cb([ fileName ])
      cb()
      // -> ./fs.readFile
    }
  }
}
