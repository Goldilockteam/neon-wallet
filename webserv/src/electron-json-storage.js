
'use strict'

/**
 * @module storage
 */

const _ = require('lodash')

export const get = (key, options, callback) => {
  if (_.isFunction(options)) {
    callback = options
  }

  options = options || {}
  callback = callback || _.noop

  // ws.req(...).then(...callback...)

  return callback(null, {})
}

export const set = (key, json, options, callback) => {
  if (_.isFunction(options)) {
    callback = options
  }

  options = options || {}
  callback = callback || _.noop

  // ws.req(...).then(...callback...)

  // TODO need to also remove pkeys from the 'json'
  // if the key is 'userWallet'

  return callback()
}

export default {
  get: get,
  set: set
}
