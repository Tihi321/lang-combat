// Runs the Gradle wrapper in android/ on any OS: node scripts/gradle.mjs bundleRelease
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const win = process.platform === 'win32'
const cwd = fileURLToPath(new URL('../android/', import.meta.url))
const r = spawnSync(win ? 'gradlew.bat' : './gradlew', process.argv.slice(2), {
  cwd,
  stdio: 'inherit',
  shell: win,
})
process.exit(r.status ?? 1)
