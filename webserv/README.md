# Neon Wallet repack for Goldilock
Neon Wallet served over HTTPS from an user-private, air-gap connected device.

# How to build
- clone the repo
- make sure you are on branch `goldilock`
- `yarn install` in the root directory
- `npm install` in the `./webserv` directory
- `. webserv/pack.sh` in the root directory

# How to run
- `npm install` in the `./webserv/deploy` directory
- `node server.js --walletdir tmp` in the `./webserv/deploy` directory
  - add `--cert ssl/cert.pem --key ssl/key.pem` for SSL
    - use `--ca` for certificate authority certificate
    - use `--pass` if your SSL key require a passphrase
- point your Chrome browser to `http://localhost:3000`
