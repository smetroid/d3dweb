<template>
  <div id="iform">
    <!--
    <v-dialog v-model="edgeModal" max-width="500">
      -->
      <v-card ref="formfields" class="mx-auto"
        @keydown.esc="keyPress($event)"
        @keypress.stop.prevent="keyPress($event)">
        <focus-trap v-model="enableTrap">
          <div tabindex="-1" class="trap is-active">
            <v-card-title class="">
                <v-row justify="center">
                  <b v-if="update">Update Edge</b>
                  <b v-else>Add Edge</b>
                </v-row>
            </v-card-title>
            <v-card-text class="blue-grey darken-4">
              <v-container fluid>
                <v-row class="ma-0" align="top">
                  <v-col 
                    cols="3"
                    class="d-flex pa-1">
                    <v-select
                      color="green"
                      outlined
                      v-model="edgeLabelType"
                      :items="edgeLabelTypeOptions"
                      label="Edge Label"
                      item-value="value"
                      item-text="label"
                      auto-select-first
                      dense
                      label-color="green"
                    ></v-select>
                  </v-col>
                  <v-col 
                    cols="3"
                    class="d-flex pa-1">
                    <v-select
                      color="green"
                      outlined
                      v-model="edgeArrowHeadStyle"
                      :items="edgeArrowHeadStyleOptions"
                      label="Edge Arrow Head Style"
                      item-value="value"
                      item-text="label"
                      auto-select-first
                      dense
                      label-color="green"
                    ></v-select>
                  </v-col>
                  <v-col 
                    cols="3"
                    class="d-flex pa-1">
                    <v-select
                      color="green"
                      outlined
                      v-model="edgeArrowHead"
                      :items="edgeArrowHeadOptions"
                      label="Edge Arrow Head"
                      item-value="value"
                      item-text="label"
                      auto-select-first
                      dense
                      label-color="green"
                    ></v-select>
                  </v-col>
                  <v-col 
                    cols="3"
                    class="d-flex pa-1">
                    <v-text-field 
                      color="green"
                      outlined
                      dense
                      v-model="fromNode"
                      label="From Node"
                      @keypress.stop="">
                    </v-text-field>
                  </v-col>
                  <v-col 
                    cols="3"
                    class="d-flex pa-1 mt-n3">
                    <v-text-field 
                      color="green"
                      outlined
                      dense
                      v-model="toNode"
                      label="To Node"
                      @keypress.stop="">
                    </v-text-field>
                  </v-col>
                  <v-col 
                    cols="6"
                    class="d-flex pa-1 mt-n3">
                    <v-textarea v-if="update" 
                      class="mb-n13"
                      dense 
                      color="green"
                      outlined
                      v-model="edgeLabel"
                      rows="3"
                      row-height="50"
                      placeholder="Add edge label... can be html"
                      ref="textField" 
                      persistent-hint=""
                      label="Edge Label"
                      @keypress.stop="">
                    </v-textarea>
                    <v-textarea v-else 
                      dense 
                      color="green"
                      outlined
                      v-model="edgeLabel"
                      rows="3"
                      row-height="50"
                      placeholder="Add edge label... can be html"
                      ref="textField" 
                      persistent-hint=""
                      label="Edge Label"
                      @keypress.stop="">
                    </v-textarea>
                  </v-col>
                </v-row>
              </v-container>
            </v-card-text>
            <v-card-actions class="pa-1">
              <v-btn v-if="update" 
                x-small
                dense 
                @keyup.enter="updateEdge()"
                class="ma-1" 
                outlined 
                color="blue"
                @click="updateEdge()" 
                @keypress.stop="">Update Edge</v-btn>
              <v-btn v-else 
                x-small
                dense
                class="ma-1" 
                outlined 
                color="green"
                @click="addEdge()" 
                @keypress.stop="">Add Edge</v-btn>
              <v-btn 
                x-small
                dense 
                class="ma-1" 
                outlined 
                color="red"
                @click="close()" 
                @keypress.stop="">Cancel</v-btn>
            </v-card-actions>
          </div>
        </focus-trap>
      </v-card>
      <!--
    </v-dialog>
    -->
  </div>
</template>
<script>
import D3Util from '@/services/D3Util'
//import DagreLib from '@/helpers/DagreLib'
export default {
  name: 'D3Edge',
  props: ['active', 'd3Data','DagreLib'],
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
    this.update = this.active == 'Edit Edge'?true:false
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
      this.fromNode = this.DagreLib.getNodeData(this.d3Data.id.v).label
      this.toNode = this.DagreLib.getNodeData(this.d3Data.id.w).label
    } else {
      this.edgeModal = false
    }

    if(this.edgeModal){
      this.$nextTick(function(){
        console.log('loginTrap active')
        this.enableTrap = this.edgeModal
      })
    }

    this.$root.$on('showEdgeForm', () => {
      console.log('Message Received From D3Vim')
      this.showForm()
    })

    this.$root.$on('edgesD3Data', (data, id) => {
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

    this.$root.$on('editEdge', () => {
      console.log('editEdge message received')
      this.editEdge()
    })
  },
  methods: {
    updateEdge () {
      if (D3Util.debug) {
        console.log(this.$el)
        console.log('addNode Function')
        console.log(this.edgeLabel)
        console.log(this.edgeArrowHeadStyle)
        console.log(this.edgeId)
        console.log(this.$data)
      }

      this.DagreLib.updateEdge(this.$data, this.edgeId)
      // this.$root.$emit('updateEdge', this.$data, this.edgeId)
      this.close()
    },
    // showForm () {
    //   this.enableTrap= true
    //   this.buttonUpdate = false
    // },
    editEdge () {
      // this.d3DagreId = this.d3DagreData.id
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
        console.log(this.DagreLib)
      }
      this.DagreLib.addEdge(this.$data)
      this.common()
      //this.$root.$emit('addDagreEdge', this.$data, false)
    },
    close () {
      console.log('close method')
      this.common()
    },
    common(){
      //this.enableTrap= false
      this.edgeModal = false
      this.hints = D3Util.removeHints(this.hints)
      this.$root.$emit("changeActive")
      this.$root.$emit("d3ResetValues")
    }
  },
  watch: {
    active: function() {
    //   console.log('active window d3EdgeForm')
    //   this.update = this.active == 'Edit Edge'?true:false
    //   if (this.active == "Edit Edge" || this.active == "Add Edge") {
    //     this.edgeModal = true
    //   } else {
    //     this.edgeModal = false
    //   }

    //   // this.edgeModal = this.active == "Edit Edge"?true:false
    //   //this.edgeModal = this.active == "Add Edge"?true:false

    //   if(this.update || this.edgeModal){
    //     this.edgeModal = true
    //     this.edgeId = this.d3Data.id
    //     this.edgeLabelType = this.d3Data.labeltype
    //     this.edgeLabel = this.d3Data.label
    //     this.edgeArrowHeadStyle = this.d3Data.arrowheadStyle
    //     this.edgeArrowHead = this.d3Data.arrowhead
    //   } else {
    //     this.edgeModal = false
    //   }

    //   if(this.edgeModal){
    //     this.$nextTick(function(){
    //       console.log('loginTrap active')
    //       this.enableTrap = this.edgeModal
    //     })
    //   }
    },
    d3Data: function(){
      //this.d3EdgesData = data
      console.log(this.d3Data)
    }
  }
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
