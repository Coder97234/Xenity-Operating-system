// Xenity disc image.
//
// Builds a real, mountable ISO 9660 image in the browser — no backend and no
// build step — carrying a launcher page and the release notes under the volume
// label XENITY. The disc is El Torito bootable: its 16-bit boot sector starts
// on BIOS machines and in virtual machines and prints the Xenity boot banner.
// Xenity itself then runs from the web build, so the disc carries a boot
// loader, not a Linux kernel.

import { CODENAME, VERSION } from './updater'

const SECTOR = 2048
const enc = new TextEncoder()

function u16le(b, o, v) {
  b[o] = v & 0xff
  b[o + 1] = (v >>> 8) & 0xff
}

function u16be(b, o, v) {
  b[o] = (v >>> 8) & 0xff
  b[o + 1] = v & 0xff
}

function u32le(b, o, v) {
  b[o] = v & 0xff
  b[o + 1] = (v >>> 8) & 0xff
  b[o + 2] = (v >>> 16) & 0xff
  b[o + 3] = (v >>> 24) & 0xff
}

function u32be(b, o, v) {
  b[o] = (v >>> 24) & 0xff
  b[o + 1] = (v >>> 16) & 0xff
  b[o + 2] = (v >>> 8) & 0xff
  b[o + 3] = v & 0xff
}

function both16(b, o, v) {
  u16le(b, o, v)
  u16be(b, o + 2, v)
}

function both32(b, o, v) {
  u32le(b, o, v)
  u32be(b, o + 4, v)
}

function text(b, o, len, value) {
  for (let i = 0; i < len; i++) b[o + i] = i < value.length ? value.charCodeAt(i) : 32
}

function dirTime(b, o, date) {
  b[o] = Math.max(0, date.getUTCFullYear() - 1900)
  b[o + 1] = date.getUTCMonth() + 1
  b[o + 2] = date.getUTCDate()
  b[o + 3] = date.getUTCHours()
  b[o + 4] = date.getUTCMinutes()
  b[o + 5] = date.getUTCSeconds()
  b[o + 6] = 0
}

function asciiTime(b, o, date) {
  const two = (n) => String(n).padStart(2, '0')
  const stamp = `${String(date.getUTCFullYear()).padStart(4, '0')}${two(date.getUTCMonth() + 1)}${two(
    date.getUTCDate()
  )}${two(date.getUTCHours())}${two(date.getUTCMinutes())}${two(date.getUTCSeconds())}00`
  for (let i = 0; i < stamp.length; i++) b[o + i] = stamp.charCodeAt(i)
  b[o + 16] = 0
}

function dirRecord(name, extent, size, date, isDir = false) {
  const record = new Uint8Array(33 + name.length + (name.length % 2 === 0 ? 1 : 0))
  record[0] = record.length
  both32(record, 2, extent)
  both32(record, 10, size)
  dirTime(record, 18, date)
  record[25] = isDir ? 2 : 0
  record[26] = 0
  record[27] = 0
  both16(record, 28, 1)
  record[32] = name.length
  record.set(name, 33)
  return record
}

// 16-bit real-mode boot sector: clears the screen, prints the banner, halts.
function bootSector() {
  const code = [
    0xfa, // cli
    0x31, 0xc0, // xor ax, ax
    0x8e, 0xd0, // mov ss, ax
    0xbc, 0x00, 0x7c, // mov sp, 0x7c00
    0x8e, 0xd8, // mov ds, ax
    0xfb, // sti
    0xb8, 0x03, 0x00, // mov ax, 0x0003 (80x25 text mode)
    0xcd, 0x10, // int 0x10
    0xbe, 0x21, 0x7c, // mov si, 0x7c21 (message)
    0xac, // lodsb
    0x84, 0xc0, // test al, al
    0x74, 0x06, // jz halt
    0xb4, 0x0e, // mov ah, 0x0e
    0xcd, 0x10, // int 0x10
    0xeb, 0xf5, // jmp print
    0xf4, // hlt
    0xeb, 0xfd, // jmp halt
  ]
  const message =
    'Xenity 1.4.1 (Nova)\r\n' +
    'xenity-core boot loader\r\n' +
    '\r\n' +
    'Booting from this disc works. The Xenity desktop itself runs\r\n' +
    'from the web build - mount the disc and open XENITY.HTM.\r\n' +
    '\r\n'
  const image = new Uint8Array(512)
  image.set(code, 0)
  for (let i = 0; i < message.length; i += 1) image[code.length + i] = message.charCodeAt(i)
  image[510] = 0x55
  image[511] = 0xaa
  return image
}

