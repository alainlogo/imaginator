import { createApp } from 'vue'
// Polices servies par le site lui-même : aucune requête vers Google Fonts
import '@fontsource/instrument-sans/400.css'
import '@fontsource/instrument-sans/500.css'
import '@fontsource/instrument-sans/600.css'
import '@fontsource/unbounded/500.css'
import '@fontsource/unbounded/600.css'
import './style.css'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
