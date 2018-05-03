
// !node_modules,!__e2e__,!__mocks__,!__tests__,!coverage,!flow-typed,!bundle.js

'use strict'

const path = require('path')
const webpack = require('webpack')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
const _ = require('lodash')

module.exports = require('../config/webpack.config.prod')

module.exports.output.path =
  path.join(__dirname, 'deploy', 'www')

// remove node-hid dependency; we use WebUSB
module.exports.externals = undefined

module.exports.target = 'web'

module.exports.plugins.unshift(
  new webpack.NormalModuleReplacementPlugin(
    /^electron-json-storage$/,
    path.join(__dirname, 'src', 'electron-json-storage.js')
    // .get .set
    // +getStorage, +setStorage
    // 'userWallet', 'addressBook', 'settings'
  ),
  new webpack.NormalModuleReplacementPlugin(
    /^fs$/,
    path.join(__dirname, 'src', 'fs.js')
    // .writeFile .readFile
  ),
  new webpack.NormalModuleReplacementPlugin(
    /^\.\/electron$/,
    path.join(__dirname, 'src', 'dot-electron.js')
    // export const openExternal = (srcLink: string)
  ),
  new webpack.NormalModuleReplacementPlugin(
    /^electron$/,
    path.join(__dirname, 'src', 'electron.js')
    // clipboard.writeText(text)
    // remote.dialog .showSaveDialog .showOpenDialog

    // function(resource) {
    //   console.dir(resource);
    //   resource.request = path.join(__dirname, 'src', 'electron.js');
    // }
  ),
  new webpack.NormalModuleReplacementPlugin(
    /^@ledgerhq\/hw-transport-node-hid$/,
    path.join(__dirname, 'lib', 'node_modules', '@ledgerhq/hw-transport-u2f')
  )
)

// dev
_.remove(module.exports.plugins, v => v instanceof UglifyJSPlugin)
