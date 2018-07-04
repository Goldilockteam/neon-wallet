#!/usr/bin/env bash

export COPY_EXTENDED_ATTRIBUTES_DISABLE=true
export COPYFILE_DISABLE=true

TARGETS=(
  "user1.goldilock.com"
#  "user2.goldilock.com"
)

ORIGIN="deploy"
ARCHIVE="deploy.tbz"
SSHOPTS="-o StrictHostKeyChecking=false -o UserKnownHostsFile=/dev/null"
RHOME="/usr/share/neon-wallet"
EXPAND="tar xjf $RHOME/$ARCHIVE -C $RHOME"
RESTART="/etc/init.d/neon-wallet restart"

mkdir -p tmp
tar -cj \
  --exclude .DS_Store \
  -f $TDIR/$ARCHIVE \
  -C $ORIGIN \
  authy.js electron-json-storage.js  node_modules  server.js  www

ls -l $TDIR/$ARCHIVE

for TARGET in "${TARGETS[@]}"
do
  TARGET="root@${TARGET}"
  echo "deploying to ${TARGET}"

  echo "NOTE: make sure you have done initial 'npm install' in the ./deploy directory!"

  # TODO disable
  # gotta kill node as there's no pid file created by the previous (faulty) script
  echo "NOTE: temporary: copying neon-wallet.init to the device and killing node.js for auto-restart"
  scp $SSHOPTS ../../walletpc-raspi3b/meta-walletpc/recipes-wallet/neon-wallet/files/neon-wallet.init "$TARGET:/etc/init.d/neon-wallet"
  ssh $SSHOPTS "$TARGET" 'kill -9 $(pidof node)'

  scp $SSHOPTS $TDIR/$ARCHIVE "$TARGET:$RHOME" && \
  ssh $SSHOPTS "$TARGET" "$EXPAND" && \
  ssh $SSHOPTS "$TARGET" "$RESTART"
done

rm -f $ARCHIVE
