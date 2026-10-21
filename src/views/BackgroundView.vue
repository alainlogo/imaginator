<script>
import ImageDropzone from '../components/ImageDropzone.vue'
import SplitTitle from '../components/SplitTitle.vue'
import { vPop } from '../utils/motion'
import { baseName, downloadUrl, downloadZip, encodeImage, formatSize } from '../utils/images'

const MODELS = [
  { value: 'isnet_quint8', label: 'Rapide (~40 Mo)' },
  { value: 'isnet_fp16', label: 'Équilibré (~80 Mo)' },
  { value: 'isnet', label: 'Précis (~170 Mo)' },
]

let nextId = 1

export default {
  name: 'BackgroundView',
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
      models: MODELS,
      model: 'isnet_fp16',
      useBackground: false,
      background: '#ffffff',
      isProcessing: false,
      isZipping: false,
      // Progression du téléchargement du modèle (premier usage seulement)
      downloadProgress: null,
    }
  },
  computed: {
    hasImages() {
      return this.images.length > 0
    },
    doneImages() {
      return this.images.filter((img) => img.status === 'done')
    },
    previewStyle() {
      return this.useBackground ? { background: this.background } : null
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
          resultUrl: null,
          error: null,
        })
      })
    },
    async processAll() {
      this.isProcessing = true
      try {
        // Chargement à la demande : la bibliothèque est lourde
        const { removeBackground } = await import('@imgly/background-removal')
        for (const img of this.images) {
          if (img.status !== 'done') await this.process(img, removeBackground)
        }
      } catch (err) {
        this.images
          .filter((img) => img.status === 'pending')
          .forEach((img) => {
            img.status = 'error'
            img.error = err.message || 'Chargement impossible'
          })
      } finally {
        this.isProcessing = false
        this.downloadProgress = null
      }
    },
    async process(img, removeBackground) {
      img.status = 'working'
      img.error = null
      try {
        const blob = await removeBackground(img.file, {
          model: this.model,
          output: { format: 'image/png' },
          progress: this.onProgress,
        })
        img.blob = blob
        img.resultUrl = URL.createObjectURL(blob)
        img.status = 'done'
      } catch (err) {
        img.status = 'error'
        img.error = err.message || 'Traitement impossible'
      }
    },
    onProgress(key, current, total) {
      if (!key.startsWith('fetch')) return
      this.downloadProgress = current < total ? Math.round((current / total) * 100) : null
    },
    reset(img) {
      if (img.resultUrl) URL.revokeObjectURL(img.resultUrl)
      img.blob = null
      img.resultUrl = null
      img.status = 'pending'
    },
    onModelChange() {
      // Un autre modèle donne un autre résultat : on relance tout
      this.images.forEach(this.reset)
    },
    async finalBlob(img) {
      if (!this.useBackground) return img.blob
      const { blob } = await encodeImage(img.blob, { type: 'image/png', background: this.background })
      return blob
    },
    outputName(img) {
      return `${baseName(img.file.name)}-sans-fond.png`
    },
    async download(img) {
      const blob = await this.finalBlob(img)
      const url = URL.createObjectURL(blob)
      downloadUrl(url, this.outputName(img))
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
    async downloadAll() {
      this.isZipping = true
      try {
        const entries = await Promise.all(
          this.doneImages.map(async (img) => ({ name: this.outputName(img), blob: await this.finalBlob(img) })),
        )
        await downloadZip(entries, 'images-sans-fond.zip')
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
      <SplitTitle text="Retirer l’arrière-plan" />
      <p>
        Détourez automatiquement vos images grâce à une IA qui tourne dans le navigateur.
        Le modèle est téléchargé au premier usage, puis gardé en cache.
      </p>
    </header>

    <ImageDropzone @files="addFiles" />

    <section v-if="hasImages" class="settings">
      <label>
        Modèle
        <select v-model="model" :disabled="isProcessing" @change="onModelChange">
          <option v-for="m in models" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </label>
      <label>
        Nouveau fond
        <select v-model="useBackground">
          <option :value="false">Transparent</option>
          <option :value="true">Couleur unie</option>
        </select>
      </label>
      <label v-if="useBackground">
        Couleur
        <input v-model="background" type="color" />
      </label>
      <div class="actions">
        <button class="primary" :disabled="isProcessing" @click="processAll">
          {{ isProcessing ? 'Traitement…' : 'Retirer l’arrière-plan' }}
        </button>
        <button class="ghost" :disabled="isProcessing" @click="clearAll">Tout effacer</button>
      </div>
      <div v-if="downloadProgress !== null" class="progress">
        <span>Téléchargement du modèle : {{ downloadProgress }} %</span>
        <div class="bar"><div class="fill" :style="{ width: downloadProgress + '%' }"></div></div>
      </div>
    </section>

    <section v-if="doneImages.length" class="summary">
      <span>{{ doneImages.length }} / {{ images.length }} image(s) détourées</span>
      <button class="primary" :disabled="isZipping || isProcessing" @click="downloadAll">
        {{ isZipping ? 'Préparation…' : 'Tout télécharger (.zip)' }}
      </button>
    </section>

    <ul v-if="hasImages" class="grid">
      <li v-for="img in images" :key="img.id" class="card" v-pop>
        <div class="preview" :class="{ checker: img.status === 'done' && !useBackground }" :style="img.status === 'done' ? previewStyle : null">
          <img :src="img.resultUrl || img.previewUrl" :alt="img.file.name" :class="{ dim: img.status === 'working' }" />
          <span v-if="img.status === 'working'" class="overlay">Traitement…</span>
        </div>
        <div class="card-body">
          <span class="name" :title="img.file.name">{{ img.file.name }}</span>
          <span v-if="img.status === 'error'" class="status loss">Erreur : {{ img.error }}</span>
          <span v-else class="sizes">{{ formatSize(img.file.size) }}</span>
          <div class="item-actions">
            <button v-if="img.status === 'done'" class="primary small" @click="download(img)">Télécharger</button>
            <button class="ghost small" :disabled="img.status === 'working'" @click="remove(img)" aria-label="Retirer">✕</button>
          </div>
        </div>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.progress {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}

.bar {
  height: 6px;
  border-radius: 3px;
  background: var(--border);
  overflow: hidden;
}

.fill {
  height: 100%;
  background: linear-gradient(90deg, var(--sub-r), var(--sub-g), var(--sub-b));
  transition: width 0.2s;
}

.grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}

.card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--glass);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  overflow: hidden;
}

.preview {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}

/* Damier pour visualiser la transparence */
.preview.checker {
  background-color: #fff;
  background-image:
    linear-gradient(45deg, #ddd 25%, transparent 25%),
    linear-gradient(-45deg, #ddd 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ddd 75%),
    linear-gradient(-45deg, transparent 75%, #ddd 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
}

.preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.preview img.dim {
  opacity: 0.4;
}

.overlay {
  position: absolute;
  font-weight: 600;
  color: var(--text-h);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  font-size: 14px;
}

.card-body .item-actions {
  justify-content: flex-end;
  margin-top: 4px;
}
</style>
