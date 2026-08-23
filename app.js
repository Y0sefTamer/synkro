import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import EventEmitter from 'bare-events'
import process from 'bare-process'
import Pear from 'pear-runtime'
import FileSync from './filesync.js'

export default class App extends EventEmitter {
  constructor (opts) {
    super()
    this.opts = opts || {}
    this.swarm = null
    this.fileSystem = null
    this.key = null
    this.pear = null
  }

  async ready () {
    if (this.opts.updates !== false && this.opts.upgrade) {
      try {
        this.pear = new Pear({
          name: this.opts.name || 'synkro',
          upgrade: this.opts.upgrade,
          dir: this.opts.dir,
          app: this.opts.app
        })

        if (this.pear.updater) {
          this.pear.updater.on('updating', () => this.emit('updating'))
          this.pear.updater.on('updating-delta', (delta) => this.emit('updating-delta', delta))
          this.pear.updater.on('updated', () => this.emit('updated'))
          this.pear.updater.on('update-applied', () => this.emit('update-applied'))
          this.pear.updater.on('error', (err) => this.emit('error', err))
        }
      } catch (err) {
        this.emit('error', err)
      }
    }

    console.log('⏳ Starting Synkro P2P Network...')
    
    console.log('\n--- Synkro Setup ---')
    console.log('To CREATE a new network: Just press ENTER')
    console.log('To JOIN an existing network: Paste the 64-character Drive Key and press ENTER')
    process.stdout.write('> ')

    process.stdin.setEncoding('utf-8')
    
    const setupListener = async (input) => {
      const data = input.trim()
      
      if (data.length === 64 && /^[0-9a-fA-F]+$/.test(data)) {
        this.key = data
        console.log('\nJoining network with key: ' + this.key + '...')
      } else if (data === '') {
        console.log('\nCreating a new Synkro network...')
      } else {
        console.log('\n❌ Invalid input. Please enter a 64-character hex key or just press ENTER.')
        process.stdout.write('> ')
        return
      }

      process.stdin.off('data', setupListener)
      await this.initializeNetwork()
    }

    process.stdin.on('data', setupListener)
  }

  async update () {
    if (this.pear && this.pear.updater && typeof this.pear.updater.update === 'function') {
      return await this.pear.updater.update()
    }
  }

  async initializeNetwork () {
    const storageDir = this.key ? './synkro-reader-db' : './synkro-writer-db'
    const syncDir = this.key ? './Synkro-Reader-Sync' : './Synkro-Writer-Sync'

    this.fileSystem = new FileSync(storageDir, syncDir)
    const store = await this.fileSystem.init(this.key)

    this.swarm = new Hyperswarm()

    this.swarm.on('connection', (socket, info) => {
      const peerId = b4a.toString(info.publicKey, 'hex').slice(0, 6)
      console.log('\n✅ Peer connected! (ID: ' + peerId + ')')
      
      store.replicate(socket)

      socket.on('error', (err) => {
        if (err.code === 'ECONNRESET') {
          console.log('⚠️ Peer disconnected abruptly (ID: ' + peerId + ')')
        }
      })

      socket.on('close', () => {
        console.log('🔌 Connection closed (ID: ' + peerId + ')')
      })
    })

    const topicName = 'synkro-hackathon-room'
    const topicBuffer = b4a.alloc(32).fill(topicName)
    const discovery = this.swarm.join(topicBuffer, { server: true, client: true })

    await discovery.flushed()
    console.log('[*] Listening for peers in room: ' + topicName)
    
    process.stdin.on('data', async (data) => {
      if (data.includes('\n')) {
        if (!this.key) {
          await this.fileSystem.mirrorToDrive()
        } else {
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
    if (this.pear) await this.pear.close()
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