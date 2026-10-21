<script>
import ImageDropzone from '../components/ImageDropzone.vue'
import SplitTitle from '../components/SplitTitle.vue'
import { vPop } from '../utils/motion'
import { EXTENSIONS, baseName, canEncode, downloadUrl, downloadZip, encodeImage, formatSize } from '../utils/images'

const ALL_FORMATS = [
  { type: 'image/png', label: 'PNG', lossy: false, transparency: true },
  { type: 'image/jpeg', label: 'JPEG', lossy: true, transparency: false },
  { type: 'image/webp', label: 'WebP', lossy: true, transparency: true },
  { type: 'image/avif', label: 'AVIF', lossy: true, transparency: true },
]

let nextId = 1

export default {
  name: 'ConvertView',
  components: {
    ImageDropzone,
    SplitTitle,
  },
  directives: {
    pop: vPop,
  },
  data() {
    return {
      images: [],
      // Seuls les formats que ce navigateur sait encoder
      formats: ALL_FORMATS.filter((f) => canEncode(f.type)),
      format: 'image/png',
      quality: 90,
      background: '#ffffff',
      isConverting: false,
      isZipping: false,
    }
  },
  computed: {
    hasImages() {
      return this.images.length > 0
    },
    doneImages() {
      return this.images.filter((img) => img.status === 'done')
    },
    selectedFormat() {
      return this.formats.find((f) => f.type === this.format)
    },
  },
  beforeUnmount() {
    this.images.forEach(this.revokeUrls)
  },
  methods: {
    formatSize,
    addFiles(files) {
      files.forEach((file) => {
        this.images.push({
          id: nextId++,
          file,
          sourceExt: (file.name.split('.').pop() || '?').toLowerCase(),
          previewUrl: URL.createObjectURL(file),
          status: 'pending',
          blob: null,
          ext: null,
          resultUrl: null,
          error: null,
        })
      })
    },
    async convertAll() {
      this.isConverting = true
      for (const img of this.images) {
        await this.convert(img)
      }
      this.isConverting = false
    },
    async convert(img) {
      img.status = 'working'
      img.error = null
      if (img.resultUrl) {
        URL.revokeObjectURL(img.resultUrl)
        img.resultUrl = null
      }
      try {
        const { blob } = await encodeImage(img.file, {
          type: this.format,
          quality: this.quality / 100,
          background: this.selectedFormat.transparency ? null : this.background,
        })
        img.blob = blob
        img.ext = EXTENSIONS[this.format]
        img.resultUrl = URL.createObjectURL(blob)
        img.status = 'done'
      } catch (err) {
        img.status = 'error'
        img.error = err.message || 'Image illisible'
      }
    },
    outputName(img) {
      return `${baseName(img.file.name)}.${img.ext}`
    },
    download(img) {
      downloadUrl(img.resultUrl, this.outputName(img))
    },
    async downloadAll() {
      this.isZipping = true
      try {
        const entries = this.doneImages.map((img) => ({ name: this.outputName(img), blob: img.blob }))
        await downloadZip(entries, 'images-converties.zip')
      } finally {
        this.isZipping = false
      }
    },
    remove(img) {
      this.revokeUrls(img)
      this.images = this.images.filter((i) => i.id !== img.id)
    },
    clearAll() {
      this.images.forEach(this.revokeUrls)
      this.images = []
    },
    revokeUrls(img) {
      URL.revokeObjectURL(img.previewUrl)
      if (img.resultUrl) URL.revokeObjectURL(img.resultUrl)
    },
  },
}
</script>

<template>
  <main class="page">
    <header class="page-header">
      <SplitTitle text="Convertir des images" />
      <p>Changez le format de vos images (PNG, JPEG, WebP…) directement dans le navigateur.</p>
    </header>

    <ImageDropzone @files="addFiles" />

    <section v-if="hasImages" class="settings">
      <label>
        Convertir en
        <select v-model="format">
          <option v-for="f in formats" :key="f.type" :value="f.type">{{ f.label }}</option>
        </select>
      </label>
      <label v-if="selectedFormat.lossy">
        Qualité : <strong>{{ quality }} %</strong>
        <input v-model.number="quality" type="range" min="10" max="100" step="5" />
      </label>
      <label v-if="!selectedFormat.transparency">
        Couleur de fond (transparence)
        <input v-model="background" type="color" />
      </label>
      <div class="actions">
        <button class="primary" :disabled="isConverting" @click="convertAll">
          {{ isConverting ? 'Conversion…' : `Convertir en ${selectedFormat.label}` }}
        </button>
        <button class="ghost" :disabled="isConverting" @click="clearAll">Tout effacer</button>
      </div>
    </section>

    <section v-if="doneImages.length" class="summary">
      <span>{{ doneImages.length }} / {{ images.length }} image(s) converties</span>
      <button class="primary" :disabled="isZipping || isConverting" @click="downloadAll">
        {{ isZipping ? 'Préparation…' : 'Tout télécharger (.zip)' }}
      </button>
    </section>

    <ul v-if="hasImages" class="list">
      <li v-for="img in images" :key="img.id" class="item" v-pop>
        <img :src="img.resultUrl || img.previewUrl" :alt="img.file.name" class="thumb" />
        <div class="info">
          <span class="name" :title="img.file.name">{{ img.file.name }}</span>
          <span class="sizes">
            <span class="badge">{{ img.sourceExt }}</span>
            {{ formatSize(img.file.size) }}
            <template v-if="img.status === 'done'">
              → <span class="badge">{{ img.ext }}</span>
              <strong>{{ formatSize(img.blob.size) }}</strong>
            </template>
          </span>
          <span v-if="img.status === 'working'" class="status">Conversion…</span>
          <span v-else-if="img.status === 'error'" class="status loss">Erreur : {{ img.error }}</span>
        </div>
        <div class="item-actions">
          <button v-if="img.status === 'done'" class="primary small" @click="download(img)">Télécharger</button>
          <button class="ghost small" :disabled="img.status === 'working'" @click="remove(img)" aria-label="Retirer">✕</button>
        </div>
      </li>
    </ul>
  </main>
</template>
