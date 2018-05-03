#!/bin/bash
# has to be run from project root
node_modules/.bin/cross-env NODE_ENV=production node_modules/.bin/webpack --config ./webserv/webpack.config.webserv

cp -f ./webserv/deploy/www/index2.html ./webserv/deploy/www/index.html
