<template>
  <div>
    <v-dialog
      v-model="diagramListModal" 
      scrollable
      @keydown.esc="close($event, $refs)"
      @keydown.stop="keyPress($event, $refs)"
      >
      <focus-trap
        v-model:active="listTrap">
        <div
          class="pa-1 ml-1 mr-1 pitch-mixin2"
          data-augmented-ui="tl-2-clip-x tr-2-clip-x both"
          id="trapDiv"
          tabindex="0"
          >
          <v-data-table
            color="primary"
            ref="list"
            :headers="headers"
            :items="diagrams"
            item-value="name"
            item-key="key"
            :search="search"
            :items-per-page="itemsPerPage"
            class="elevation-1"
            :page.sync="page"
            >
            <template v-slot:top>
              <v-text-field
                @keypress.stop=""
                v-model="search" label="Search String" class="x-4" />
            </template>

            <template v-slot:item="{ item }">
              <tr item=item :class="selectedRowId == item.key ? 'orange' : ''" >
                <td>{{ item.id }}</td>
                <td>{{ item.name }}</td>
                <td>{{ item.description }}</td>
                <td>
                    <span>{{ new Date(item.createTime).toLocaleString() }}</span>
                </td>
                <td>
                    <span>{{ new Date(item.updatedTime).toLocaleString() }}</span>
                </td>
                <v-icon
                  small
                  class="mr-2"
                  @click="editItem(item)"
                >
                  mdi-pencil
                </v-icon>
                <v-icon
                  small
                  @click="deleteItem(item)"
                >
                  mdi-delete
                </v-icon>
              </tr>
            </template>
            <template v-slot:no-data>
              <!--
                <v-btn color="primary" @click="initialize">Reset</v-btn>
              -->
            </template>
          </v-data-table>
        </div>
      </focus-trap>
    </v-dialog>
    <v-dialog v-model="smallDialog" max-width="500px">
      <v-card>
        <v-card-title>
          <span class="headline">{{ formTitle}}</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12" sm="6" md="4">
                <v-text-field v-model="editedItem.name" label="Name"></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" sm="6" md="4">
                <v-textarea v-model="editedItem.description" label="Description"></v-textarea>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" sm="6" md="4">
                <v-textarea v-model="editedItem.diagram" label="Diagram"></v-textarea>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
					<v-spacer></v-spacer>
					<v-btn color="red darken-1" outlined text @click="close">Cancel</v-btn>
					<v-btn color="green darken-1" outlined text @click="save">Save</v-btn>
					</v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
