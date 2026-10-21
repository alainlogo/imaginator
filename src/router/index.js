import { createRouter, createWebHistory } from 'vue-router'
import CompressView from '../views/CompressView.vue'
import ConvertView from '../views/ConvertView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'compress', component: CompressView, meta: { title: 'Compresser' } },
    { path: '/convertir', name: 'convert', component: ConvertView, meta: { title: 'Convertir' } },
    {
      path: '/arriere-plan',
      name: 'background',
      // Chargée à la demande : embarque le moteur d'IA
      component: () => import('../views/BackgroundView.vue'),
      meta: { title: 'Arrière-plan' },
    },
  ],
})
