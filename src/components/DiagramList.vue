<template>
  <Teleport to="body">
    <transition name="fx-scrim">
      <div
        v-if="diagramListModal"
        class="fx-scrim"
        @click="close($event, $refs)"
      ></div>
    </transition>
    <transition name="fx-dialog">
      <div
        v-if="diagramListModal"
        class="fx-dialog-stage"
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
            class="fx-dialog fx-dialog-wide"
            @keydown.esc="close($event, $refs)"
            @keydown.stop="keyPress($event, $refs)"
          >
            <div class="fx-panel-inner">
              <header class="fx-panel-header">
                <div class="fx-panel-title">
                  <span class="fx-title-chip fx-chip-add">OPEN</span>
                  <h2 class="fx-title">DIAGRAM</h2>
                </div>
                <button
                  type="button"
                  class="fx-close"
                  aria-label="Close diagram list"
                  @click="close($event, $refs)"
                >✕</button>
              </header>

              <div class="fx-readout">
                <span class="fx-readout-kv fx-readout-wide">
                  <span class="fx-readout-k">STORAGE</span>
                  <span class="fx-readout-v">{{ localStorage.getItem('token') ? 'Server' : 'LocalStorage' }}</span>
                </span>
                <span class="fx-readout-kv">
                  <span class="fx-readout-k">COUNT</span>
                  <span class="fx-readout-v">{{ diagrams.length }}</span>
                </span>
                <span class="fx-readout-kv">
                  <span class="fx-readout-k">NAV</span>
                  <span class="fx-readout-v">j/k · h/l · enter</span>
                </span>
              </div>

              <div class="fx-panel-body fx-table-body">
                <label class="fx-field fx-field-full">
                  <span class="fx-label">Search</span>
                  <input
                    class="fx-input"
                    type="text"
                    v-model="search"
                    placeholder="Filter diagrams ..."
                    @keypress.stop=""
                  />
                </label>

                <div class="fx-table">
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
                    <template v-slot:item="{ item }">
                      <tr
                        :id="item.id"
                        :class="{ 'fx-row-selected': selectedRowId == item.id }"
                      >
                        <td>{{ item.id }}</td>
                        <td>{{ item.name }}</td>
                        <td class="fx-cell-description">{{ item.description }}</td>
                        <td>
                          <span>{{ new Date(item.created).toLocaleString() }}</span>
                        </td>
                        <td>
                          <span>{{ new Date(item.updated).toDateString() }}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            class="fx-row-btn"
                            aria-label="Edit diagram"
                            @click.stop="editItem(item)"
                          >
                            <v-icon>mdi-pencil</v-icon>
                          </button>
                          <button
                            type="button"
                            class="fx-row-btn fx-row-btn-danger"
                            aria-label="Delete diagram"
                            @click.stop="deleteItem(item)"
                          >
                            <v-icon>mdi-delete</v-icon>
                          </button>
                        </td>
                      </tr>
                    </template>
                    <template v-slot:no-data>
                      <span class="fx-table-empty">No diagrams found</span>
                    </template>
                  </v-data-table>
                </div>
              </div>

              <footer class="fx-panel-actions">
                <button
                  type="button"
                  class="fx-btn fx-btn-primary"
                  @click="openSelected()"
                >Open <span class="fx-kbd">enter</span></button>
                <button
                  type="button"
                  class="fx-btn fx-btn-ghost"
                  @click="close($event, $refs)"
                >Close <span class="fx-kbd">{{ shortcutLabels.close }}</span></button>
              </footer>
            </div>
          </div>
        </focus-trap>
      </div>
    </transition>

    <transition name="fx-scrim">
      <div
        v-if="smallDialog"
        class="fx-scrim fx-scrim-front"
        @click="close()"
      ></div>
    </transition>
    <transition name="fx-dialog">
      <div
        v-if="smallDialog"
        class="fx-dialog-stage fx-dialog-stage-front"
      >
        <focus-trap
          v-model:active="smallDialog"
          class="trap is-active"
        >
          <div
            tabindex="0"
            class="fx-dialog"
            @keydown.esc="close()"
          >
            <div class="fx-panel-inner">
              <header class="fx-panel-header">
                <div class="fx-panel-title">
                  <span class="fx-title-chip fx-chip-edit">EDIT</span>
                  <h2 class="fx-title">{{ formTitle }}</h2>
                </div>
                <button
                  type="button"
                  class="fx-close"
                  aria-label="Close editor"
                  @click="close()"
                >✕</button>
              </header>
              <div class="fx-panel-body">
                <label class="fx-field fx-field-full">
                  <span class="fx-label">Name</span>
                  <input class="fx-input" type="text" v-model="editedItem.name" />
                </label>
                <label class="fx-field fx-field-full">
                  <span class="fx-label">Description</span>
                  <textarea class="fx-input fx-textarea" v-model="editedItem.description" rows="3"></textarea>
                </label>
                <label class="fx-field fx-field-full">
                  <span class="fx-label">Diagram <em class="fx-opt">JSON</em></span>
                  <textarea class="fx-input fx-textarea" v-model="editedItem.diagram" rows="5"></textarea>
                </label>
              </div>
              <footer class="fx-panel-actions">
                <button
                  type="button"
                  class="fx-btn fx-btn-primary"
                  @click="save()"
                >Save</button>
                <button
                  type="button"
                  class="fx-btn fx-btn-ghost"
                  @click="close()"
                >Cancel</button>
              </footer>
            </div>
          </div>
        </focus-trap>
      </div>
    </transition>
  </Teleport>
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
    shortcutLabels() {
      return D3Util.shortcutLabels()
    },
    formTitle () {
      return this.editedIndex === -1 ? 'New Item' : 'Edited Item'
    },
    totalPages () {
      let pages = Math.ceil(this.diagrams.length / this.itemsPerPage)
      return pages
    },
  },
  mounted () {
    this.emitter.on('showDiagramList', (data) => {
      this.diagramListModal = true
      this.listTrap = true
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
      if (D3Util.debug) console.log(this)
      // Typing in the search field should not trigger table navigation
      const tag = event.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

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
          break;
        case 'Escape':
          break
        case 'Enter':
          break
        case 'f':
          var hrefs = document.querySelectorAll('a')
          console.log(hrefs)
          break
        default:
          if (D3Util.debug) console.log('App Event Key Default')
      }

      if (event.key == "j" || event.key == "k"){
        this.focusedIndex = D3Util.getIndex(this.focusedIndex, event.key, this.displayedItems.length)
        this.selectedRowId = this.displayedItems[this.focusedIndex]
      }

      if (event.key == "l" || event.key == "h"){
        if (D3Util.debug) console.log('l or h')
        this.page = D3Util.getPage(this.page, event.key, this.totalPages)
        if (D3Util.debug) console.log(this.page)
      }

      if (event.key == "Enter"){
        this.openSelected()
      }

      if (event.key == "x"){
        this.deleteItem(this.selectedRowId)
      }
    },
    openSelected() {
      if (this.selectedRowId == null) {
        this.emitter.emit('appMessage', { message: 'Navigate the list with j/k to select a diagram', status: 'info' })
        return
      }
      this.diagramListModal = false
      this.listTrap = false
      this.emitter.emit("openDiagram", this.selectedRowId)
      this.emitter.emit("changeActive")
    },
    save (){
    },
    editItem (item) {
      this.editedIndex = this.diagrams.indexOf(item)
      this.editedItem = Object.assign({}, item)
      this.smallDialog = true
      if (D3Util.debug) console.log(item)
    },
    deleteItem (item) {
      const id = (item && item.id) ? item.id : this.selectedRowId
      if (D3Util.debug) console.log(id)
      const index = this.diagrams.indexOf(item)
      if (index > -1) this.diagrams.splice(index, 1)

      if (localStorage.getItem('token')) {
        D3DApi.deleteDiagram(id)
        console.log('Getting diagrams from server')
        this.getDiagrams()
      } else {
        D3Util.deleteLocalEntry(id)
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
      if (D3Util.debug) console.log(items)
      this.diagrams = items;
    },
    getDiagrams: async function() {
      var result = await D3DApi.getDiagrams()
      if (D3Util.debug) console.log(result)
      if (result.data === undefined) {
        let data = {status: 'info', message: 'no data found ... Login to refresh token', result: result.response }
        this.emitter.emit('appMessage', data)
        this.close()
      } else {
        if (D3Util.debug) console.log(new Date(result.data.dags[0].updated).toLocaleString())
        this.diagrams = result.data.dags
      }
    },
    close () {
      if (D3Util.debug) console.log('Close method')
      this.diagramListModal = false
      this.smallDialog = false
      this.listTrap = false
      this.emitter.emit('changeActive')
    }
  },
}
</script>

