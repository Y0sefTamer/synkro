const Hyperswarm = require('hyperswarm')
const crypto = require('hypercore-crypto')
const b4a = require('b4a')

// Initialize the swarm network
const swarm = new Hyperswarm()

console.log('[*] Initializing MeshDrive P2P Network...')

// Handle incoming and outgoing peer connections
swarm.on('connection', (socket, info) => {
  const peerId = b4a.toString(info.publicKey, 'hex').slice(0, 6)
  console.log(`\n[+] Peer connected! (ID: ${peerId})`)
  
  // ==========================================
  // TEST STREAM: Sending a string instead of a file
  // (Your partner will replace this with fs.createReadStream)
  // ==========================================
  socket.write(`Hello from peer ${peerId}, connection is active!`)

  // ==========================================
  // TEST STREAM: Receiving incoming data
  // ==========================================
  socket.on('data', (data) => {
    console.log(`[<] Data received: ${data.toString()}`)
  })

  socket.on('error', (err) => {
    console.error(`[-] Connection error: ${err.message}`)
  })

  socket.on('close', () => {
    console.log(`[-] Peer disconnected (ID: ${peerId})`)
  })
})

// Create a deterministic 32-byte discovery key from a string
// Note: Anyone with this exact string can join the swarm
const topicName = 'meshdrive-hackathon-room-2026'
const topicBuffer = crypto.discoveryKey(b4a.from(topicName, 'utf8'))

// Join the swarm
const discovery = swarm.join(topicBuffer, { server: true, client: true })

discovery.flushed().then(() => {
  console.log(`[*] Swarm flushed. Listening for peers on topic: ${topicName}`)
})