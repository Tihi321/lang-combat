// Renders assets/*.svg to the PNG sources used by @capacitor/assets.
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'

const dir = new URL('../assets/', import.meta.url)
const jobs = [
  ['icon-only.svg', 'icon-only.png', 1024],
  ['icon-foreground.svg', 'icon-foreground.png', 1024],
  ['icon-background.svg', 'icon-background.png', 1024],
  ['splash.svg', 'splash.png', 2732],
  ['splash.svg', 'splash-dark.png', 2732],
]
for (const [src, out, size] of jobs) {
  const svg = await readFile(new URL(src, dir))
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(new URL(out, dir).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
}
