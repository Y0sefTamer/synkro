import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import EventEmitter from 'bare-events'
import process from 'bare-process'

export default class App extends EventEmitter {
  constructor () {
    super()
    this.swarm = null
  }

  async ready () {
    console.log('⏳ Starting Synkro P2P Network...')

    this.swarm = new Hyperswarm()

    this.swarm.on('connection', (socket, info) => {
      const peerId = b4a.toString(info.publicKey, 'hex').slice(0, 6)
      console.log(`\n✅ Peer connected! (ID: ${peerId})`)
      
      socket.write(`Hello buddy! The pipe is ready.`)

      socket.on('data', (data) => {
        console.log(`📥 Data from friend: ${data.toString()}`)
      })
      
      socket.on('error', (err) => {
        if (err.code === 'ECONNRESET') {
          console.log(`⚠️ Peer disconnected abruptly (ID: ${peerId})`)
        } else {
          console.error(`❌ Connection error with peer ${peerId}: ${err.message}`)
        }
      })

      socket.on('close', () => {
        console.log(`🔌 Connection closed (ID: ${peerId})`)
      })
    })

    const topicName = 'synkro-hackathon'
    const topicBuffer = b4a.alloc(32).fill(topicName)

    const discovery = this.swarm.join(topicBuffer, { server: true, client: true })

    await discovery.flushed()
    console.log(`[*] Listening for peers in room: ${topicName}`)
    
    this.emit('ready')
  }

  async close () {
    console.log('🛑 Shutting down Synkro...')
    if (this.swarm) {
      await this.swarm.destroy()
    }
    this.emit('close')
  }

  exit (code = 0) {
    console.log('\n🛑 Exiting Synkro gracefully...')
    if (this.swarm) {
      this.swarm.destroy().then(() => {
        process.exit(code)
      })
    } else {
      process.exit(code)
    }
  }
}