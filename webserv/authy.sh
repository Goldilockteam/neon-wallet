
. local.conf

node deploy/authy.js \
  --authy $AUTHY_APIKEY \
  --userEmail $USER_EMAIL \
  --userCell $USER_CELL \
  --userCellCountry $USER_CELL_COUNTRY
