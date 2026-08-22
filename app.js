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
    this.key = null // Store the key globally in the class
  }

  async ready () {
    console.log('⏳ Starting Synkro P2P Network...')
    
    // 1. Ask the user for their role
    console.log('\n--- Synkro Setup ---')
    console.log('To CREATE a new network: Just press ENTER')
    console.log('To JOIN an existing network: Paste the 64-character Drive Key and press ENTER')
    process.stdout.write('> ')

    process.stdin.setEncoding('utf-8')
    
    // We use a named function so we can remove this specific listener later
    const setupListener = async (input) => {
      const data = input.trim()
      
      // Check if it's a valid 64-character hex key
      if (data.length === 64 && /^[0-9a-fA-F]+$/.test(data)) {
        this.key = data
        console.log(`\njoining network with key: ${this.key}...`)
      } else if (data === '') {
         console.log('\nCreating a new Synkro network...')
      } else {
         console.log('\n❌ Invalid input. Please enter a 64-character hex key or just press ENTER.')
         process.stdout.write('> ')
         return // Don't proceed, wait for valid input
      }

      // Remove the setup listener so stdin can be used for syncing later
      process.stdin.off('data', setupListener)
      
      // Proceed to initialize the network
      await this.initializeNetwork()
    }

    process.stdin.on('data', setupListener)
  }

  async initializeNetwork() {
    // 2. Use different folders for Reader (has key) and Writer (no key)
    const storageDir = this.key ? './synkro-reader-db' : './synkro-writer-db'
    const syncDir = this.key ? './Synkro-Reader-Sync' : './Synkro-Writer-Sync'

    this.fileSystem = new FileSync(storageDir, syncDir)
    const store = await this.fileSystem.init(this.key)

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
    
   // 3. Set up the manual sync trigger (pressing Enter)
    process.stdin.on('data', async (data) => {
      if (data.includes('\n')) {
        if (!this.key) {
          // If Writer -> Upload
          await this.fileSystem.mirrorToDrive()
        } else {
          // If Reader -> Download (Manual Pull Fallback)
          console.log('\n🔄 Manually pulling changes from network...')
          await this.fileSystem.pullFromDrive()
        }
      }
    })
    
    if (!this.key) {
      console.log('💡 Tip: Drop files in "Synkro-Writer-Sync" folder and press ENTER to upload.')
    } else {
       console.log('💡 Tip: Listening for files. Press ENTER to manually download if stuck.')
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