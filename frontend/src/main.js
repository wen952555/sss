import { createApp } from 'vue'
import { createPinia } from 'pinia' // If using Pinia
import App from './App.vue'
import router from './router'
import './assets/main.css' // Global CSS

const app = createApp(App)

app.use(createPinia()) // If using Pinia
app.use(router)

app.mount('#app')
