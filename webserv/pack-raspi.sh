#!/bin/bash
# has to be run from project root

# MODE=development
MODE=production

echo "Building ${MODE}..."

pushd ../neon-js
node_modules/.bin/cross-env \
  NODE_ENV=${MODE} \
  node_modules/.bin/webpack \
  --mode ${MODE} \
  --display minimal
popd

NEONJS=webserv/deploy/node_modules/\@cityofzion/neon-js/lib/
cp -f ../neon-js/lib/* ${NEONJS}
ls -l ${NEONJS}
