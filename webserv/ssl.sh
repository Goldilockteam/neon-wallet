
. local.conf

node deploy/server.js \
  --webdir deploy/www \
  --walletdir deploy/tmp \
  --cert $HTTPS_CERT \
  --key $HTTPS_KEY \
  --ca $HTTPS_CA \
  --pass $HTTPS_CERT_PASSWD \
  --authy $AUTHY_APIKEY \
  --authyUserId $AUTHY_DEVICE_USERID \
  --authyLoginEnabled $AUTHY_WALL_ENABLED
