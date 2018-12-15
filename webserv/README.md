# Neon Wallet repack for Goldilock

Neon Wallet served over HTTPS from an user-private, air-gap connected device.


## Prerequisities

- Docker (Hyper-V (Windows) and Hyperkit (Mac) engines are recommended)
  - mapped /C drive (Windows) or /Users (Mac)
- Cygwin (Windows)
- Git (through Cygwin on Windows, through Homebrew on Mac)

### Note about Docker on Windows
- put { "storage-driver": "aufs" } into your docker config:
- https://docs.docker.com/engine/reference/commandline/dockerd/#daemon-configuration-file
- e.g. in Windows, create the file at C:\ProgramData\Docker\config\daemon.json

## HOWTO build

```bash
# cd to whatever yor project directory is
cd yoruprojects

# clone the repo:
git clone git@github.com:Goldilockteam/neon-wallet.git
cd neon-wallet

# make sure you are on the branch goldilock-design-v2
git checkout goldilock-design-v2

# *** if you are e.g. developing styles, create your own branch ***
# (the branch must be based off the goldilock-design-v2 branch!)
git checkout -b yourbranch

# create the Docker image
cd webserv
docker build -t goldiwallet .

# *** make sure your machine's port 3000 is free (or adjust the following accordingly) ***

# run the created docker image (Windows)
docker run -ti --rm -v C:/Users/$USER:/root:z -p 3000:3000 goldiwallet bash -isl

# run the created docker image (Mac)
docker run -ti --rm -v /Users/$USER:/root:z -p 3000:3000 goldiwallet bash -isl

# run the created docker image (Linux)
docker run -ti --rm -v /home/$USER:/root:z -p 3000:3000 goldiwallet bash -isl

# *** from within the Docker machine: ***

# this will work only if you have proper drive mapping in Docker
cd yourprojects/neon-wallet

# update dependencies for the neon-wallet itself
yarn install

# update dependencies for the goldilock sub-projects
cd webserv # neon-wallet/webserv
npm install --unsafe-perm
cd deploy  # neon-wallet/webserv/deploy
npm install --unsafe-perm

# build the neon-wallet client/server package
# (you will need to repeat this step if you change any sources)
# (for a faster roundtrip you may explore the electron dev mode of the main dev branch)
cd
cd yourprojects/neon-wallet
. webserv/pack.sh
```

## HOWTO run locally

```bash
# *** make sure you have completed the wallet build process ***

# switch into the wallet repo directory
cd
cd yourprojects/neon-wallet

# copy local settings template to actual file
cd webserv # neon-wallet/webserv
cp tmpl.local.conf local.conf

# *** edit the local.conf with proper values ***
# (if you are Goldilock's coopearting 3rd party, we will give you some of these, email us)

# use authy.sh to register your user if needed
# (if you are Goldilock's coopearting 3rd party, we will do this for you, email us)
. authy.sh

# *** from within the Docker machine: ***

# use ssl.sh to launch your local instance
$ (You can use ". http.sh" to start without HTTPS)
. ssl.sh

# update your local OS hosts file to contain entry:
# (you can choose arbitrary 3rd level domain name instead of the "user0")
127.0.0.1 user0.goldilock.com

# in your browser, visit the url with port 3000
https://user0.goldilock.com:3000

```
