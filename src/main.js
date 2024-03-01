import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
const vuetify = createVuetify({
  components,
  directives,
  ssr: true,
  theme: {
    defaultTheme: 'light'
  }
})

// Focus-trap
import { FocusTrap } from 'focus-trap-vue'

import mitt from 'mitt'
const emitter = mitt()

const app = createApp(App)
app.use(router)
app.use(vuetify)
app.component('FocusTrap', FocusTrap)
app.config.globalProperties.emitter = emitter
app.mount('#app')
