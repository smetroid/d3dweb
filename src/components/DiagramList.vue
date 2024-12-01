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
            :headers="headers"
            :items="diagrams"
            item-value="id"
            :search="search"
            :items-per-page="itemsPerPage"
            :page="page"
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
              <tr :id=item.id :style="selectedRowId == item.id ? 'background: orange;' : ''" >
                <td>{{ item.id }}</td>
                <td>{{ item.name }}</td>
                <td>{{ item.description }}</td>
                <td>
                  <span>{{ new Date(item.created).toLocaleString() }}</span>
                </td>
                <td>
                  <span>{{ new Date(item.updated).toDateString() }}</span>
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
import D3Util from '@/helpers/D3Util.js'
import D3DApi from '@/services/api'
export default {
  name: 'DiagramList',
  props: ['active'],
  data () {
    return {
      listTrap: null,
      diagramListModal: null,
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
        {title: 'Description', key: 'description', sortable: true},
        {title: 'Created', key: 'created', sortable: true},
        {title: 'Updated', key: 'updated', sortable: true},
        {title: 'Actions', key: 'actions', sortable: false},
      ],
      diagrams: [],
      page: 1,
      itemsPerPage: 5,
      displayedItems: []
    }
  },
  computed: {
    formTitle () {
      return this.editedIndex === -1 ? 'New Item' : 'Edited Item'
    },
    totalPages () {
      let pages = Math.ceil(this.diagrams.length / this.itemsPerPage)
      return pages
    },
  },
  mounted () {
    //REVIEW - Not sure I need this during mount
    // this is normaly being called from another component
    // or link 
    //if (localStorage.getItem('token')) {
    //  console.log('Getting diagrams from server')
    //  this.getDiagrams()
    //} else {
    //  console.log('Getting diagrams from LocalStorage')
    //  this.getLocalDiagrams()
    //}

    /* this may no longer be needed
      We need this for the trap else the trap does not work
      NOTE: we can probably just remove this and use the showDiagramList
      emitter
    */
    //this.$nextTick(function(){
    //  console.log('DiagramList Trap Active')
    //  this.listTrap = this.diagramListModal
    //})

    this.emitter.on('showDiagramList', (data) => {
      //this.diagramListModal = true
      this.diagramId = data.diagramId
      this.name = data.name
      this.description = data.description
      this.diagram = data.diagram

      if (localStorage.getItem('token')) {
        console.log('Getting diagrams from server')
        this.getDiagrams()
      } else {
        console.log('Getting diagrams from LocalStorage')
        this.getLocalDiagrams()
      }

    })
  },
  methods: {
    updatedItems() {
        if (this.search !== '') {
          this.itemsPerPage = '-1'
        } else {
          this.itemsPerPage = '5'
        }
    },
    keyPress(event){
      console.log(this)
      /** NOTE - the v-data-table is no longer sending back
       * what items are currently being displayed .. this is
       * a workaround to determine what id is being displayed
       * */
      this.displayedItems = []

      let table = document.getElementById("trapDiv")
      let rows = table.getElementsByTagName("tr")

      // Loop through the rows to find those with an id property
      for (let i = 0; i < rows.length; i++) {
        let rowId = rows[i].getAttribute("id")
        if (rowId !== null) {
          this.displayedItems.push(rowId)
        }
      }
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
        this.focusedIndex = D3Util.getIndex(this.focusedIndex, event.key, this.displayedItems.length)
        this.selectedRowId = this.displayedItems[this.focusedIndex]
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
        this.deleteItem(this.selectedRowId)
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

      if (localStorage.getItem('token')) {
        D3DApi.deleteDiagram(this.selectedRowId)
        console.log('Getting diagrams from server')
        this.getDiagrams()
      } else {
        D3Util.deleteLocalEntry(this.selectedRowId)
        console.log('Getting diagrams from LocalStorage')
        this.getLocalDiagrams()
      }
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
    getDiagrams: async function() {
      var result = await D3DApi.getDiagrams()
      console.log(result)
      if (result.data === undefined) {
        let data = {status: 'info', message: 'no data found ... Login to refresh token', result: result.response }
        this.emitter.emit('appMessage', data)
        this.close()
      } else {
        console.log(new Date(result.data.dags[0].updated).toLocaleString())
        this.diagrams = result.data.dags
        this.listTrap = this.diagramListModal = true

        //this.$nextTick(function(){
        //  console.log('DiagramList Trap Active')
        //  this.listTrap = true
        //})
      }
    },
    close () {
      console.log('Close method')
      this.diagramListModal= false
      this.loginTrapActive = false
      this.emitter.emit('changeActive')
    }
  },
  watch: {
    //active: function () {
    //}
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
