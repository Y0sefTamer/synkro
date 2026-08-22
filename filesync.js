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
    
    this.pull = debounce(this.pullFromDrive.bind(this))

    if (key) {
      // Force background download of the entire drive
      this.drive.download('/')
      
      // Listen for updates and trigger pull
      this.drive.core.on('append', async () => {
        console.log('\n📥 Remote changes detected, fetching files...')
        await this.pull()
      })
    }

    console.log('✅ File System Ready!')
    return this.store
  }

 // Writer: Upload to network
  async mirrorToDrive () {
    console.log('\n🔄 Uploading local changes to the Synkro network...')
    const mirrorProcess = this.local.mirror(this.drive)
    await mirrorProcess.done()
    
 
    const added = mirrorProcess.count.add || 0;
    const changed = mirrorProcess.count.change || 0;
    
    console.log(`✅ Upload complete. Added: ${added} | Changed: ${changed}`)
  }

  
  // Reader: Robust Manual Pull
  async pullFromDrive () {
    console.log('⏳ Syncing latest state from peers...')
    let count = 0;
    
    try {
      // THE MAGIC FIX: Force the drive to fetch the newest metadata from the Writer
      await this.drive.update()
      
      // Now get the list of all files
      const entries = await this.drive.entries()
      
      for await (const entry of entries) {
        const filename = entry.key
        
        // Skip metadata or hidden files
        if (filename.startsWith('.')) continue;

        console.log(`- Fetching: ${filename}`)
        
        // Read file contents from the P2P drive
        const fileBuffer = await this.drive.get(filename)
        
        if (fileBuffer) {
           // Write the contents to the Magic Sync Folder
           await this.local.put(filename, fileBuffer)
           count++;
        }
      }
      console.log(`✅ Download complete. Files processed: ${count}`)
    } catch (err) {
      console.error('❌ Error during pull:', err.message)
    }
  }
}