// frontend/src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia' // 确保从 'pinia' 导入
import App from './App.vue'
// 如果你有全局样式，取消下面这行的注释并确保文件存在
// import './style.css' 

const app = createApp(App)

const pinia = createPinia() // 创建 Pinia 实例
app.use(pinia) // 使用 Pinia 插件

app.mount('#app')
