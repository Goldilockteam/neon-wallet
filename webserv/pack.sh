#!/bin/bash
# has to be run from project root

MODE=development
# MODE=production

pushd ../neon-js
node_modules/.bin/cross-env \
  NODE_ENV=${MODE} \
  node_modules/.bin/webpack \
  --mode ${MODE} \
  --display minimal
popd

NEONJS=webserv/node_modules/\@cityofzion/neon-js/lib/
cp -f ../neon-js/lib/{browser.js,index.js} ${NEONJS}
ls -l ${NEONJS}

node_modules/.bin/cross-env \
  NODE_ENV=${MODE} \
  node_modules/.bin/webpack \
  --config webserv/webpack.config.webserv \
  --display minimal

cp -f webserv/deploy/www/index2.html webserv/deploy/www/index.html
