import { createRouter, createWebHistory } from 'vue-router'
import StartMenu from '../components/StartMenu.vue'
import Quiz from '../components/Quiz.vue'

const routes = [
  { path: '/', component: StartMenu },
  { path: '/uebungsmodus', component: Quiz },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
