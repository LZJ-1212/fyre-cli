import { createRouter, createWebHistory } from 'vue-router'

// 导入页面组件
const Home = () => import('@/views/Home.vue')
const About = () => import('@/views/About.vue')
const Contact = () => import('@/views/Contact.vue')
const NotFound = () => import('@/views/NotFound.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: '首页' }
  },
  {
    path: '/about',
    name: 'About',
    component: About,
    meta: { title: '关于' }
  },
  {
    path: '/contact',
    name: 'Contact',
    component: Contact,
    meta: { title: '联系我们' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: { title: '页面未找到' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth'
      }
    } else {
      return { top: 0, left: 0 }
    }
  }
})

// 全局路由守卫
router.beforeEach((to, from, next) => {
  // 更新页面标题
  document.title = to.meta.title ? `${to.meta.title} - {% projectName %}` : '{% projectName %}'
  next()
})

export default router