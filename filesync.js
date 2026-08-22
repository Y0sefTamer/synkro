import Corestore from 'corestore'
import Localdrive from 'localdrive'
import Hyperdrive from 'hyperdrive'
import debounce from 'debounceify'
import b4a from 'b4a'

export default class FileSync {
  constructor (storageDir, syncDir) {
    this.store = new Corestore(storageDir)
    this.local = new Localdrive(syncDir)
    this.drive = null 
  }

  async init (key = null) {
    console.log('📂 Initializing Synkro File System...')
    
    if (key) {
      this.drive = new Hyperdrive(this.store, b4a.from(key, 'hex'))
    } else {
      this.drive = new Hyperdrive(this.store)
    }

    await this.drive.ready()
    console.log(`🔑 Synkro Drive Key: ${b4a.toString(this.drive.key, 'hex')}`)
    
    // Setup Debounced Pull to prevent spamming
    this.pull = debounce(this.pullFromDrive.bind(this))

    if (key) {
      // 1. Tell Hyperdrive to eagerly download all file contents automatically!
      this.drive.download()
      
      // 2. Listen for new files and pull them to the local folder
      this.drive.core.on('append', async () => {
        console.log('\n📥 Remote changes detected, auto-syncing...')
        await this.pull()
      })
    }

    console.log('✅ File System Ready!')
    return this.store
  }

  // Writer calls this to UPLOAD to the network
  async mirrorToDrive () {
    console.log('\n🔄 Uploading local changes to the Synkro network...')
    const mirrorProcess = this.local.mirror(this.drive)
    await mirrorProcess.done()
    console.log(`✅ Upload complete. Files updated: ${mirrorProcess.count}`)
  }

  // Reader calls this to DOWNLOAD from the network
  async pullFromDrive () {
    const mirrorProcess = this.drive.mirror(this.local)
    await mirrorProcess.done()
    console.log(`✅ Download complete. Files updated: ${mirrorProcess.count}`)
  }
}