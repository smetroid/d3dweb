import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/collab-poc',
      name: 'collab-poc',
      component: () => import('@/components/CollabPoc.vue')
    }
  ]
})

export default router
