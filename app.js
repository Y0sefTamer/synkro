import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import EventEmitter from 'bare-events' // التعديل البسيط هنا

export default class App extends EventEmitter {
  constructor () {
    super() // Initializes the bare-events instance
    this.initNetwork()
  }

  async initNetwork () {
    console.log('⏳ Starting MeshDrive P2P Network...')

    // 1. Initialize the swarm network
    const swarm = new Hyperswarm()

    // 2. Handle incoming peer connections
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

    // 3. Create a strictly 32-byte buffer for the network topic
    const topicName = 'meshdrive-hackathon'
    const topicBuffer = b4a.alloc(32).fill(topicName)

    // 4. Join the swarm topic to find other peers
    const discovery = swarm.join(topicBuffer, { server: true, client: true })

    await discovery.flushed()
    console.log(`[*] Listening for peers in room: ${topicName}`)
  }
}