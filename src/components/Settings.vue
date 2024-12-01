<template>
  <div>
    <v-dialog
      ref="settings"
      v-model="settingsModal"
      max-width="600"
      @keydown.esc="common($event)"
      >
      <focus-trap
        v-model:active="settingsModal"
        class="trap is-active">
        <div tabindex="0">
          <v-card
            class="text-primary"
            >
              <v-card-title
                class="bg-primary d-flex justify-center">
                  <b>Settings</b>
              </v-card-title>
              <v-alert 
                variant="tonal"
                type="info"
                icon="$info"
                text="You need to reload the page for these settings to take effect"
              />
              <v-card-text
                color="primary"
                class="">
                <v-switch
                  hide-details
                  color="primary"
                  v-model="settings.d3dInfo"
                  label="Enable d3Info ... useful for debugging"
                >
                </v-switch>
                <v-switch
                  hide-details
                  color="primary"
                  v-model="settings.debug"
                  label="Enable console debugging"
                >
                </v-switch>
                <v-switch
                  hide-details
                  color="primary"
                  v-model="settings.showHelpPane"
                  label="Show Help Pane"
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
                  inline
                  label="Edge Line"
                  color="primary"
                  v-model="settings.d3Line">
                  <v-radio
                    dense v-for="n in d3EdgeLine"
                    :key="n.value"
                    :label="`${n.label}`"
                    :value="n.value">
                  </v-radio>
                </v-radio-group>
                <v-radio-group 
                  inline
                  label="Theme Options"
                  color="primary"
                  v-model="settings.defaultTheme">
                  <v-radio
                    dense v-for="n in settings.themes"
                    :key="n.value"
                    :label="`${n.label}`"
                    :value="n.value">
                  </v-radio>
                </v-radio-group>
                <v-btn 
                  color="red"
                  v-model="settings.reset"
                  @click="resetSettings()"
                >
                  Reset Settings 
                </v-btn>
              </v-card-text>
              <v-card-actions 
                class="bg-primary">
                <v-btn 
                  variant="outlined"
                  class="bg-green"
                  @click="save()">Save</v-btn>
                <v-spacer></v-spacer>
                <v-btn 
                  variant="outlined"
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
import D3Util from '@/helpers/D3Util'
// Vue.use(VueCookies)
// import VueCookie from '@/'
export default {
  name: 'SettingsDialog',
  props: ['active'],
  data () {
    return {
      settingsModal: null,
      settings: {},
      d3EdgeLine: [
        {'value':'curveBasis', 'label':'Basis'},
        {'value':'curveLinear', 'label':'Linear'},
        {'value':'curveStep', 'label': 'Step'},
        {'value':'curveStepAfter', 'label':'StepAfter'},
        {'value':'curveStepBefore', 'label':'StepBefore'},
      ]
    }
  },
  mounted () {
    console.log('settings')
    // setting defaults on load or load from saved settings
    let getSettings = this.$cookies.get('settings')
    if (getSettings) {
      for (let key in getSettings) {
        if (
          (key === 'debug') ||
          (key === 'helpPane') ||
          (key === 'd3dInfo') ||
          (key === 'reset')) {
          getSettings[key] = Boolean(getSettings[key])
        }
      }
      this.settings = getSettings
    } else {
      console.log('setting defaults')
      getSettings = D3Util.appDefaults()
      this.$cookies.set('settings', getSettings)
    }

    if (D3Util.debug) {
      console.log(getSettings)
    }
    this.settings = getSettings
    
    /*NOTE - Help Pane toggle
    */
    this.emitter.emit('showHelp')

    this.emitter.on('settings', () => {
      if (D3Util.debug) {
        console.log('settings event received')
      }
      this.settingsModal = true
    })
  },
  methods: {
    close () {
      this.common()
    },
    save () {
      this.$cookies.set('settings', this.settings)
      this.emitter.emit('appMessage', {status: 'success', message: 'Settings saved'})
      this.common()
    },
    resetSettings () {
      // remove all the site cookies and reload defaults
      let defaults = D3Util.appDefaults()
      this.settings = defaults
      this.$cookies.set('settings', this.settings)
    },
    common () {
      this.settingsModal = false
      this.emitter.emit("changeActive")
    }
  },
  watch: {
    active: function() {
    //   console.log('active window watch')
    //   this.settingsModal = this.active == "Settings"?true:false
    //   this.$nextTick(function(){
    //     console.log('settingsTrap active')
    //   })
    }
  }
}
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
