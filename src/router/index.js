import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/collab-poc',
      name: 'collab-poc',
      component: () => import('@/components/CollabPoc.vue')
    },
    {
      path: '/collab-cyto-poc',
      name: 'collab-cyto-poc',
      component: () => import('@/components/CollabCytoPoc.vue')
    }
  ]
})

export default router
