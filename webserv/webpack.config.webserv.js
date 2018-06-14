
'use strict'

const path = require('path')
const webpack = require('webpack')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
const _ = require('lodash')

const req = 'production' === process.env.NODE_ENV ?
  '../config/webpack.config.prod' :
  '../config/webpack.config.dev'

console.log(`using config: ${req}`)

module.exports = require(req)

module.exports.output.path =
  path.join(__dirname, 'deploy', 'www')

// remove node-hid dependency; we use WebUSB
module.exports.externals = undefined

module.exports.target = 'web'

module.exports.plugins.unshift(
  new webpack.NormalModuleReplacementPlugin(
    // .get .set
    // +getStorage, +setStorage
    // 'userWallet', 'addressBook', 'settings'
    /^electron-json-storage$/,
    path.join(__dirname, 'src', 'electron-json-storage.js')
  ),
  new webpack.NormalModuleReplacementPlugin(
    // .writeFile .readFile
    /^fs$/,
    path.join(__dirname, 'src', 'fs.js')
  ),
  new webpack.NormalModuleReplacementPlugin(
    // export const openExternal = (srcLink: string)
    /^\.\/electron$/,
    path.join(__dirname, 'src', 'dot-electron.js')
  ),
  new webpack.NormalModuleReplacementPlugin(
    // clipboard.writeText(text)
    // remote.dialog .showSaveDialog .showOpenDialog
    /^electron$/,
    path.join(__dirname, 'src', 'electron.js')
  ),
  new webpack.NormalModuleReplacementPlugin(
    // ledger
    /^@ledgerhq\/hw-transport-node-hid$/,
    path.join(__dirname, 'node_modules', '@ledgerhq/hw-transport-u2f')
  ),
  new webpack.NormalModuleReplacementPlugin(
    // httpsOnly, signTx
    /^neon-js$/,
    path.join(__dirname, 'node_modules', '@cityofzion/neon-js')
    // __dirname + '/../../neon-js'
  )
)

// dev
// _.remove(module.exports.plugins, v => v instanceof UglifyJSPlugin)