import D3VimApi from '@/services/api/SamusApi'
import D3Util from '@/services/D3Util'
export default {
  name: 'DiagramList',
  props: ['active'],
  data () {
    return {
      listTrap: null,
      diagramListModal: true,
      focusedIndex: null,
      selectedRow: null,
      selectedRowId: null,
      search: '',
      smallDialog: false,
      editedIndex: -1,
      editedItem: {
        name: '',
        description: '',
        diagram: '',
      },
      headers: [
        {title: 'Id', key: 'id', sortable: false},
        {title: 'Name', key: 'name', sortable: true},
        {title: 'Description', key: 'description'},
        {title: 'Created', key: 'created'},
        {title: 'Updated', key: 'updated'},
        {title: 'Actions', key: 'actions', sortable: false},
      ],
      diagrams: [],
      page: 1,
      itemsPerPage: 5
    }
  },
  computed: {
    formTitle () {
      return this.editedIndex === -1 ? 'New Item' : 'Edited Item'
    },
    totalPages () {
      var pages = Math.ceil(this.diagrams.length / this.itemsPerPage)
      return pages
    }
  },
  mounted () {
    // if (D3Util.debug) {
    //   localStorage.getItem('token')
    // }

    // if (localStorage.getItem('token') == null) {
    //   D3VimApi.auth()
    //   this.visible = true
    // } else {
    //   this.visible = false
    // }
    /* for when we have a database backend ready
    this.getDiagrams()
    */
    this.getLocalDiagrams()
    console.log('diagram list')
    console.log(this.active)
    //this.diagramListModal = this.active == "Open"?true:false

    /* this may no longer be needed
    */
    this.$nextTick(function(){
      console.log('menuTrap active')
      this.listTrap = this.diagramListModal
    })

    //this.getDiagrams()
    //this.diagramListModal = true
    this.emitter.on('showDiagramList', (data) => {
      //this.listTrap = true
      this.diagramListModal = true
      this.diagramId = data.diagramId
      this.name = data.name
      this.description = data.description
      this.diagram = data.diagram
      this.getDiagrams()
    })
  },
  methods: {
    keyPress(event){
      //console.log(event)
      /*
      1. get list of tr's

        */
      //var tableRows = this.$refs.list.$el.querySelectorAll('tbody > tr')
      // var items = this.$refs.list.selectableItems.length
      //var items = this.$refs.list.items

      //console.log(items)
      switch(event.key){
        case '/':
          // data = {aciveWindow: "Menu", trap: 'd3ActionsTrap'}
          // console.log(component.activeWindow)
          //component.active = 'Menu'
          //component.menuTrap = true
          break;
          // return data
        case 'Escape':  //
          /*On escape setting activeWindow D3Dagre */
          // component.active = 'D3Dagre'
          // component.menuTrap = false
          // component.showMenu = false
          break
        // case 'j':
        //   this.focusedIndex = D3Util.getIndex(this.focusedIndex, event.key, this.itemsPerPage)
        //   break
        // case 'k':
        //   this.focusedIndex = D3Util.getIndex(this.focusedIndex, event.key, this.itemsPerPage)
        //   break
        // case 'l':
        //   this.page = D3Util.getPage(this.page, event.key, this.totalPages)
        //   //this.focusedIndex = 0
        //   break
        // case 'h':
        //   this.page = D3Util.getPage(this.page, event.key, this.totalPages)
        //   //this.focusedIndex = 0
        //   break
        case 'Enter':
          if (D3Util.debug){
            // console.log('enter')
            // console.log(component.$refs.menu[component.gNavMenu])
            // console.log(component.gNavMenu)
            // console.log(component.selectedUrl)
          }
          // component.$refs.menu[component.gNavMenu].$el.click()
          // //this.addNodeFormVisible = true
          // //console.log(this.addNodeFormVisible)
          // // this.navAction(ref)
          // component.d3ActionsTrap = false
          // component.fab = false
          break
        case 'f':
          // var text = document.createTextNode('f')
          // let node = '<div class="hints"> ff </div>'
          //component.navActions = !component.navActions
          var hrefs = document.querySelectorAll('a')
          console.log(hrefs)
          //component.forwardHrefs(hrefs)
          // this.addFollowLinks()
          break
        default:
          console.log('App Event Key Default')
          //data = {aciveWindow: "Main", trap: ''}
          // return data
      }

      if (event.key == "j" || event.key == "k"){
        this.focusedIndex = D3Util.getIndex(this.focusedIndex, event.key, this.itemsPerPage)
        console.log(this.$refs.list.selectableItems[this.focusedIndex])
        this.selectedRow = this.$refs.list.selectableItems[this.focusedIndex]
        this.selectedRowId = this.$refs.list.selectableItems[this.focusedIndex].id
      }

      if (event.key == "l" || event.key == "h"){
        this.page = D3Util.getPage(this.page, event.key, this.totalPages)
      }

      if (event.key == "Enter"){
        console.log("openDiagram")
        this.diagramListModal = false
        this.emitter.emit("openDiagram", this.selectedRowId)
        this.emitter.emit("changeActive")
      }

      if (event.key == "x"){
        console.log(this.$refs)
        this.deleteItem(this.selectedRow)
      }
    },
    save (){
    },
    editItem (item) {
      this.editedIndex = this.diagrams.indexOf(item)
      this.editedItem = Object.assign({}, item)
      this.smallDialog = true
      if(D3Util.debug){
        console.log(item)
      }
    },
    deleteItem (item) {
      if (D3Util.debug) {
        console.log(item)
      }
      const index= this.diagrams.indexOf(item)
      console.log(index)
      this.diagrams.splice(index, 1)
      D3VimApi.deleteDiagram(this.selectedRowId)
    },
    filter (value, search) {
      return value != null &&
        search != null &&
        typeof value === 'string' &&
        value.toString().indexOf(search) !== -1
    },
    getLocalDiagrams: function() {
      let items = [];
      for (let i = 0; i < localStorage.length; i++) {
          let key = localStorage.key(i);
          /*NOTE - only get the localitems that start with D3D_*/
          if (key.startsWith('D3D_')) {
            let item = JSON.parse(localStorage.getItem(key))
            item.id = key
            items.push(item);
          }
      }
      console.log(items)
      this.diagrams = items;
    },
    /*NOTE - for when a database backend is ready
    getDiagrams: async function() {
      var result = await D3VimApi.getDiagrams()
      console.log(result)
      this.diagrams = result.data.dags
    },
    */
    close () {
      console.log('Close method')
      this.diagramListModal= false
      this.loginTrapActive = false
      this.emitter.emit('changeActive')
      // this.$root.$emit('d3DagreActivate')
      // this.$root.$emit('showForm', 'node')
    }
  },
  watch: {
    active: function () {
    //   console.log('diagram list')
    //   console.log(this.activeWindow)
    //   this.diagramListModal = this.active == "Open"?true:false
    //   this.$nextTick(function(){
    //     console.log('menuTrap active')
    //     this.listTrap = this.diagramListModal
    //   })
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.pitch-mixin2 {
  width: 100%;
  --aug-tr: 25px;
  --aug-b-extend1: 10%;

  --aug-border-all: 1px;

  --aug-inlay-all: 1px;
  --aug-border-bg: green;
  /*--aug-inlay-bg: radial-gradient(green, black);*/
  --aug-inlay-opacity: 0.1;
}
</style>
