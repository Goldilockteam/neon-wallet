#!/bin/bash
# has to be run from project root

# MODE=development
MODE=production

echo "Building neon-js for ${MODE}..."

pushd ../neon-js
node_modules/.bin/cross-env \
  NODE_ENV=${MODE} \
  node_modules/.bin/webpack \
  --mode ${MODE} \
  --display minimal
popd

echo "Update neon-wallet neon-js..."
NEONJS=webserv/node_modules/\@cityofzion/neon-js/lib/
cp -f ../neon-js/lib/* ${NEONJS}
ls -l ${NEONJS}

echo "Update server neon-js..."
NEONJS=webserv/deploy/node_modules/\@cityofzion/neon-js/lib/
cp -f ../neon-js/lib/* ${NEONJS}
ls -l ${NEONJS}

echo "Building neon-wallet for ${MODE}..."

node_modules/.bin/cross-env \
  NODE_ENV=${MODE} \
  node_modules/.bin/webpack \
  --config webserv/webpack.config.webserv \
  --display minimal

ls -l webserv/deploy/www/bundle.js

cp -f webserv/deploy/www/index2.html webserv/deploy/www/index.html

echo "Done."
