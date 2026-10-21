<script>
import ImageDropzone from '../components/ImageDropzone.vue'
import SplitTitle from '../components/SplitTitle.vue'
import { vPop } from '../utils/motion'
import { EXTENSIONS, baseName, downloadUrl, downloadZip, encodeImage, formatSize } from '../utils/images'

let nextId = 1

export default {
  name: 'CompressView',
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
      quality: 75,
      maxWidth: 1920,
      format: 'image/webp',
      isCompressing: false,
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
    totalOriginal() {
      return this.doneImages.reduce((sum, img) => sum + img.file.size, 0)
    },
    totalCompressed() {
      return this.doneImages.reduce((sum, img) => sum + img.blob.size, 0)
    },
    totalSaving() {
      return this.savingPercent(this.totalOriginal, this.totalCompressed)
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
          previewUrl: URL.createObjectURL(file),
          status: 'pending',
          blob: null,
          ext: null,
          resultUrl: null,
          width: null,
          height: null,
          error: null,
        })
      })
    },
    async compressAll() {
      this.isCompressing = true
      for (const img of this.images) {
        await this.compress(img)
      }
      this.isCompressing = false
    },
    async compress(img) {
      img.status = 'working'
      img.error = null
      if (img.resultUrl) {
        URL.revokeObjectURL(img.resultUrl)
        img.resultUrl = null
      }
      try {
        const { blob, width, height } = await encodeImage(img.file, {
          type: this.format,
          quality: this.quality / 100,
          maxWidth: this.maxWidth,
          // Le JPEG ne gère pas la transparence : fond blanc
          background: this.format === 'image/jpeg' ? '#fff' : null,
        })
        img.blob = blob
        img.ext = EXTENSIONS[this.format]
        img.resultUrl = URL.createObjectURL(blob)
        img.width = width
        img.height = height
        img.status = 'done'
      } catch (err) {
        img.status = 'error'
        img.error = err.message || 'Image illisible'
      }
    },
    outputName(img) {
      return `${baseName(img.file.name)}-min.${img.ext}`
    },
    download(img) {
      downloadUrl(img.resultUrl, this.outputName(img))
    },
    async downloadAll() {
      this.isZipping = true
      try {
        const entries = this.doneImages.map((img) => ({ name: this.outputName(img), blob: img.blob }))
        await downloadZip(entries, 'images-compressees.zip')
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
    savingPercent(original, compressed) {
      if (!original) return 0
      return Math.round((1 - compressed / original) * 100)
    },
  },
}
</script>

<template>
  <main class="page">
    <header class="page-header">
      <SplitTitle text="Compresser des images" />
      <p>Réduisez le poids de vos images directement dans le navigateur.</p>
    </header>

    <ImageDropzone @files="addFiles" />

    <section v-if="hasImages" class="settings">
      <label>
        Qualité : <strong>{{ quality }} %</strong>
        <input v-model.number="quality" type="range" min="10" max="100" step="5" />
      </label>
      <label>
        Largeur max (px)
        <input v-model.number="maxWidth" type="number" min="100" step="100" />
      </label>
      <label>
        Format de sortie
        <select v-model="format">
          <option value="image/webp">WebP (recommandé)</option>
          <option value="image/jpeg">JPEG</option>
        </select>
      </label>
      <div class="actions">
        <button class="primary" :disabled="isCompressing" @click="compressAll">
          {{ isCompressing ? 'Compression…' : 'Réduire les images' }}
        </button>
        <button class="ghost" :disabled="isCompressing" @click="clearAll">Tout effacer</button>
      </div>
    </section>

    <section v-if="doneImages.length" class="summary">
      <span>
        {{ doneImages.length }} image(s) :
        {{ formatSize(totalOriginal) }} → <strong>{{ formatSize(totalCompressed) }}</strong>
        <em :class="totalSaving >= 0 ? 'gain' : 'loss'">({{ totalSaving >= 0 ? '−' : '+' }}{{ Math.abs(totalSaving) }} %)</em>
      </span>
      <button class="primary" :disabled="isZipping || isCompressing" @click="downloadAll">
        {{ isZipping ? 'Préparation…' : 'Tout télécharger (.zip)' }}
      </button>
    </section>

    <ul v-if="hasImages" class="list">
      <li v-for="img in images" :key="img.id" class="item" v-pop>
        <img :src="img.resultUrl || img.previewUrl" :alt="img.file.name" class="thumb" />
        <div class="info">
          <span class="name" :title="img.file.name">{{ img.file.name }}</span>
          <span class="sizes">
            {{ formatSize(img.file.size) }}
            <template v-if="img.status === 'done'">
              → <strong>{{ formatSize(img.blob.size) }}</strong>
              <em :class="savingPercent(img.file.size, img.blob.size) >= 0 ? 'gain' : 'loss'">
                ({{ savingPercent(img.file.size, img.blob.size) >= 0 ? '−' : '+' }}{{ Math.abs(savingPercent(img.file.size, img.blob.size)) }} %)
              </em>
              · {{ img.width }}×{{ img.height }}
            </template>
          </span>
          <span v-if="img.status === 'working'" class="status">Compression…</span>
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
