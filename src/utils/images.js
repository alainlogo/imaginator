import JSZip from 'jszip'

// Certains systèmes ne renseignent pas file.type : on vérifie aussi l'extension
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|avif|tiff?)$/i

export const EXTENSIONS = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/avif': 'avif',
}

export function isImageFile(file) {
  return file.type.startsWith('image/') || IMAGE_EXT.test(file.name)
}

export function baseName(fileName) {
  return fileName.replace(/\.[^.]+$/, '')
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(2)} Mo`
}

// Le navigateur retombe sur du PNG quand il ne sait pas encoder un format
export function canEncode(type) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  return canvas.toDataURL(type).startsWith(`data:${type}`)
}

/**
 * Redessine l'image dans un canvas puis l'encode dans le format demandé.
 * `background` remplit la transparence (utile pour le JPEG).
 */
export async function encodeImage(file, { type, quality = 0.9, maxWidth = Infinity, background = null }) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Échec de l’encodage'))),
      type,
      quality,
    )
  })
  return { blob, width, height }
}

export function downloadUrl(url, fileName) {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
}

/** `entries` : liste de { name, blob } */
export async function downloadZip(entries, zipName) {
  const zip = new JSZip()
  const used = new Set()
  entries.forEach(({ name, blob }) => {
    let unique = name
    // Évite d'écraser deux fichiers portant le même nom
    for (let i = 2; used.has(unique); i++) {
      unique = name.replace(/(\.\w+)$/, `-${i}$1`)
    }
    used.add(unique)
    zip.file(unique, blob)
  })
  const content = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(content)
  downloadUrl(url, zipName)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