function bootCatalog(imageSector) {
  const catalog = new Uint8Array(SECTOR)

  // Validation entry (32 bytes).
  catalog[0] = 0x01
  catalog[1] = 0x00
  catalog[30] = 0x55
  catalog[31] = 0xaa
  let sum = 0
  for (let i = 0; i < 32; i += 2) {
    const word = catalog[i] | (catalog[i + 1] << 8)
    sum = (sum + word) & 0xffff
  }
  const checksum = (0x10000 - sum) & 0xffff
  catalog[28] = checksum & 0xff
  catalog[29] = (checksum >>> 8) & 0xff

  // Initial/default entry: bootable, no emulation, 4 × 512-byte sectors.
  catalog[32] = 0x88
  catalog[33] = 0x00
  catalog[34] = 0x00
  catalog[35] = 0x00
  catalog[36] = 0x00
  catalog[38] = 0x04 // sector count, little-endian: 4 × 512 bytes
  catalog[39] = 0x00
  catalog[40] = imageSector & 0xff
  catalog[41] = (imageSector >>> 8) & 0xff
  catalog[42] = (imageSector >>> 16) & 0xff
  catalog[43] = (imageSector >>> 24) & 0xff
  return catalog
}

function bootRecordVolume(catalogSector) {
  const descriptor = new Uint8Array(SECTOR)
  descriptor[0] = 0
  descriptor.set(enc.encode('CD001'), 1)
  descriptor[6] = 1
  for (let i = 0; i < 23; i += 1) descriptor[7 + i] = 'EL TORITO SPECIFICATION'.charCodeAt(i)
  u32le(descriptor, 71, catalogSector)
  return descriptor
}

