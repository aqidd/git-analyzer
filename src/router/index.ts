import { createRouter, createWebHistory } from 'vue-router'
import { useGitlabStore } from '@/stores/gitlab'
import { useGithubStore } from '@/stores/github'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import RepositoryView from '../views/RepositoryView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/repository/:type/:id',
      name: 'repository',
      component: RepositoryView,
      meta: { requiresAuth: true },
      props: true
    }
  ]
})

router.beforeEach((to, from, next) => {
  const gitlabStore = useGitlabStore()
  const githubStore = useGithubStore()
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const isAuthenticated = gitlabStore.auth.isAuthenticated || githubStore.auth.isAuthenticated

  if (requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.name === 'login' && isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router
