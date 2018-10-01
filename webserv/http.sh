
. local.conf

node deploy/server.js \
  --webdir deploy/www \
  --walletdir deploy/tmp \
  --authy $AUTHY_APIKEY \
  --authyUserId $AUTHY_DEVICE_USERID \
  --authyLoginEnabled $AUTHY_WALL_ENABLED
