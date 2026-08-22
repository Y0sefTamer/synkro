const Pear = require('pear')
const Hyperswarm = require('hyperswarm')
const crypto = require('hypercore-crypto')
const b4a = require('b4a')


const swarm = new Hyperswarm()


swarm.on('connection', (socket, info) => {
 
  const peerId = b4a.toString(info.publicKey, 'hex').slice(0, 6)
  

  Pear.worker.message({ type: 'peer_connected', peerId })
  
 
  socket.write(`Hello buddy! The pipe is ready.`)

 
  socket.on('data', (data) => {
    Pear.worker.message({ type: 'data_received', data: data.toString() })
  })
})


const topicName = 'meshdrive-secret-room-1'
const topicBuffer = crypto.discoveryKey(b4a.from(topicName, 'utf8'))

swarm.join(topicBuffer, { server: true, client: true })