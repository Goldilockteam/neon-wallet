
const args = require('minimist')(process.argv.slice(2))
const fse = require('fs-extra')
const http = require('http')
const express = require('express')
const app = express()
const WebSocket = require('ws')
const server = http.createServer(app, {
  cert: args.cert ? fs.readFileSync(args.cert) : undefined,
  key: args.key ? fs.readFileSync(args.key) : undefined,
  passphrase: args.pass || undefined
})
const wss = new WebSocket.Server({ server: server, path: '/ws' })

console.log('using wallet dir: ' + args.walletdir)
fse.ensureDirSync(args.walletdir)

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    console.log('ws received: %s', message)
  })
  ws.send('wallet dir: ' + args.walletdir)
})

app.use(express.static('www'))

server.listen(3000, () => {
  console.log('Neon Wallet Server listening on port 3000')
})
