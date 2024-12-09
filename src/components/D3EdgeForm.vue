<template>
  <div id="iform">
    <v-card
      ref="formfields"
      class="mx-auto text-indigo"
      @keyup.alt.s="updateEdge()"
      @keyup.meta.s="updateEdge()"
      @keyup.ctrl.c="close()"
      @keydown.esc="keyPress($event)"
      @keypress.stop.prevent="keyPress($event)">
      <focus-trap
        v-model:action="enableTrap">
        <div tabindex="0">
          <v-card-title class="bg-primary">
            <v-row class="pa-3" justify="center">
              <b v-if="update">Update Edge</b>
              <b v-else>Add Edge</b>
            </v-row>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pb-0">
            <v-container class="pb-0 fluid">
              <v-row
              >
                <v-col 
                  >
                  <v-select
                    v-model="edgeLabelType"
                    :items="edgeLabelTypeOptions"
                    label="Edge Label"
                    item-value="value"
                    item-title="label"
                    auto-select-first
                    label-color="green"
                  ></v-select>
                </v-col>
                <v-col
                  >
                  <v-select
                    v-model="edgeArrowHeadStyle"
                    :items="edgeArrowHeadStyleOptions"
                    label="Edge Arrow Head Style"
                    item-value="value"
                    item-title="label"
                    auto-select-first
                    label-color="green"
                  ></v-select>
                </v-col>
                <v-col
                  >
                  <v-select
                    v-model="edgeArrowHead"
                    :items="edgeArrowHeadOptions"
                    label="Edge Arrow Head"
                    item-value="value"
                    item-title="label"
                    auto-select-first
                  ></v-select>
                </v-col>
              </v-row>
              <v-row
                class="mt-n8"
              >
                <v-col
                >
                  <v-text-field 
                    v-model="fromNode"
                    label="From Node"
                    @keypress.stop="">
                  </v-text-field>
                </v-col>
                <v-col
                  >
                  <v-text-field 
                    v-model="toNode"
                    label="To Node"
                    @keypress.stop="">
                  </v-text-field>
                </v-col>
                <v-col
                >
                  <v-textarea
                    autofocus
                    class=""
                    label="Edge Label"
                    v-model="edgeLabel"
                    placeholder="Add edge label... can be html ... alt+shift+w to clear value"
                    @keypress.stop=""
                    @keydown.alt.shift.w="edgeLabel=''"
                    @keydown.meta.shift.w="edgeLabel=''"
                    clearable
                    rows="3"
                    >
                  </v-textarea>
                </v-col>
              </v-row>
            </v-container>
          </v-card-text>
          <v-divider></v-divider>
          <v-card-actions
            class="text-primary d-flex"
            >
            <v-btn v-if="update" 
              @keyup.enter="updateEdge()"
              class="text-primary" 
              variant="tonal"
              color=""
              density="comfortable"
              @click="updateEdge()" 
              @keypress.stop="">
              Update Edge (alt+s)
            </v-btn>
            <v-btn v-else 
              class="text-primary" 
              variant="tonal"
              color=""
              density="comfortable"
              @click="addEdge()" 
              @keypress.stop="">
              Add Edge (alt+s)
            </v-btn>
            <v-btn 
              class="text-primary" 
              variant="tonal"
              type="submit"
              density="comfortable"
              color=""
              @click="close()" 
              @keypress.stop=""
              >
              Cancel (ctrl+c)
            </v-btn>
          </v-card-actions>
        </div>
      </focus-trap>
    </v-card>
  </div>
