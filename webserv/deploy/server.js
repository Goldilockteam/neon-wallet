
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
// const util = require('util')
// const pify = require('pify')
const {promisify} = require('es6-promisify')
// const authy = pify(require('authy')(args.authy))
const authy = require('authy')(args.authy)

const authy_register_user = promisify(authy.register_user.bind(authy))
const authy_send_approval_request = promisify(authy.send_approval_request.bind(authy))
const authy_check_approval_status = promisify(authy.check_approval_status.bind(authy))

const LOCAL_USER = 'goldi.neon.LocalUser'

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

const save = (key, val) => {
  return new Promise((resolve, reject) => {
    electronJsonStorage.set(key, val, ejsOpts, (err) => {
      if(err)
        reject(err)
      else
        resolve()
    })
  })
}

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

  console.log(`ws client connected`)

  let passphraseCache = null
  let checkAuthyInterval = null

  const cancelAuthyPolling = () => {
    if(checkAuthyInterval)
      clearInterval(checkAuthyInterval)
    checkAuthyInterval = null
  }

  ws.on('error', (e) => {
    passphraseCache = null
    authyRequests = {}
    cancelAuthyPolling()
    console.log(`ws client disconnected; error: ${e}`)
  })

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
  const storeAndSend = (msg) => {
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
                await storeAndSend(msg)
              }
              else {
                // no previous wallet, perform direct save
                newWallet.accounts.forEach(acc =>
                  console.log(`saving new account (direct): ${acc.address}`))
                await storeAndSend(msg);
              }
            }
          }
          else {
            // not a wallet, just store the object
            await storeAndSend(msg);
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

          const privateKey2 = neonjs.wallet.decrypt(account.key, passphraseCache)

          const privateKey = new neonjs.wallet.Account(privateKey2).privateKey

          // ----------------------------------------------------------------

          // init the local user with Authy info, if wasn't regged yet
          let localUser = await load(LOCAL_USER)

          if(!localUser || !localUser.authy) {

            console.log(`registering new authy user; email: ${args.userEmail};
              cell: ${args.userCell}; country: ${args.userCellCountry}`)

            const reg_user_res = await authy_register_user(
              args.userEmail, args.userCell, args.userCellCountry)
            // res = {user: {id: 1337}}

            if(!localUser)
              localUser = {}
            localUser.authy = reg_user_res.user // .authy.id
            await save(LOCAL_USER, localUser)
            console.log(`saved local user:`)
            console.dir(localUser)
          }

          const address = 'address'
          const amount = 123.45
          const currency = 'NEO'
          const message = `Send ${amount} ${currency} to ${address}?`

          console.log(`sending approval request for user id ${localUser.authy.id}`)
          const resApprovalReq = await authy_send_approval_request(
            localUser.authy.id, { message: message }, null, null)
          // res = {
          //  approval_request: {"uuid":"########-####-####-####-############"},
          //  success: true
          // }

          const approvalUuid = resApprovalReq.approval_request.uuid

          console.log(`starting polling for authy approval request ${approvalUuid}`)

          const checkAuthyApproval = async () => {
            const res_approval_status =
              await authy_check_approval_status(approvalUuid)
            // res = {
            //   "approval_request": {
            //     "_app_name": YOUR_APP_NAME,
            //     "_app_serial_id": APP_SERIAL_ID,
            //     "_authy_id": AUTHY_ID,
            //     "_id": INTERNAL_ID,
            //     "_user_email": EMAIL_ID,
            //     "app_id": APP_ID,
            //     "created_at": TIME_STAMP,
            //     "notified": false,
            //     "processed_at": null,
            //     "seconds_to_expire": 600,
            //     "status": 'pending',
            //     "updated_at": TIME_STAMP,
            //     "user_id": USER_ID,
            //     "uuid": UUID
            //   },
            //   "success": true
            // }

            const stat = res_approval_status.approval_request.status

            if(stat === 'approved') {
              cancelAuthyPolling()
              console.log(`authy request ${approvalUuid} approved, signing the transaction`)
              const signedTx = neonjs.tx.signTransaction(tx, privateKey)
              const serializedSignedTx = neonjs.tx.serializeTransaction(signedTx, true)
              await wsSend({ id: msg.id, data: serializedSignedTx })
            }
            else if(stat === 'denied') {
              cancelAuthyPolling()
              console.log(`authy request ${approvalUuid} denied; cancel polling`)
              await wsSend({ id: msg.id, err: 'Transaction was denied.' })
            }
            else if(stat === 'pending') {
              console.log(`authy request ${approvalUuid} pending`)
            }
          }

          if(checkAuthyInterval)
            clearInterval(checkAuthyInterval)
          checkAuthyInterval = setInterval(checkAuthyApproval, 2000)

          // ----------------------------------------------------------------
          break;
        }
      }
      console.log(`request finish: ${msg.fn} ${msg.id}`)
    }
    catch(e) {
      console.log(`request error: ${msg.fn} ${msg.id} ${e.stack || e}`)
      wsSend({ id: msg.id, err: e.stack })
    }
  })
})

app.use(express.static(args.webdir || 'www'))

server.listen(3000, () => {
  console.log('listening on port 3000')
})
