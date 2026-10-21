<script>
// Titre découpé en lettres pour l'animation d'entrée (mots gardés insécables)
export default {
  name: 'SplitTitle',
  props: {
    text: { type: String, required: true },
  },
  computed: {
    words() {
      return this.text.split(' ').map((word) => Array.from(word))
    },
  },
}
</script>

<template>
  <h1 class="split-title" :aria-label="text">
    <template v-for="(chars, w) in words" :key="w">
      <span class="word" aria-hidden="true"><span v-for="(c, i) in chars" :key="i" class="char">{{ c }}</span></span>{{ ' ' }}
    </template>
  </h1>
</template>

<style scoped>
.split-title {
  perspective: 600px;
}

.word {
  display: inline-block;
  white-space: nowrap;
}

.char {
  display: inline-block;
  transform-origin: 50% 100%;
}
</style>