</template>
<script>
import D3Util from '@/helpers/D3Util'
export default {
  name: 'D3Edge',
  props: ['active', 'd3Data'],
  inject: ['modifier'],
  data () {
    return {
      edgeModal: false,
      edgeLabelType: '',
      edgeLabel: '',
      edgeArrowHead: '',
      edgeArrowHeadStyle: '',
      enableTrap: false,
      hints: {},
      d3EdgesData: null,
      edgeId: null,
      update: false,
      edgeLabelTypeOptions: [
        {"value":"text", "label":"Text"},
        {"value":"html", "label":"HTML"}
      ],
      edgeArrowHeadStyleOptions: [
        {"value":"solid", "label":"Solid"},
        {"value":"hollow", "label":"Hollow"}
      ],
      edgeArrowHeadOptions: [
        {"value":"normal", "label":"Normal"},
        {"value": "vee", "label": "Vee"}, 
        {"value": "undirected", "label": "Undirected"}
      ],
      fromNode: '',
      toNode: ''
    }
  },
  mounted () {
    console.log('active window d3EdgeForm')
    this.update = this.active == 'Edit Edge' ? true : false
    if (this.active == "Edit Edge" || this.active == "Add Edge") {
      this.edgeModal = true
    } else {
      this.edgeModal = false
    }

    // this.edgeModal = this.active == "Edit Edge"?true:false
    //this.edgeModal = this.active == "Add Edge"?true:false

    if(this.update || this.edgeModal){
      console.log(this.d3Data)
      this.edgeModal = true
      this.edgeId = this.d3Data.id
      this.edgeLabelType = this.d3Data.labelType
      this.edgeLabel = this.d3Data.label
      this.edgeArrowHeadStyle = this.d3Data.arrowheadStyle
      this.edgeArrowHead = this.d3Data.arrowhead
      this.fromNode = this.modifier.getNodeData(this.d3Data.id.v).label
      this.toNode = this.modifier.getNodeData(this.d3Data.id.w).label
    } else {
      this.edgeModal = false
    }

    if(this.edgeModal){
      this.$nextTick(function(){
        console.log('loginTrap active')
        this.enableTrap = this.edgeModal
      })
    }

    this.emitter.on('showEdgeForm', () => {
      console.log('Message Received From D3Vim')
      this.showForm()
    })

    this.emitter.on('edgesD3Data', (data, id) => {
      console.log('edgesD3Data message received')
      if (D3Util.debug) {
        console.log(data.labeltype)
        console.log(data)
        console.log(id)
      }
      this.d3EdgesData = data
      this.edgeId = id
      this.edgeLabelType = data.labelType
      this.edgeLabel = data.label
      this.edgeArrowHeadStyle = data.arrowheadStyle
      this.edgeArrowHead = data.arrowhead
    })

    this.emitter.on('editEdge', () => {
      console.log('editEdge message received')
      this.editEdge()
    })
  },
  methods: {
    updateEdge () {
      if (D3Util.debug) {
        console.log(this.$el)
        console.log('updateEdge Function')
        console.log(this.edgeLabel)
        console.log(this.edgeArrowHeadStyle)
        console.log(this.edgeId)
        console.log(this.$data)
      }

      this.modifier.updateEdge(this.$data, this.edgeId)
      this.close()
    },
    editEdge () {
      console.log(this.d3EdgesData)
      this.buttonUpdate = true
      this.enableTrap = true
    },
    keyPress(event) {
      this.hints = D3Util.formHints(event, this)
    },
    addEdge () {
      if (D3Util.debug) {
        console.log(this.$el)
        console.log('addEdge Function')
        console.log(this.edgeLabel)
        console.log(this.edgeLabelType)
        console.log(this.edgeArrowHead)
        console.log(this.edgeArrowHeadStyle)
        console.log(this.edgeId)
        console.log(this.$data)
        console.log(this.modifier)
      }
      this.modifier.addEdge(this.$data)
      this.common()
      //this.$root.$emit('addDagreEdge', this.$data, false)
    },
    close () {
      console.log('close method')
      this.common()
    },
    common(){
      /*REVIEW - this code is the same for both forms */
      //this.enableTrap= false
      this.edgeModal = false
      this.hints = D3Util.removeHints(this.hints)
      this.emitter.emit('setSheetToFalse')
      //this.emitter.emit("changeActive")
      //this.emitter.emit("d3ResetValues")
    }
  },
  // watch: {
  //   active: function() {
  //   },
  //   d3Data: function(){
  //     //this.d3EdgesData = data
  //     console.log(this.d3Data)
  //   }
  // }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1, h2 {
  font-weight: normal;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
}

.hints{
  border: 1px solid magenta;
  color: magenta;
  /*# display: table-caption; */
}

#iform {
  /*
  color: #42b983;
  margin: auto;
  background: #343a40;
  border-radius: 15px;
  width: 40%;
  padding: 10px 10px 10px 10px;
  bottom: auto;
  */
}

.trap.is-active {
  brackground: #f3c5f5;
}

.samus__label {
  color: #42b983;
  font-weight: 1000;
}

</style>
