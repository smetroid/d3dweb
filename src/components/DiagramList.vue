<template>
  <div>
    <v-dialog
      v-model="diagramListModal" 
      scrollable
      @keydown.esc="close($event, $refs)"
      @keydown.stop="keyPress($event, $refs)"
      >
      <focus-trap
        v-model:active="listTrap"
        :delayInitialFocus="true"
        :initial-focus="()=>$refs.wrapper"
      >
        <div
          ref="wrapper"
          id="trapDiv"
          tabindex="0"
        >
          <v-data-table
            tabindex="1"
            ref="list"
            v-model="selected"
            :headers="headers"
            :items="diagrams"
            item-key="id"
            :search="search"
            :items-per-page="itemsPerPage"
            :page="page"
            @update:currentItems="updatedItems()"
          >
            <template v-slot:top>
              <v-text-field
                @keypress.stop=""
                v-model="search"
                label="Search String"
                class="" />
            </template>
            <template 
            v-slot:item="{ item }">
              <tr item=item hover=true :style="selectedRowId == item.id ? 'background: orange;' : ''" >
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
      selected: [],
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
    },
    // itemsInList () {
    //   /* we need the start item and the last item */
    //   let startIndex = this.page * this.itemsPerPage
    //   let endIndex = startIndex + this.itemsPerPage
    //   let currentPageItems = this.diagrams.slice(startIndex, endIndex)
    //   return currentPageItems
    // }
  },
  mounted () {
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
      console.log('DiagramList Trap Active')
      this.listTrap = this.diagramListModal
    })

    //this.getDiagrams()
    this.diagramListModal = true
    //this.listTrap = this.diagramListModal
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
    updatedItems(list) {
      console.log(list)
      console.log(this)
      console.log('running this')
    },
    keyPress(event){
      console.log(this)
      //console.log(event)
      /*
      1. get list of tr's

        */
      //var tableRows = this.$refs.list.$el.querySelectorAll('tbody > tr')
      // var items = this.$refs.list.items.length
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
        case 'Enter':
          if (D3Util.debug){
            // console.log('enter')
            // console.log(component.$refs.menu[component.gNavMenu])
            // console.log(component.gNavMenu)
            // console.log(component.selectedUrl)
          }
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
        console.log(this.itemsInList)
        console.log(this.focusedIndex)
        this.focusedIndex = D3Util.getIndex(this.focusedIndex, event.key, this.itemsPerPage)
        console.log(this.focusedIndex)
        /** workaround to determine what id is being displayed */
        let table = document.getElementById("trapDiv");
        let rows = table.getElementsByTagName("tr");
        console.log(rows)



        console.log(this)
        console.log(this.$refs)
        console.log(this.$refs.list)
        console.log(this.$refs.list.items[this.focusedIndex])
        this.selectedRow = this.$refs.list.items[this.focusedIndex]
        console.log(this.selectedRow)
        this.selectedRowId = this.$refs.list.items[this.focusedIndex].id
        console.log(this.selectedRowId)
      }

      if (event.key == "l" || event.key == "h"){
        console.log('l or h')
        this.page = D3Util.getPage(this.page, event.key, this.totalPages)
        console.log(this.page)
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
    }
  },
  watch: {
    active: function () {
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
