import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css' // 如果你有全局样式文件
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
