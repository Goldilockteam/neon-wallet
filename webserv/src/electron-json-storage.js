
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

  window._comm.req({
    fn: 'electron-json-storage.get',
    key: key
  })
  .then((data) => callback(null, data))
  .catch((err) => callback(err));
}

export const set = (key, json, options, callback) => {
  if (_.isFunction(options)) {
    callback = options
  }

  options = options || {}
  callback = callback || _.noop

  window._comm.req({
    fn: 'electron-json-storage.set',
    key: key,
    val: json
  })
  .then(callback)
  .catch((err) => callback(err));
}

export default {
  get: get,
  set: set
}
