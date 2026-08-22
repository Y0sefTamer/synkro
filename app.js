const Pear = require('pear')


const worker = Pear.worker.run('main.js')

console.log('⏳ Starting MeshDrive...')


worker.on('message', (msg) => {
  if (msg.type === 'peer_connected') {
    console.log(`\n✅ Peer connected! (ID: ${msg.peerId})`)
  } else if (msg.type === 'data_received') {
    console.log(`📥 Data from friend: ${msg.data}`)
  }
})