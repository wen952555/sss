import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// 导入全局 CSS (如果 App.vue 中的 <style> 标签没有 'scoped'，则已经是全局的)
// 如果有单独的全局样式文件，例如 main.css，可以在这里导入。
// import './assets/main.css' // 如果有这个文件，并且希望在这里导入

const app = createApp(App)

// 注册 Pinia
app.use(createPinia())

// 注册 Vue Router
app.use(router)

// 可以在这里注册全局指令、组件或提供全局属性等
// 例如: app.directive('focus', { /* ... */ });
// 例如: app.component('GlobalButton', GlobalButtonComponent);
// 例如: app.config.globalProperties.$appName = '十三水在线';

// 全局错误处理器 (可选，但推荐)
// app.config.errorHandler = (err, instance, info) => {
//   // err: 错误对象
//   // instance: 发生错误的组件实例
//   // info: Vue 特定的错误信息，比如错误发生的生命周期钩子
//   console.error("Vue Global Error:", err);
//   console.error("Vue Instance:", instance);
//   console.error("Vue Error Info:", info);
//
//   // 在这里可以集成错误上报服务，例如 Sentry, Bugsnag 等
//   // Sentry.captureException(err, {
//   //   extra: {
//   //     vmName: instance?.$options?.name || 'UnknownComponent',
//   //     propsData: instance?.$props,
//   //     errorInfo: info,
//   //   },
//   // });
//
//   // 也可以在这里触发一个全局的用户提示，告知发生了错误
//   // 例如，通过一个全局事件总线或 store action 来显示一个错误通知
//   // eventBus.emit('global-error', '应用发生了一个意外错误，请尝试刷新页面。');
// };


app.mount('#app')
