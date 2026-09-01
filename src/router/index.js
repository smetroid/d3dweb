import { createRouter, createWebHistory } from 'vue-router'

// Routes that render *instead of* the editor rather than on top of it. App.vue
// swaps the whole view for these, so anything that needs the editor (opening an
// imported cluster) has to wait until the app navigates off one of them.
export const FULLSCREEN_ROUTES = ['join', 'element-share', 'catalog']

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
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('@/components/AuthCallback.vue')
    }
  ]
})

export default router
