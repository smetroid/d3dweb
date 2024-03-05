<template>
  <div>
    <v-dialog
      ref="settings"
      v-model="settingsModal"
      max-width="500"
      @keydown.esc="common($event)"
      >
      <focus-trap v-model:active="enableTrap"
        class="trap is-active">
        <div tabindex="0">
          <v-card
            class="text-primary"
            >
              <v-card-title
                class="bg-primary d-flex justify-center">
                  <b>Settings</b>
              </v-card-title>
              <v-card-text
                color="primary"
                class="">
                <v-switch
                  color="primary"
                  v-model="settings.debug"
                  label="Debug"
                >
                </v-switch>
                <v-switch
                  color="primary"
                  v-model="settings.showHelp"
                  label="Help Pane"
                >
                </v-switch>
                <v-switch 
                  color="primary"
                  v-model="settings.reset"
                  label="Reset"
                >
                </v-switch>
                <v-text-field
                  v-model="settings.hints"
                  label="Hints"
                  placeholder="asdfjklqweruiopzxcvnmgh"
                  @keypress.stop.prevent="">
                </v-text-field>
                <v-text-field 
                  v-model="settings.hintLinkColor"
                  label="Hint Link Color"
                  placeholder=""
                  @keypress.stop.prevent="">
                </v-text-field>
                <v-text-field 
                  label="Hint Background Color"
                  v-model="settings.hintBGColor"
                  placeholder=""
                  @keypress.stop.prevent="">
                </v-text-field>
                <v-radio-group 
                  label="D3 Edge Line"
                  color="primary"
                  v-model="settings.d3Line">
                  <v-radio dense v-for="n in d3EdgeLine"
                    :key="n.value"
                    :label="`${n.label}`"
                    :value="n.value"></v-radio>
                </v-radio-group>
              </v-card-text>
              <v-card-actions 
                class="bg-primary">
                <v-btn 
                  class="bg-green"
                  @click="save()">Save</v-btn>
                <v-spacer></v-spacer>
                <v-btn 
                  class="bg-red"
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
  name: 'SettingsDialog',
  props: ['active'],
  data () {
    return {
      options: [],
      showHelp: false,
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

</style>
