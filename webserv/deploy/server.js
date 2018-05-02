
const args = require('minimist')(process.argv.slice(2))
const fse = require('fs-extra')
const http = require('http')
const express = require('express')
const app = express()
const WebSocket = require('ws')
const server = http.createServer(app, {
  cert: args.cert ? fse.readFileSync(args.cert) : undefined,
  key: args.key ? fse.readFileSync(args.key) : undefined,
  ca: args.ca ? fse.readFileSync(args.ca) : undefined,
  passphrase: args.pass || undefined })
const wss = new WebSocket.Server({ server: server, path: '/ws' })
const moment = require('moment')
const electronJsonStorage = require('./electron-json-storage')

console.log('using wallet dir: ' + args.walletdir)
fse.ensureDirSync(args.walletdir)
const ejsOpts = { dataPath: args.walletdir }

// WS API
wss.on('connection', (ws) => {
  const wsSend = (obj) => ws.send(JSON.stringify(obj))

  ws.on('message', (json) => {
    try {
      const msg = JSON.parse(json)
      // const cb = () => wsSend({ resId: msg.reqId, args: arguments })
      msg.args.push(cb)
      console.log(`request start: ${msg.fn} ${msg.reqId}`)
      switch(msg.fn) {
        case 'electron-json-storage.get':
          await electronJsonStorage.get(msg.key, ejsOpts, (err, data) => {
            // TODO remove the pkeys if msg.key == 'userWallet'
            wsSend({ resId: msg.reqId, data: data })
          }))
          break
        case 'electron-json-storage.set':
          // TODO remove the pkeys if msg.key == 'userWallet'
          // TBD if wallet import enabled:
          // if `.import` flag present, don't remove the pkeys
          await electronJsonStorage.set(msg.key, msg.val, ejsOpts, err =>
            wsSend({ resId: msg.reqId, err: err })
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
      console.log(`request finish: ${msg.fn} ${msg.reqId}`)
    }
    catch(e) {
      console.log(`request error: ${msg.fn} ${msg.reqId} ${e}`)
    }
  })
  ws.send('wallet dir: ' + args.walletdir)
})

app.use(express.static('www'))

server.listen(3000, () => {
  console.log('listening on port 3000')
})
