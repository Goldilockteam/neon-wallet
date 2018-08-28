#!/usr/bin/env bash

export COPY_EXTENDED_ATTRIBUTES_DISABLE=true
export COPYFILE_DISABLE=true

TARGETS=(
  "user1.goldilock.com:22"
#  "user2.goldilock.com"
)

ORIGIN="deploy"
ARCHIVE="deploy.tbz"
TDIR="."
RHOME="/usr/share/neon-wallet"
EXPAND="tar xjf $RHOME/$ARCHIVE -C $RHOME"
RESTART="/etc/init.d/neon-wallet restart"

mkdir -p tmp
tar -cj \
  --exclude .DS_Store \
  --exclude node_modules/@mlink/scrypt/build/Release \
  -f $TDIR/$ARCHIVE \
  -C $ORIGIN \
  authy.js electron-json-storage.js  node_modules  server.js  www

tar tjf $TDIR/$ARCHIVE | grep Release

ls -l $TDIR/$ARCHIVE

for TARGET in "${TARGETS[@]}"

do
  TARGET=(${TARGET//:/ })
  HOST="root@${TARGET[0]}"
  SSHPORT="${TARGET[1]}"
  SSHOPTS="-p $SSHPORT -o StrictHostKeyChecking=false -o UserKnownHostsFile=/dev/null"
  SCPOPTS="-P $SSHPORT -o StrictHostKeyChecking=false -o UserKnownHostsFile=/dev/null"

  echo "deploying to ${HOST} : ${SSHPORT}"
  echo "NOTE: make sure you have done initial 'npm install' in the ./deploy directory!"

  # TODO disable
  # gotta kill node as there's no pid file created by the previous (faulty) script
  # echo "NOTE: temporary: copying neon-wallet.init to the device and killing node.js for auto-restart"
  # scp $SCPOPTS ../../walletpc-raspi3b/meta-walletpc/recipes-wallet/neon-wallet/files/neon-wallet.init "$TARGET:/etc/init.d/neon-wallet"
  # ssh $SSHOPTS "$HOST" "kill -9 $(pidof node)"

  scp $SCPOPTS $TDIR/$ARCHIVE "$HOST:$RHOME" && \
  ssh $SSHOPTS "$HOST" "$EXPAND" && \
  ssh $SSHOPTS "$HOST" "$RESTART"
done

rm -f $TDIR/$ARCHIVE
