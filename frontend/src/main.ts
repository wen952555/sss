import { createApp } from 'vue';
import App from './App.vue';
import pinia from './store';
// import './assets/main.css'; // 如果你有全局CSS

const app = createApp(App);
app.use(pinia);
app.mount('#app');
