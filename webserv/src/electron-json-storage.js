
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

  // dogz

  return callback(null, {})
}

export const set = (key, json, options, callback) => {
  if (_.isFunction(options)) {
    callback = options
  }

  options = options || {}
  callback = callback || _.noop

  return callback()
}

export default {
  get: get,
  set: set
}
