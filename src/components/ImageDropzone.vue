<script>
import { gsap } from 'gsap'
import { formatSize, isImageFile } from '../utils/images'
import { prefersReducedMotion } from '../utils/motion'

// Au-delà, le décodage peut saturer la mémoire et figer l'onglet
const MAX_FILE_SIZE = 50 * 1024 * 1024

export default {
  name: 'ImageDropzone',
  emits: ['files'],
  data() {
    return {
      isDragging: false,
      rejected: '',
    }
  },
  methods: {
    openPicker() {
      this.$refs.fileInput.click()
    },
    openFolderPicker() {
      this.$refs.folderInput.click()
    },
    onFileChange(event) {
      this.emitFiles(event.target.files)
      // Permet de re-sélectionner les mêmes fichiers
      event.target.value = ''
    },
    onDrop(event) {
      this.isDragging = false
      this.emitFiles(event.dataTransfer.files)
    },
    emitFiles(fileList) {
      const images = Array.from(fileList).filter(isImageFile)
      const files = images.filter((file) => file.size <= MAX_FILE_SIZE)
      const skipped = images.length - files.length
      this.rejected = skipped
        ? `${skipped} image(s) ignorée(s) : ${formatSize(MAX_FILE_SIZE)} maximum par fichier.`
        : ''
      if (!files.length) return
      this.$emit('files', files)
      // Onde de choc dans le champ de pixels + rebond de la zone
      window.dispatchEvent(new CustomEvent('imaginator:burst'))
      if (!prefersReducedMotion()) {
        gsap.fromTo(this.$el, { scale: 0.985 }, { scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.4)' })
      }
    },
  },
}
</script>

<template>
  <section
    class="dropzone"
    :class="{ dragging: isDragging }"
    @click="openPicker"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
  >
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      hidden
      @click.stop
      @change="onFileChange"
    />
    <input
      ref="folderInput"
      type="file"
      webkitdirectory
      multiple
      hidden
      @click.stop
      @change="onFileChange"
    />
    <span class="glyph" aria-hidden="true"><i></i><i></i><i></i></span>
    <strong>Cliquez pour sélectionner une ou plusieurs images</strong>
    <span>Maintenez Ctrl (ou Maj) pour en choisir plusieurs, Ctrl+A pour toutes — ou glissez-les ici</span>
    <button type="button" class="ghost small folder-btn" @click.stop="openFolderPicker">
      Choisir un dossier entier
    </button>
    <p v-if="rejected" class="rejected" role="alert">{{ rejected }}</p>
  </section>
</template>

<style scoped>
.dropzone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 56px 20px 44px;
  border: 1px dashed var(--border-strong);
  border-radius: 28px;
  background: var(--glass);
  backdrop-filter: blur(18px) saturate(1.3);
  -webkit-backdrop-filter: blur(18px) saturate(1.3);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.3s, background 0.3s;
}

.dropzone:hover,
.dropzone.dragging {
  border-color: var(--sub-g);
  background: var(--glass-strong);
}

.glyph {
  display: inline-flex;
  gap: 4px;
  margin-bottom: 14px;
}

.glyph i {
  width: 10px;
  height: 34px;
  border-radius: 4px;
  background: var(--sub-r);
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.glyph i:nth-child(2) {
  background: var(--sub-g);
  transition-delay: 0.04s;
}

.glyph i:nth-child(3) {
  background: var(--sub-b);
  transition-delay: 0.08s;
}

.dropzone:hover .glyph i,
.dropzone.dragging .glyph i {
  transform: translateY(-6px) scaleY(1.15);
}

.dropzone strong {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 1.1rem;
  letter-spacing: -0.02em;
  color: var(--text-h);
}

.dropzone span {
  color: var(--muted);
  font-size: 14px;
  max-width: 48ch;
}

.rejected {
  margin: 12px 0 0;
  color: var(--danger);
  font-size: 14px;
}

.folder-btn {
  margin-top: 16px;
}

@media (prefers-reduced-motion: reduce) {
  .glyph i {
    transition: none;
  }
}
</style>
