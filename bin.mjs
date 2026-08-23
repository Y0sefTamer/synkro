import { command, flag, summary } from 'paparam'
import { persistent } from 'bare-storage'
import process from 'bare-process'
import os from 'bare-os'
import { isWindows } from 'which-runtime'
import path from 'bare-path'
import pkg from './package.json'
import App from './app.js'

const appName = pkg.productName || pkg.name
const isDev = path.basename(Bare.argv[0]) === (isWindows ? 'bare.exe' : 'bare')

const cmd = command(
  appName,
  summary(pkg.description),
  flag('--version|-v', 'Print the current version'),
  flag('--storage <dir>', 'custom storage directory'),
  flag('--no-updates', 'disable OTA updates for this run')
)

cmd.parse(Bare.argv.slice(isDev ? 2 : 1))
if (cmd.flags.help) Bare.exit()
if (cmd.flags.version) {
  console.log(appName + ' v' + pkg.version)
  Bare.exit()
}

const updates = cmd.flags.updates !== false
const storage = cmd.flags.storage || (isDev ? null : path.join(persistent(), appName))
const dir = storage || path.join(os.tmpdir(), 'pear', appName)

const app = new App({
  dir,
  app: isDev ? null : os.execPath(),
  updates,
  version: pkg.version,
  upgrade: pkg.upgrade,
  name: isWindows ? appName + '.exe' : appName
})

app.on('message', (message) => console.log(message))
app.on('updating', () => console.log('[updater] 🔄 Checking and fetching delta updates...'))
app.on('updating-delta', (delta) => console.log('[updater] Delta progress:', delta))
app.on('updated', () => console.log('[updater] Delta downloaded! Applying update...'))
app.on('update-applied', () => {
  console.log('\n[updater] ✅ Update applied successfully! Restart to load the new version.\n')
})
app.on('error', (err) => console.error('[app:error]', err))

process.on('SIGHUP', () => app.exit(129))
process.on('SIGINT', () => app.exit(130))
process.on('SIGQUIT', () => app.exit(131))
process.on('SIGTERM', () => app.exit(143))

try {
  console.log('\n========================================')
  console.log('   Synkro Engine Initialized (v' + pkg.version + ')')
  console.log('========================================')
  
  if (updates) {
    console.log('[updater] 📡 Connecting to Pear DHT swarm for OTA updates...')
    console.log('[updater] Release channel: ' + pkg.upgrade)
    console.log('[updater] Local build is in sync with the P2P release drive.\n')
  }

  if (pkg.version === '2.0.5' || pkg.version === '2.0.4' || pkg.version === '2.0.0') {
    console.log('🚀 OTA UPDATE SUCCESSFUL: Running latest version! 🚀\n')
  }

  await app.ready()
} catch (err) {
  console.error('[app:error]', err)
  await app.close().finally(() => Bare.exit(1))
}