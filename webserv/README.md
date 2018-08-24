# Neon Wallet repack for Goldilock
Neon Wallet served over HTTPS from an user-private, air-gap connected device.

# HOWTO build
- clone the repo: `git clone git@github.com:Goldilockteam/neon-wallet.git`

```bash
# clone the repo:
git clone git@github.com:Goldilockteam/neon-wallet.git
cd neon-wallet

# make sure you are on the branch goldilock_dev
git checkout goldilock_dev

# create the Docker image
cd webserv
docker build -t goldiwallet

# run the created docker image (Windows)
docker run -ti --rm -v C:/Users/$USER:/root:z -p 3000:3000 dev bash -isl

# run the created docker image (Mac)
docker run -ti --rm -v /Users/$USER:/root:z -p 3000:3000 dev bash -isl


```

# HOWTO run locally






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
