/*
 * The MIT License
 *
 * Copyright (c) 2016 Juan Cruz Viotti. https://github.com/jviotti
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * @module storage
 */

const _ = require('lodash');
const async = require('async');
const fs = require('fs');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const path = require('path');
const RWlock = require('rwlock');
const lock = new RWlock();

const utils = {
  getFileName: function(key, options) {

    if (!key) {
      throw new Error('Missing key');
    }

    if (!_.isString(key) || key.trim().length === 0) {
      throw new Error('Invalid key');
    }

    // Trick to prevent adding the `.json` twice
    // if the key already contains it.
    const keyFileName = path.basename(key, '.json') + '.json';

    // Prevent ENOENT and other similar errors when using
    // reserved characters in Windows filenames.
    // See: https://en.wikipedia.org/wiki/Filename#Reserved%5Fcharacters%5Fand%5Fwords
    const escapedFileName = encodeURIComponent(keyFileName)
      .replace(/\*/g, '-').replace(/%20/g, ' ');

    return path.join(options.dataPath, escapedFileName);
  }
};

exports.get = function(key, options, callback) {
  if (_.isFunction(options)) {
    callback = options;
  }

  options = options || {};
  callback = callback || _.noop;

  async.waterfall([
    async.asyncify(_.partial(utils.getFileName, key, {
      dataPath: options.dataPath
    })),
    function(fileName, callback) {
      fs.readFile(fileName, {
        encoding: 'utf8'
      }, function(error, object) {
        if (!error) {
          return callback(null, object);
        }

        if (error.code === 'ENOENT') {
          return callback(null, JSON.stringify({}));
        }

        return callback(error);
      });
    },
    function(object, callback) {
      var objectJSON = {};
      try {
        objectJSON = JSON.parse(object);
      } catch (error) {
        return callback(new Error('Invalid data: ' + object));
      }
      return callback(null, objectJSON);
    }
  ], callback);
};

exports.set = function(key, json, options, callback) {
  if (_.isFunction(options)) {
    callback = options;
  }

  options = options || {};
  callback = callback || _.noop;

  async.waterfall([
    async.asyncify(_.partial(utils.getFileName, key, {
      dataPath: options.dataPath
    })),
    function(fileName, callback) {
      const data = JSON.stringify(json);

      if (!data) {
        return callback(new Error('Invalid JSON data'));
      }

      // Create the directory in case it doesn't exist yet
      mkdirp(path.dirname(fileName), function(error) {
        if (error) {
          return callback(error);
        }

        // Ensure parallel writes don't corrupt the data
        lock.writeLock(function(releaseLock) {
          fs.writeFile(fileName, data, function(error) {
            releaseLock();
            return callback(error);
          });
        });
      });

    }
  ], callback);
};
