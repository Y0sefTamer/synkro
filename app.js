import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import EventEmitter from 'bare-events'

export default class App extends EventEmitter {
  constructor () {
    super()
    this.swarm = null
  }

  // bin.mjs calls this automatically when starting
  async ready () {
    console.log('⏳ Starting MeshDrive P2P Network...')

    this.swarm = new Hyperswarm()

    this.swarm.on('connection', (socket, info) => {
      const peerId = b4a.toString(info.publicKey, 'hex').slice(0, 6)
      console.log(`\n✅ Peer connected! (ID: ${peerId})`)
      
      socket.write(`Hello buddy! The pipe is ready.`)

      socket.on('data', (data) => {
        console.log(`📥 Data from friend: ${data.toString()}`)
      })
    })

    const topicName = 'meshdrive-hackathon'
    const topicBuffer = b4a.alloc(32).fill(topicName)

    const discovery = this.swarm.join(topicBuffer, { server: true, client: true })

    await discovery.flushed()
    console.log(`[*] Listening for peers in room: ${topicName}`)
    
    // Announce that initialization is complete
    this.emit('ready')
  }

  // bin.mjs calls this automatically when shutting down
  async close () {
    console.log('🛑 Shutting down MeshDrive...')
    if (this.swarm) {
      await this.swarm.destroy()
    }
    this.emit('close')
  }
}