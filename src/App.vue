<script>
import PixelField from './components/PixelField.vue'
import { pageEnter, pageLeave, resetPage } from './utils/motion'

export default {
  name: 'App',
  components: {
    PixelField,
  },
  watch: {
    '$route.name'() {
      this.$nextTick(this.moveIndicator)
    },
  },
  mounted() {
    window.addEventListener('resize', this.onResize)
    this.moveIndicator()
    // Les polices changent la largeur des liens une fois chargées
    document.fonts?.ready.then(this.moveIndicator)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.onResize)
  },
  methods: {
    pageEnter,
    pageLeave,
    resetPage,
    onResize() {
      this.moveIndicator()
    },
    // Pastille qui glisse sous le lien actif (transition CSS)
    moveIndicator() {
      const active = this.$refs.links?.querySelector('.active')
      const pill = this.$refs.pill
      if (!active || !pill) return
      pill.style.transform = `translateX(${active.offsetLeft}px)`
      pill.style.width = `${active.offsetWidth}px`
      pill.style.opacity = 1
    },
  },
}
</script>

<template>
  <PixelField :mode="$route.name" />
  <header class="topbar">
    <nav class="nav">
      <RouterLink to="/" class="brand" aria-label="Imaginator, accueil">
        <span class="mark" aria-hidden="true"><i></i><i></i><i></i></span>
        Imaginator
      </RouterLink>
      <div ref="links" class="links">
        <span ref="pill" class="pill" aria-hidden="true"></span>
        <RouterLink to="/" class="link" exact-active-class="active">Compresser</RouterLink>
        <RouterLink to="/convertir" class="link" exact-active-class="active">Convertir</RouterLink>
        <RouterLink to="/arriere-plan" class="link" exact-active-class="active">Arrière-plan</RouterLink>
      </div>
    </nav>
  </header>
  <RouterView v-slot="{ Component }">
    <Transition :css="false" mode="out-in" appear @enter="pageEnter" @leave="pageLeave" @enter-cancelled="resetPage" @leave-cancelled="resetPage">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 14px 16px 0;
}

.nav {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 8px 0 18px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--glass);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 17px;
  letter-spacing: -0.02em;
  color: var(--text-h);
  text-decoration: none;
}

/* Un pixel : trois sous-pixels R, V, B */
.mark {
  display: inline-flex;
  gap: 2px;
}

.mark i {
  width: 5px;
  height: 16px;
  border-radius: 2px;
  background: var(--sub-r);
}

.mark i:nth-child(2) {
  background: var(--sub-g);
}

.mark i:nth-child(3) {
  background: var(--sub-b);
}

.links {
  position: relative;
  display: flex;
  gap: 2px;
  overflow-x: auto;
  scrollbar-width: none;
}

.pill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 0;
  opacity: 0;
  border-radius: 999px;
  background: var(--text-h);
  transition:
    transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (prefers-reduced-motion: reduce) {
  .pill {
    transition: none;
  }
}

.link {
  position: relative;
  padding: 9px 16px;
  white-space: nowrap;
  border-radius: 999px;
  color: var(--text);
  font-size: 15px;
  text-decoration: none;
  transition: color 0.3s;
}

.link:hover {
  color: var(--text-h);
}

.link.active {
  color: var(--bg);
  font-weight: 600;
}

@media (max-width: 560px) {
  .nav {
    padding-left: 14px;
  }

  .brand {
    font-size: 0;
    gap: 0;
  }

  .link {
    padding: 8px 12px;
    font-size: 14px;
  }
}
</style>