function launcherPage() {
  const site = typeof window !== 'undefined' ? window.location.origin : 'https://xenity.os'
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Xenity ${VERSION} (${CODENAME})</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
         font: 15px/1.6 -apple-system, "SF Pro Text", "Segoe UI", system-ui, sans-serif;
         color: #10203a; background: #eef3ff; }
  main { width: min(560px, 100%); padding: 40px 36px; border-radius: 24px; background: #fff;
         box-shadow: 0 30px 70px -40px rgba(16, 32, 58, .45), inset 0 0 0 1px rgba(16, 32, 58, .06); }
  .mark { width: 62px; height: 62px; border-radius: 17px; display: grid; place-items: center;
          background: linear-gradient(160deg, #4fb0ff, #0a5cff); color: #fff; font-size: 28px; font-weight: 600; }
  h1 { margin: 18px 0 4px; font-size: 26px; letter-spacing: -.02em; }
  p { margin: 0 0 18px; color: #5b6a85; }
  a { display: inline-block; padding: 11px 20px; border-radius: 11px; text-decoration: none;
      color: #fff; font-weight: 600; background: #0a84ff; }
  ul { margin: 22px 0 0; padding-left: 18px; color: #5b6a85; font-size: 14px; }
</style>
</head>
<body>
<main>
  <div class="mark">X</div>
  <h1>Xenity ${VERSION}</h1>
  <p>${CODENAME} — a light, web-native operating system.</p>
  <a href="${site}">Boot Xenity</a>
  <ul>
    <li>A real window server, shell, file system and package store.</li>
    <li>Measured in kilobytes, not gigabytes.</li>
    <li>Your files live in the browser, never on this disc.</li>
  </ul>
</main>
</body>
</html>
`
}

function releaseNotes(now) {
  return `XENITY ${VERSION} (${CODENAME})
Disc image built ${now.toISOString().slice(0, 10)}

Xenity is a light, web-native operating system: a window server, shell,
file system and package store running in a single web process.

CONTENTS
  README.TXT   this file
  XENITY.HTM   launcher page — open it in any browser

BOOTING
Start this disc in a BIOS machine or a virtual machine (QEMU, VirtualBox,
VMware). Its El Torito boot loader prints the Xenity boot banner, then the
desktop itself runs from the web build — this disc carries the Xenity boot
loader and launcher, not a Linux kernel.

UPDATES
On every boot Xenity removes only its own old artefacts:
/var/cache/xenity-* directories and xenity.system.cache.* keys. Your files,
settings, packages and notes are never read for deletion.
`
}

/** Builds the ISO 9660 image. @returns {Uint8Array} */
export function buildIso() {
  const now = new Date()
  const rootDirSector = 21
  const readmeSector = 22

  const readme = enc.encode(releaseNotes(now))
  const launcher = enc.encode(launcherPage())
  const readmeSectors = Math.max(1, Math.ceil(readme.length / SECTOR))
  const launcherSector = readmeSector + readmeSectors
  const launcherSectors = Math.max(1, Math.ceil(launcher.length / SECTOR))
  const catalogSector = launcherSector + launcherSectors
  const bootImageSector = catalogSector + 1
  const totalSectors = bootImageSector + 4

  // Root directory: itself, its parent, then the two files.
  const rootDir = new Uint8Array(SECTOR)
  let at = 0
  for (const record of [
    dirRecord(new Uint8Array([0]), rootDirSector, SECTOR, now, true),
    dirRecord(new Uint8Array([0]), rootDirSector, SECTOR, now, true),
    dirRecord(enc.encode('README.TXT;1'), readmeSector, readme.length, now),
    dirRecord(enc.encode('XENITY.HTM;1'), launcherSector, launcher.length, now),
  ]) {
    rootDir.set(record, at)
    at += record.length
  }

  const primary = new Uint8Array(SECTOR)
  primary[0] = 1
  primary.set(enc.encode('CD001'), 1)
  primary[6] = 1
  text(primary, 8, 32, '')
  text(primary, 40, 32, 'XENITY')
  both32(primary, 80, totalSectors)
  both16(primary, 120, 1)
  both16(primary, 124, 1)
  both16(primary, 128, SECTOR)
  both32(primary, 132, 10)
  u32le(primary, 140, 19)
  u32le(primary, 144, 0)
  u32be(primary, 148, 20)
  u32be(primary, 152, 0)
  primary.set(dirRecord(new Uint8Array([0]), rootDirSector, SECTOR, now, true), 156)
  text(primary, 190, 128, 'XENITY')
  text(primary, 318, 128, 'XENITY')
  text(primary, 446, 128, 'XENITY')
  text(primary, 574, 128, `XENITY ${VERSION} (${CODENAME})`)
  text(primary, 702, 37, '')
  text(primary, 739, 37, '')
  text(primary, 776, 37, '')
  asciiTime(primary, 813, now)
  asciiTime(primary, 830, now)
  asciiTime(primary, 847, now)
  asciiTime(primary, 864, now)
  primary[881] = 1

  const terminator = new Uint8Array(SECTOR)
  terminator[0] = 255
  terminator.set(enc.encode('CD001'), 1)
  terminator[6] = 1

  const pathL = new Uint8Array(SECTOR)
  pathL[0] = 1
  u32le(pathL, 2, rootDirSector)
  u16le(pathL, 6, 1)
  const pathM = new Uint8Array(SECTOR)
  pathM[0] = 1
  u32be(pathM, 2, rootDirSector)
  u16be(pathM, 6, 1)

  const image = new Uint8Array(totalSectors * SECTOR)
  image.set(primary, 16 * SECTOR)
  image.set(bootRecordVolume(catalogSector), 17 * SECTOR)
  image.set(terminator, 18 * SECTOR)
  image.set(pathL, 19 * SECTOR)
  image.set(pathM, 20 * SECTOR)
  image.set(rootDir, rootDirSector * SECTOR)
  image.set(readme, readmeSector * SECTOR)
  image.set(launcher, launcherSector * SECTOR)
  image.set(bootCatalog(bootImageSector), catalogSector * SECTOR)
  image.set(bootSector(), bootImageSector * SECTOR)
  return image
}

export function isoFilename() {
  return `xenity-${VERSION}-${CODENAME.toLowerCase()}.iso`
}

/** Hands the image to the browser as a file download. */
export function downloadIso(bytes = buildIso()) {
  const blob = new Blob([bytes], { type: 'application/x-iso9660-image' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const name = isoFilename()
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
  return { name, size: bytes.length }
}
