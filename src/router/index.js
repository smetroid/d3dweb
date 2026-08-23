import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/join/:token',
      name: 'join',
      component: () => import('@/components/JoinView.vue')
    },
    {
      path: '/element-share/:token',
      name: 'element-share',
      component: () => import('@/components/SharedClusterPreview.vue'),
      props: true
    },
    {
      path: '/catalog',
      name: 'catalog',
      component: () => import('@/components/CatalogView.vue')
    }
  ]
})

export default router
