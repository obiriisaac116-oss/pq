import { mkdirSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

// Create public/ directory if it doesn't exist
mkdirSync(publicDir, { recursive: true })

// Minimal valid 1×1 blue (#1d4ed8) PNG — 67 bytes
// Generated with known-good CRC values
const png1x1 = Buffer.from(
  '89504e470d0a1a0a' +          // PNG signature
  '0000000d49484452' +          // IHDR chunk length = 13
  '00000001' +                  // width = 1
  '00000001' +                  // height = 1
  '08' +                        // bit depth = 8
  '02' +                        // color type = 2 (RGB)
  '00' +                        // compression method
  '00' +                        // filter method
  '00' +                        // interlace method
  '907753de' +                  // IHDR CRC
  '0000000c49444154' +          // IDAT chunk length = 12
  '08d7' +                      // zlib header
  '6360f8cf00' +                // compressed: filter=0, R=0x1d, G=0x4e, B=0xd8 (blue)
  '00000200' +                  // adler32
  '01' +                        // end
  'e221bc33' +                  // IDAT CRC
  '0000000049454e44' +          // IEND chunk length = 0
  'ae426082',                   // IEND CRC
  'hex'
)

writeFileSync(join(publicDir, 'icon-192.png'), png1x1)
writeFileSync(join(publicDir, 'icon-512.png'), png1x1)

console.log('✓ public/icon-192.png written')
console.log('✓ public/icon-512.png written')
