import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import EventEmitter from 'bare-events'
import process from 'bare-process'
import FileSync from './filesync.js'

export default class App extends EventEmitter {
  constructor () {
    super()
    this.swarm = null
    this.fileSystem = null
  }

  async ready () {
    console.log('⏳ Starting MeshDrive P2P Network...')

    // Initialize File Sync (Acting as Writer by default for simplicity)
    this.fileSystem = new FileSync()
    const store = await this.fileSystem.init()

    this.swarm = new Hyperswarm()

    this.swarm.on('connection', (socket, info) => {
      const peerId = b4a.toString(info.publicKey, 'hex').slice(0, 6)
      console.log(`\n✅ Peer connected! (ID: ${peerId})`)
      
      // === THE MAGIC INTEGRATION ===
      // Replicate the hidden database over the Hyperswarm socket
      store.replicate(socket)
      // =============================

      socket.on('error', (err) => {
        if (err.code === 'ECONNRESET') {
          console.log(`⚠️ Peer disconnected abruptly (ID: ${peerId})`)
        }
      })

      socket.on('close', () => {
        console.log(`🔌 Connection closed (ID: ${peerId})`)
      })
    })

    const topicName = 'meshdrive-hackathon'
    const topicBuffer = b4a.alloc(32).fill(topicName)
    const discovery = this.swarm.join(topicBuffer, { server: true, client: true })

    await discovery.flushed()
    console.log(`[*] Listening for peers in room: ${topicName}`)
    
    // Trigger local sync when user presses Enter
    process.stdin.setEncoding('utf-8')
    process.stdin.on('data', (data) => {
      if (data.includes('\n')) {
        this.fileSystem.mirrorToDrive()
      }
    })
    console.log('💡 Tip: Drop files in "MeshDrive-Sync" folder and press ENTER to upload.')

    this.emit('ready')
  }

  async close () {
    console.log('🛑 Shutting down MeshDrive...')
    if (this.swarm) await this.swarm.destroy()
    this.emit('close')
  }

  exit (code = 0) {
    console.log('\n🛑 Exiting MeshDrive gracefully...')
    if (this.swarm) {
      this.swarm.destroy().then(() => process.exit(code))
    } else {
      process.exit(code)
    }
  }
}