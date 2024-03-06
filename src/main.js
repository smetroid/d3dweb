import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css' // Ensure you are using css-loader
const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi'
  },
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

//setting cookies globally
import VueCookies from 'vue-cookies'

const app = createApp(App)
app.use(router)
app.use(vuetify)
app.use(VueCookies)
app.component('FocusTrap', FocusTrap)
app.config.globalProperties.emitter = emitter
app.mount('#app')
