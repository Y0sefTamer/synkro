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
    console.log('⏳ Starting Synkro P2P Network...')

    // 1. Improved argument parsing to find the actual 64-character hex key
    let key = null;
    if (global.Bare && global.Bare.argv) {
      // Loop through all arguments and find the one that looks like a 64-char hex string
      const hexArg = global.Bare.argv.find(arg => arg.length === 64 && /^[0-9a-fA-F]+$/.test(arg));
      if (hexArg) {
        key = hexArg;
      }
    }

    const storageDir = key ? './synkro-reader-db' : './synkro-writer-db'
    const syncDir = key ? './Synkro-Reader-Sync' : './Synkro-Writer-Sync'

    this.fileSystem = new FileSync(storageDir, syncDir)
    const store = await this.fileSystem.init(key)

    this.swarm = new Hyperswarm()

    this.swarm.on('connection', (socket, info) => {
      const peerId = b4a.toString(info.publicKey, 'hex').slice(0, 6)
      console.log(`\n✅ Peer connected! (ID: ${peerId})`)
      
      store.replicate(socket)

      socket.on('error', (err) => {
        if (err.code === 'ECONNRESET') {
          console.log(`⚠️ Peer disconnected abruptly (ID: ${peerId})`)
        }
      })

      socket.on('close', () => {
        console.log(`🔌 Connection closed (ID: ${peerId})`)
      })
    })

    const topicName = 'synkro-hackathon-room'
    const topicBuffer = b4a.alloc(32).fill(topicName)
    const discovery = this.swarm.join(topicBuffer, { server: true, client: true })

    await discovery.flushed()
    console.log(`[*] Listening for peers in room: ${topicName}`)
    
    process.stdin.setEncoding('utf-8')
    process.stdin.on('data', (data) => {
      if (data.includes('\n')) {
        this.fileSystem.mirrorToDrive()
      }
    })
    
    if (!key) {
      console.log('💡 Tip: Drop files in "Synkro-Writer-Sync" folder and press ENTER to upload.')
    } else {
       console.log('💡 Tip: Listening for incoming files in "Synkro-Reader-Sync" folder.')
    }

    this.emit('ready')
  }

  async close () {
    console.log('🛑 Shutting down Synkro...')
    if (this.swarm) await this.swarm.destroy()
    this.emit('close')
  }

  exit (code = 0) {
    console.log('\n🛑 Exiting Synkro gracefully...')
    if (this.swarm) {
      this.swarm.destroy().then(() => process.exit(code))
    } else {
      process.exit(code)
    }
  }
}