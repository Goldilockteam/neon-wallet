
const args = require('minimist')(process.argv.slice(2))
const fse = require('fs-extra')
const http = require('http')
const https = require('https')
const express = require('express')
const app = express()
const moment = require('moment')
const WebSocket = require('ws')
const electronJsonStorage = require('./electron-json-storage')
const neonjs = require('@cityofzion/neon-js')

const server = args.cert ?
  https.createServer({
    key: args.key ? fse.readFileSync(args.key) : undefined,
    cert: args.cert ? fse.readFileSync(args.cert) : undefined,
    ca: args.ca ? fse.readFileSync(args.ca) : undefined,
    passphrase: args.pass || undefined
  }, app) :
  http.createServer(app)

const wss = new WebSocket.Server({ server: server, path: '/ws' })

fse.ensureDirSync(args.walletdir)
const ejsOpts = { dataPath: args.walletdir }

const load = (key) => {
  return new Promise((resolve, reject) =>
    electronJsonStorage.get(key, ejsOpts, (err, data) => {
      if(err)
        reject(err)
      else
        resolve(data)
    }))
}

const loadAccount = async (address) => {
  const wallet = await load('userWallet')
  if(!wallet)
    throw new Error('no wallet')
  if(!wallet.accounts || !wallet.accounts.length)
    throw new Error('no wallet accounts')
  const account = wallet.accounts.find(acc => acc.address === address)
  if(!account)
    throw new Error('account not found')
  if(!account.key)
    throw new Error('account has no private key')
  return account
}

wss.on('connection', (ws) => {

  let passphraseCache = null

  const wsSend = (obj) => {
    return new Promise((resolve, reject) => {
      ws.send(JSON.stringify(obj), (err) => {
        if(err)
          reject(err)
        else
          resolve()
      })
    })
  }
  const store = (msg) => {
    return new Promise((resolve, reject) => {
      electronJsonStorage.set(msg.key, msg.val, ejsOpts, err =>
        resolve(wsSend({ id: msg.id, err: err }))
      )
    })
  }

  ws.on('message', async (json) => {
    let msg = JSON.parse(json)
    try {
      if(msg === true) // heartbeat
        return
      // {
      //   "name":"userWallet",
      //   "version":"1.0",
      //   "scrypt":{"cost":16384,"blockSize":8,"parallel":8,"size":64},
      //   "accounts":[{
      //     "address":"...",
      //     "label":"...",
      //     "isDefault":false,
      //     "lock":false,
      //     "key":"...",
      //     "contract":{},
      //     "extra":null}
      //   ],
      //   "extra":null}
      // const cb = () => wsSend({ resId: msg.reqId, args: arguments })
      // msg.args.push(cb)

      console.log(`request start: ${msg.fn} ${msg.id} ${msg.key}`)

      switch(msg.fn) {

        case 'electron-json-storage.get': {
          const data = await load(msg.key)
          // remove pkeys from wallet
          if(msg.key == 'userWallet' && data && data.accounts)
            data.accounts.forEach(acc => acc.key = undefined)
          await wsSend({ id: msg.id, data: data })
          break
        }

        case 'electron-json-storage.set': {
          // remove the pkeys if msg.key == 'userWallet' and the wallet/account exists
          if(msg.key == 'userWallet') {
            // TBD if wallet import enabled:
            //    if `.import` flag present, don't remove the pkeys
            // TODO - also update internal backup server
            // refuse overwrite with damaged data
            if(!msg.val || !msg.val.accounts) {
              await wsSend({ id: msg.id, err: 'invalid wallet' })
            }
            else {
              const newWallet = msg.val
              // is there an existing wallet already saved
              const curWallet = await load(msg.key)
              if(curWallet) {
                // existing wallet, perform merge
                curAccByAddr = {}
                curWallet.accounts.forEach(curAcc => curAccByAddr[curAcc.address] = curAcc)
                newWallet.accounts.forEach(newAcc => {
                  curAcc = curAccByAddr[newAcc.address]
                  if(curAcc) {
                    curAccByAddr[newAcc.address] = undefined
                    console.log(`preserving key for acc ${newAcc.address}`)
                    newAcc.key = curAcc.key
                  }
                })
                Object.entries(curAccByAddr).forEach(e =>
                  console.log(`saving new account (merge): ${e[0]}`))
                await store(msg)
              }
              else {
                // no previous wallet, perform direct save
                newWallet.accounts.forEach(acc =>
                  console.log(`saving new account (direct): ${acc.address}`))
                await store(msg);
              }
            }
          }
          else {
            // not a wallet, just store the object
            await store(msg);
          }
          break
        }

        case 'logIn': {
          // load wallet
          // decrypt pkey + cache passphrase
          // return { address }

          const account = await loadAccount(msg.address)

          const wif = neonjs.wallet.decrypt(account.key, msg.passphrase)
          const instAcc = new neonjs.wallet.Account(wif)

          if(msg.address !== instAcc.address)
            throw new Error('instantiated account private key mismatch')

          passphraseCache = msg.passphrase
          await wsSend({ id: msg.id, data: { address: instAcc.address }})

          break;
        }

        case 'signTx': {

          if(!passphraseCache)
            throw new Error('no cached passphrase')

          const account = await loadAccount(msg.address)
          const tx = neonjs.tx.deserializeTransaction(msg.tx)

          const privateKey = neonjs.wallet.decrypt(account.key, passphraseCache)

          // TODO Authy.confirm [timeout]

          const signedTx = neonjs.tx.signTransaction(tx, privateKey)
          const serializedSignedTx = neonjs.tx.serializeTransaction(signedTx, true)

          await wsSend({ id: msg.id, data: serializedSignedTx })

          break;
        }
      }
      console.log(`request finish: ${msg.fn} ${msg.id}`)
    }
    catch(e) {
      console.log(`request error: ${msg.fn} ${msg.id} ${e.stack || e}`)
      wsSend({ id: msg.id, err: e })
    }
  })
})

app.use(express.static(args.webdir || 'www'))

server.listen(3000, () => {
  console.log('listening on port 3000')
})
