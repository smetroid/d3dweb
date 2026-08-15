import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/join/:token',
      name: 'join',
      component: () => import('@/components/JoinView.vue')
    }
  ]
})

export default router