<style scoped>
.fx-table-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fx-table {
  border: 1px solid rgba(var(--fx-accent), 0.28);
  border-radius: 6px;
  overflow: hidden;
}

.fx-table :deep(.v-table) {
  background: transparent;
  color: rgb(var(--fx-ink));
  font-family: inherit;
  font-size: 12px;
}

.fx-table :deep(.v-table__wrapper) {
  max-height: 46vh;
}

.fx-table :deep(.v-table__wrapper > table > thead > tr > th) {
  background: rgba(var(--fx-accent), 0.12);
  color: rgb(var(--fx-ink-dim));
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(var(--fx-accent), 0.28);
}

.fx-table :deep(.v-table__wrapper > table > tbody > tr > td) {
  color: rgb(var(--fx-ink-soft));
  border-bottom: 1px solid rgba(var(--fx-accent), 0.12);
  height: 40px;
}

.fx-table :deep(.v-table__wrapper > table > tbody > tr:hover > td) {
  background: rgba(var(--fx-accent), 0.08);
}

.fx-table :deep(.v-data-table-footer) {
  background: transparent;
  color: rgb(var(--fx-ink-soft));
  font-family: inherit;
  font-size: 11px;
}

.fx-table :deep(.v-data-table-footer .v-input__control),
.fx-table :deep(.v-data-table-footer .v-field) {
  font-family: inherit;
  font-size: 11px;
}

.fx-row-selected > td {
  background: rgba(var(--fx-amber), 0.18) !important;
}

.fx-cell-description {
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fx-row-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-right: 6px;
  background: transparent;
  border: 1px solid rgba(var(--fx-accent), 0.35);
  border-radius: 4px;
  color: rgb(var(--fx-ink-soft));
  cursor: pointer;
  transition: all 0.15s ease;
}

.fx-row-btn:hover {
  color: rgb(var(--fx-amber-ink));
  border-color: rgba(var(--fx-amber), 0.6);
  box-shadow: 0 0 10px rgba(var(--fx-amber), 0.25);
}

.fx-row-btn-danger:hover {
  color: rgb(var(--fx-red));
  border-color: rgba(var(--fx-red), 0.6);
  box-shadow: 0 0 10px rgba(var(--fx-red), 0.25);
}

.fx-table-empty {
  display: block;
  padding: 18px;
  color: rgb(var(--fx-ink-faint));
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>
