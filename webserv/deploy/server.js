
const args = require('minimist')(process.argv.slice(2))
const fse = require('fs-extra')
const http = require('http')
const https = require('https')
const express = require('express')
const app = express()
const moment = require('moment')
const WebSocket = require('ws')
const electronJsonStorage = require('./electron-json-storage')

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

wss.on('connection', (ws) => {
  const wsSend = (obj) => ws.send(JSON.stringify(obj))

  ws.on('message', async (json) => {
    let msg = null;
    try {
      msg = JSON.parse(json)
      if(msg === true)
        return
      // const cb = () => wsSend({ resId: msg.reqId, args: arguments })
      // msg.args.push(cb)
      console.log(`request start: ${msg.fn} ${msg.id}`)
      switch(msg.fn) {
        case 'electron-json-storage.get':
          await electronJsonStorage.get(msg.key, ejsOpts, (err, data) => {
            // TODO remove the pkeys if msg.key == 'userWallet'
            wsSend({ id: msg.id, data: data, err: err })
          })
          break
        case 'electron-json-storage.set':
          // TODO remove the pkeys if msg.key == 'userWallet'
          // TBD if wallet import enabled:
          // if `.import` flag present, don't remove the pkeys
          await electronJsonStorage.set(msg.key, msg.val, ejsOpts, err =>
            wsSend({ id: msg.id, err: err })
          )
          break
        case 'createAcc':
          // TODO
          break;
        case 'logIn':
          // TODO
          // load wallet
          // decrypt pkey + cache passphrase
          // remove pkey from wallet
          // return wallet
          break;
        case 'signTx':
          // TODO
          // Authy.confirm
          // load pkey
          // neon-js.signTx()
          // return signed tx
          break;
      }
      console.log(`request finish: ${msg.fn} ${msg.id}`)
    }
    catch(e) {
      console.log(`request error: ${msg.fn} ${msg.id} ${e.stack || e}`)
    }
  })
})

app.use(express.static(args.webdir || 'www'))

server.listen(3000, () => {
  console.log('listening on port 3000')
})
