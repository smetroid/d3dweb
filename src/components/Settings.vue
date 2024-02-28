<template>
  <div>
    <v-dialog ref="settings" v-model="settingsModal" max-width="500" @keydown.esc="common($event)">
      <focus-trap v-model="enableTrap"
        tabindex="-1"
        class="trap is-active">
        <div>
          <v-card class="mx-auto" max-width="760">
              <v-card-title
                class="headline">
                <v-row justify="center">
                  <b>Settings</b>
                </v-row>
              </v-card-title>
              <v-card-text class="blue-grey darken-4">
                <v-row align="center">
                  <v-col sm="3">
                    <span class="samus__label">Debug:</span>
                  </v-col>
                  <v-switch v-model="settings.debug">
                  </v-switch>
                </v-row>
                <v-row align="center">
                  <v-col sm="3">
                    <span class="samus__label">Reset:</span>
                  </v-col>
                  <v-switch v-model="settings.reset">
                  </v-switch>
                </v-row>
                <v-row align="center">
                  <v-col sm="3">
                    <span class="samus__label">Hints:</span>
                  </v-col>
                  <v-text-field dense outline v-model="settings.hints"
                    placeholder="asdfjklqweruiopzxcvnmgh"
                    @keypress.stop.prevent="">
                  </v-text-field>
                </v-row>
                <v-row align="center">
                  <v-col sm="3">
                    <span class="samus__label">Hint Link Color:</span>
                  </v-col>
                  <v-text-field dense outline v-model="settings.hintLinkColor"
                    placeholder=""
                    @keypress.stop.prevent="">
                  </v-text-field>
                </v-row>
                <v-row align="center">
                  <v-col sm="3">
                    <span class="samus__label">Hint Background Color:</span>
                  </v-col>
                  <v-text-field dense outline v-model="settings.hintBGColor"
                    placeholder=""
                    @keypress.stop.prevent="">
                  </v-text-field>
                </v-row>
                <v-row align="center">
                  <v-col sm="3">
                    <span class="samus__label">D3 Edge Line:</span>
                  </v-col>
                  <v-radio-group row dense v-model="settings.d3Line">
                    <v-radio dense v-for="n in d3EdgeLine"
                      :key="n.value"
                      :label="`${n.label}`"
                      :value="n.value"></v-radio>
                  </v-radio-group>
                </v-row>
              </v-card-text>
              <v-card-actions>
                <v-btn dense color="green" @click="save()">Save</v-btn>
                <v-spacer></v-spacer>
                <v-btn dense class="ma-2" outlined color="red"
                  @click="close()">Close</v-btn>
              </v-card-actions>
          </v-card>
        </div>
      </focus-trap>
    </v-dialog>
  </div>
</template>
<script>
import D3Util from '@/services/D3Util'
import VueCookies from 'vue-cookies'
// Vue.use(VueCookies)
// import VueCookie from '@/'
export default {
  name: 'Settings',
  props: ['active'],
  data () {
    return {
      options: [],
      gNavLi: null,
      settingsModal: false,
      enableTrap: false,
      theme: null,
      debug: null,
      settings: {},
      d3EdgeLine: [{"value":"curveBasis", "label":"Curve Basis"},
        {"default":"Default"}, {"value":"mindMap", "label": "Mind Map"}]
    }
  },
  mounted () {
    //if (D3Util.debug) {
    //  localStorage.getItem('token')
    //}
    console.log('active window watch')
    this.settingsModal = this.active == "Settings"?true:false
    // console.log(this.settingsModal)
    this.$nextTick(function(){
      console.log('settingsTrap active')
      this.enableTrap = this.settingsModal
    })
    //this.$root.$on('settings', () => {
    //  if (D3Util.debug) {
    //    console.log('settings event received')
    //  }
    //  this.settings = this.getSettings()
    //  this.settingsModal = true
    //  this.enableTrap = true
    //})
  },
  methods: {
    getSettings () {
      var setSettings = {}
      var defaults = D3Util.settings()
      for (var key in defaults) {
        if (key === "debug") {
          setSettings[key] = Boolean(VueCookies.get(key) === 'true')
        } else {
          setSettings[key] = VueCookies.get(key)
        }
        if (D3Util.debug) {
          console.log(key)
        }
      }

      if (D3Util.debug) {
        console.log(setSettings)
      }

      return setSettings

    },
    close () {
      this.common()
    },
    save () {
      var defaults = D3Util.settings()
      for (var key in defaults) {
        VueCookies.set(key, this.settings[key])
        if (D3Util.debug) {
          console.log(key)
          console.log(this.settings[key])
        }
      }
      this.$root.$emit('appMessage', true, 'Settings saved')
      this.common()
    },
    resetSettings () {
      // remove all the site cookies and reload defaults
      var defaults = D3Util.settings()
      for (var key in defaults) {
        this.settings[key] = defaults[key]
        if (D3Util.debug) {
          console.log(key)
          console.log(defaults[key])
        }
      }
    },
    common () {
      this.enableTrap = false
      this.settingsModal = false
      this.$root.$emit("changeActive")
    }
  },
  watch: {
    active: function() {
    //   console.log('active window watch')
    //   this.settingsModal = this.active == "Settings"?true:false
    //   this.$nextTick(function(){
    //     console.log('settingsTrap active')
    //     this.enableTrap = this.settingsModal
    //   })
    }
  }
}
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.samus__label {
  color: #42b983;
  font-weight: 1000;
}

</style>
