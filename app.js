import Hyperswarm from 'hyperswarm'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'

export default async function () {
  console.log('⏳ Starting MeshDrive P2P Network...')

  // Initialize the swarm network
  const swarm = new Hyperswarm()

  // Handle incoming peer connections
  swarm.on('connection', (socket, info) => {
    // Extract a short peer ID for logging purposes
    const peerId = b4a.toString(info.publicKey, 'hex').slice(0, 6)
    
    console.log(`\n✅ Peer connected! (ID: ${peerId})`)
    
    // Send a test message to the connected peer
    socket.write(`Hello buddy! The pipe is ready.`)

    // Listen for and log incoming data from the peer
    socket.on('data', (data) => {
      console.log(`📥 Data from friend: ${data.toString()}`)
    })
  })

  // Create a deterministic topic buffer from a secret room name
  const topicName = 'meshdrive-secret-room-1'
  const topicBuffer = crypto.discoveryKey(b4a.from(topicName, 'utf8'))

  // Join the swarm topic to find other peers
  const discovery = swarm.join(topicBuffer, { server: true, client: true })

  await discovery.flushed()
  console.log(`[*] Listening for peers in room: ${topicName}`)
}