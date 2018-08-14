
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
const {promisify} = require('es6-promisify')
const authy = require('authy')(args.authy)
const {timeSpan} = require('utilz')

const authy_register_user = promisify(authy.register_user.bind(authy))
const authy_send_approval_request = promisify(authy.send_approval_request.bind(authy))
const authy_check_approval_status = promisify(authy.check_approval_status.bind(authy))
const MAX_AUTHY_POLL_ERRORS = 5

require('assert')(module == process.mainModule)
exports.nativeScrypt = require('@mlink/scrypt')

const getTxType = (tx) => {
  switch(tx.type) {
    case 2: return 'Claim'
    case 128: return 'Contract'
    case 209: return 'Invocation'
    default: return 'Unknown'
  }
}

const sleep = async (millis) => {
  console.log(`sleeping for ${millis} millis`)
  return new Promise((resolve, reject) => {
    setTimeout(resolve, millis)
  })
}

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

  let pkeyCache = null
  let checkAuthyInterval = null
  let authyCode = null
  let isAuthyLoggedIn = false
  let authyPollingErrors = 0

  const cancelAuthyPolling = () => {
    if(checkAuthyInterval)
      clearInterval(checkAuthyInterval)
    checkAuthyInterval = null
    authyPollingErrors = 0
  }

  const cancelIfTooManyAuthyPollingErrors = () => {
    // sometimes `authy_check_approval_status()` fails / returns `undefined`,
    // so let's handle that when its repeated
    if(authyPollingErrors++ > MAX_AUTHY_POLL_ERRORS)
      cancelAuthyPolling()
  }

  ws.on('error', (e) => {
    pkeyCache = null
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

      if(msg.fn == 'authy-login-code') {
        // TODO ban the IP after 3 retries
        // generate authy code for identification purposes
        if(args.authyLoginEnabled === 'true') {
          authyCode = Math.floor(1000 + Math.random() * 9000)
        }
        else {
          authyCode = 0
          isAuthyLoggedIn = true
        }
        await wsSend({ id: msg.id, data: authyCode })
      }
      else if(msg.fn == 'authy-login-confirm') {

        const message = `Do you authorize login ${authyCode}?`
        console.log(`sending login request for user id ${args.authyUserId} with code ${authyCode}`)

        const resApprovalReq = await authy_send_approval_request(
          args.authyUserId, { message: message }, null, null)

        const approvalUuid = resApprovalReq.approval_request.uuid
        console.log(`starting polling for authy login approval request ${approvalUuid}`)

        const checkAuthyLoginApproval = async () => {
          try {
            const res_approval_status =
              await authy_check_approval_status(approvalUuid)

            const stat = res_approval_status.approval_request.status

            if(stat === 'approved') {
              cancelAuthyPolling()
              isAuthyLoggedIn = true
              console.log(`authy login request ${approvalUuid} approved`)
              await wsSend({ id: msg.id, data: true })
            }
            else if(stat === 'denied') {
              cancelAuthyPolling()
              isAuthyLoggedIn = false
              console.log(`authy login request ${approvalUuid} denied; cancel polling`)
              await wsSend({ id: msg.id, data: false })
            }
            else if(stat === 'pending') {
              console.log(`authy login request ${approvalUuid} pending`)
            }
          }
          catch(e) {
            console.log(`error in checkAuthyLoginApproval: ${e}`)
            cancelIfTooManyAuthyPollingErrors()
          }
        }

        cancelAuthyPolling()
        checkAuthyInterval = setInterval(checkAuthyLoginApproval, 2000)
      }
      else if(!isAuthyLoggedIn) {
        throw new Error('login not verified by Authy')
      }
      else {
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
                if(curWallet && curWallet.accounts) {
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

            // const t = Date.now()
            // const wif = neonjs.wallet.decrypt(account.key, msg.passphrase)
            // console.log(`login wallet.decrypt took ${timeSpan(Date.now() - t)}`)

            const t = Date.now()
            const wif = await neonjs.wallet.decryptAsyncNative(account.key, msg.passphrase)
            console.log(`login wallet.decryptAsync took ${timeSpan(Date.now() - t)}`)

            const instAcc = new neonjs.wallet.Account(wif)

            if(msg.address !== instAcc.address)
              throw new Error('instantiated account private key mismatch')

            pkeyCache = instAcc.privateKey

            // simulate js crypto duration on raspi 3b:
            // await sleep(40000)

            await wsSend({ id: msg.id, data: { address: instAcc.address }})

            break;
          }

          case 'signTx': {

            if(!pkeyCache)
              throw new Error('no cached pkey')

            const account = await loadAccount(msg.address)
            const tx = new neonjs.tx.Transaction(neonjs.tx.deserializeTransaction(msg.tx))

            console.dir(tx)

            // let t = Date.now()
            // const privateKey2 = neonjs.wallet.decrypt(account.key, passphraseCache)
            // console.log(`tx.sign wallet.decrypt took ${timeSpan(Date.now() - t)}`)
            // const privateKey = new neonjs.wallet.Account(privateKey2).privateKey

            // ----------------------------------------------------------------

            // const address = 'address' // can be multiple; don't mention our own
            // const amount = 123.45 // sum the foreign outputs
            // const currency = 'NEO'
            // const message = `Send ${amount} ${currency} to ${address}?`

            // const type = getTxType(tx)
            // const message = `Approve ${type} transaction ${tx.hash}?`

            const message = `Approve transaction ${tx.hash}?`

            console.log(`sending approval request for user id ${args.authyUserId}`)
            const resApprovalReq = await authy_send_approval_request(
              args.authyUserId, { message: message }, null, null)
            // res = {
            //  approval_request: {"uuid":"########-####-####-####-############"},
            //  success: true
            // }

            const approvalUuid = resApprovalReq.approval_request.uuid

            console.log(`starting polling for authy approval request ${approvalUuid}`)

            let txActioned = false

            const checkAuthyApproval = async () => {

              try {

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

                if(txActioned)
                  return

                const stat = res_approval_status.approval_request.status

                if(stat === 'approved') {
                  txActioned = true
                  cancelAuthyPolling()
                  console.log(`authy request ${approvalUuid} approved, signing the transaction`)

                  t = Date.now()
                  const signedTx = neonjs.tx.signTransaction(tx, pkeyCache)
                  console.log(`tx.sign took ${timeSpan(Date.now() - t)}`)

                  const serializedSignedTx = neonjs.tx.serializeTransaction(signedTx, true)
                  await wsSend({ id: msg.id, data: serializedSignedTx })
                }
                else if(stat === 'denied') {
                  txActioned = true
                  cancelAuthyPolling()
                  console.log(`authy request ${approvalUuid} denied; cancel polling`)
                  await wsSend({ id: msg.id, err: 'Transaction was denied.' })
                }
                else if(stat === 'pending') {
                  console.log(`authy request ${approvalUuid} pending`)
                }
              }
              catch(e) {
                console.log(`error in checkAuthyApproval: ${e}`)
                cancelIfTooManyAuthyPollingErrors()
              }
            }

            cancelAuthyPolling()
            checkAuthyInterval = setInterval(checkAuthyApproval, 2000)

            // ----------------------------------------------------------------
            break;
          }
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

app.use((req, res) => {
  // res.send(404, 'Page not found')
  res.redirect('/')
})

server.listen(3000, () => {
  console.log('listening on port 3000')
})

// test change 005
