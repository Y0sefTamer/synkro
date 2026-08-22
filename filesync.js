import Corestore from 'corestore'
import Localdrive from 'localdrive'
import Hyperdrive from 'hyperdrive'
import debounce from 'debounceify'
import b4a from 'b4a'

export default class FileSync {
  constructor (storageDir = './meshdrive-db', syncDir = './MeshDrive-Sync') {
    // Hidden database for P2P storage
    this.store = new Corestore(storageDir)
    
    // The magic folder users will interact with
    this.local = new Localdrive(syncDir)
    
    // We will initialize the drive later once we have the key
    this.drive = null 
  }

  async init (key = null) {
    console.log('📂 Initializing File System...')
    
    // If a key is provided, we act as a Reader. Otherwise, we act as a Writer.
    if (key) {
      this.drive = new Hyperdrive(this.store, b4a.from(key, 'hex'))
    } else {
      this.drive = new Hyperdrive(this.store)
    }

    await this.drive.ready()
    console.log(`🔑 Drive Key: ${b4a.toString(this.drive.key, 'hex')}`)
    
    this.mirror = debounce(this.mirrorToDrive.bind(this))
    
    // Auto-sync when remote changes occur (for readers)
    this.drive.core.on('append', async () => {
      console.log('📥 Remote changes detected, syncing to local folder...')
      const mirrorProcess = this.drive.mirror(this.local)
      await mirrorProcess.done()
      console.log(`✅ Download complete.`)
    })

    console.log('✅ File System Ready!')
    return this.store
  }

  // Call this manually (e.g., on Enter key) to push local changes to the network
  async mirrorToDrive () {
    console.log('🔄 Syncing local changes to the network...')
    const mirrorProcess = this.local.mirror(this.drive)
    await mirrorProcess.done()
    console.log(`✅ Sync complete. Files mirrored: ${mirrorProcess.count}`)
  }

  getStore () {
    return this.store
  }
}