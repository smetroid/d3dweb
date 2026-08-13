import VueCookies from 'vue-cookies'
import { modelToGraphlib } from '@/helpers/graphlibMigration'
import Shortcuts from '@/helpers/Shortcuts.js'

/*need to doublecheck if the vars below are the best way to do the zooming*/

export default {
  isMac() {
    return Shortcuts.isMac()
  },
  shortcutLabels() {
    // Live labels from the user-rebindable shortcut registry.
    return {
      save: Shortcuts.label('save'),
      close: Shortcuts.label('close'),
      login: Shortcuts.label('login'),
      clear: Shortcuts.label('clear')
    }
  },
  tempInfo() {
    let temp = {
      name: 'D3D Temp Name',
      description: 'My Awesome Diagram'
    }
    return temp
  },
  //getDiagram(diagramId) {
  //},
  getLiElements() {
    var lis = document.getElementsByTagName('li')
    return lis
  },
  mod(n, m) {
    return ((n % m) + m) % m
  },
  filteredKeys(hints, filter) {
    var hintsCopy = hints
    var key = []
    var keys = {}
    var i = 0
    var newHints = {}
    var filterData = {}
    for (key in hints) {
      if (Object.prototype.hasOwnProperty.call(hints, key) && filter.test(key)) {
        keys[key] = i
        newHints[key] = hintsCopy[key]
        i++
        continue
      }
      // hintsCopy[key].removeChild(hintsCopy[key].lastChild)
      if (this.debug) {
        // console.log(hintsCopy[key])
        // console.log(hintsCopy[key].parentElement)
        // console.log(hintsCopy[key].parentElement.lastChild)
        // console.log(hintsCopy[key].lastChild)
      }
      hintsCopy[key].parentElement.removeChild(hintsCopy[key].parentElement.lastChild)
    }
    hintsCopy = newHints
    filterData['keys'] = keys
    filterData['newHints'] = newHints

    return filterData
  },
  liSelectionK(selectList, liSelected) {
    var li = liSelected
    var selectLi = null
    if (li === null) {
      selectLi = selectList.length - 1
    } else {
      // this.prevLiSelected = this.mod(li, selectList.length)
      li = li - 1
      selectLi = this.mod(li, selectList.length)
    }
    return selectLi
  },
  liSelectionJ(selectList, liSelected) {
    var li = liSelected
    var selectLi = null
    if (li === null) {
      selectLi = 0
    } else {
      li = li + 1
      selectLi = this.mod(li, selectList.length)
    }
    return selectLi
  },
  debug() {
    //how the hell was this working, if it was working?
    //I think we need to pull if from settings cookie
    //var debug = Settings.debug
    let debug = true
    return debug
  },
  hintOptions() {
    // Need to get from database or a cookie
    var hintOptions = VueCookies.get('settings')
    if (hintOptions) {
      return hintOptions['hints']
    } else {
      console.log('cookie settings is missing')
    }
  },
  randomId() {
    // Math.random should be unique because of its seeding algorithm.
    // Convert it to base 36 (numbers + letters), and grab the first 9 characters
    // after the decimal.
    return '_' + Math.random().toString(36).substr(2, 9)
  },
  // Shared dropdown option lists. Single source of truth so the Settings
  // dialog and the node/edge forms cannot drift apart.
  nodeShapeOptions() {
    return [
      { value: 'none', label: 'None' },
      { value: 'rectangle', label: 'Rectangle' },
      { value: 'round-rectangle', label: 'Round Rectangle' },
      { value: 'ellipse', label: 'Ellipse' },
      { value: 'diamond', label: 'Diamond' },
      { value: 'round-diamond', label: 'Round Diamond' },
      { value: 'hexagon', label: 'Hexagon' },
      { value: 'octagon', label: 'Octagon' },
      { value: 'star', label: 'Star' },
      { value: 'tag', label: 'Tag' },
      { value: 'barrel', label: 'Barrel' }
    ]
  },
  nodeHalignOptions() {
    return [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' }
    ]
  },
  nodeValignOptions() {
    return [
      { value: 'top', label: 'Top' },
      { value: 'center', label: 'Center' },
      { value: 'bottom', label: 'Bottom' }
    ]
  },
  edgeArrowHeadStyleOptions() {
    return [
      { value: 'filled', label: 'Filled' },
      { value: 'hollow', label: 'Hollow' }
    ]
  },
  edgeArrowHeadOptions() {
    return [
      { value: 'triangle', label: 'Triangle' },
      { value: 'vee', label: 'Vee' },
      { value: 'none', label: 'None (undirected)' },
      { value: 'chevron', label: 'Chevron' },
      { value: 'tee', label: 'Tee' },
      { value: 'circle', label: 'Circle' },
      { value: 'diamond', label: 'Diamond' },
      { value: 'square', label: 'Square' },
      { value: 'triangle-tee', label: 'Triangle Tee' },
      { value: 'triangle-cross', label: 'Triangle Cross' }
    ]
  },
  edgeLineStyleOptions() {
    return [
      { value: 'solid', label: 'Solid' },
      { value: 'dotted', label: 'Dotted' },
      { value: 'dashed', label: 'Dashed' }
    ]
  },
  edgeCurveOptions() {
    return [
      { value: 'bezier', label: 'Bezier' },
      { value: 'straight', label: 'Straight' },
      { value: 'segmented', label: 'Segmented' },
      { value: 'unbundled-bezier', label: 'Unbundled Bezier' },
      { value: 'haystack', label: 'Haystack' }
    ]
  },
  iconPositionOptions() {
    return [
      { value: 'left', label: '← Left' },
      { value: 'right', label: 'Right →' },
      { value: 'above', label: '↑ Above' },
      { value: 'below', label: 'Below ↓' },
      { value: 'only', label: 'Only' }
    ]
  },
  layoutOptions() {
    return [
      { value: 'cola', label: 'Cola (Physics-based)' },
      { value: 'cose', label: 'CoSE (Force-directed)' },
      { value: 'breadthfirst', label: 'Breadth First (Tree)' },
      { value: 'grid', label: 'Grid' },
      { value: 'circle', label: 'Circle' },
      { value: 'concentric', label: 'Concentric' },
      { value: 'dagre', label: 'Dagre (Hierarchical)' },
      { value: 'random', label: 'Random' }
    ]
  },
  appDefaults() {
    var defaults = {
      hintBGColor: '#36004c',
      hintLinkColor: '#ffffff',
      debug: false,
      hints: 'asdfjklqweruiopzxcvnmgh',
      reset: false,
      showHelpPane: true,
      d3dInfo: false,
      hintAction: 'Edit Object',
      defaultTheme: 'light',
      themes: [
        { value: 'light', label: 'Light Theme' },
        { value: 'dark', label: 'Dark Theme' }
      ],
      zoomFitFactor: 60,
      defaultZoomFit: true,
      defaultZoomLevel: 1,
      defaultLayoutMode: 'cola',
      defaultColaEdgeLength: 120,
      defaultColaNodeSpacing: 30,
      defaultColaFlow: null,
      defaultColaAvoidOverlap: true,
      defaultColaMaxSimulationTime: 1500,
      defaultColaGravity: 0,
      defaultCoseNodeRepulsion: 400000,
      defaultCoseIdealEdgeLength: 100,
      defaultCoseGravity: 1,
      defaultCoseNodeOverlap: 4,
      defaultBreadthfirstDirected: true,
      defaultBreadthfirstCircle: false,
      defaultBreadthfirstSpacingFactor: 1.5,
      defaultGridRows: null,
      defaultGridCols: null,
      defaultGridAvoidOverlap: true,
      defaultGridSpacingFactor: 1.5,
      defaultCircleSpacingFactor: 1.0,
      defaultCircleClockwise: true,
      defaultConcentricSpacingFactor: 1.5,
      defaultConcentricMinNodeSpacing: 30,
      defaultConcentricClockwise: true,
      defaultConcentricEquidistant: false,
      defaultDagreRankDir: 'TB',
      defaultDagreNodeSep: 50,
      defaultDagreRankSep: 50,
      defaultDagreEdgeSep: 10,
      defaultDagreRanker: 'network-simplex',
      defaultEdgeStyle: 'bezier',
      defaultEdgeWidth: 2,
      defaultEdgeOpacity: 0.85,
      defaultArrowScale: 1,
      defaultArrowShape: 'vee',
      defaultEdgeArrowHeadStyle: 'filled',
      defaultEdgeSourceArrow: '',
      defaultEdgeColor: '',
      defaultEdgeLineStyle: 'solid',
      defaultNodeLabel: '',
      defaultNodeShape: 'rectangle',
      defaultNodeTextHalign: 'center',
      defaultNodeTextValign: 'top',
      defaultNodeBgColor: '',
      defaultNodeBorderColor: '',
      defaultNodeBorderWidth: null,
      defaultNodeFontSize: null,
      defaultNodeIconSet: '',
      defaultNodeIconName: '',
      defaultNodeIconPosition: 'left',
      defaultNodeIconSize: null,
      defaultNodeIconColor: '',
      defaultEdgeLabel: '',
      defaultEdgeIconSet: '',
      defaultEdgeIconName: '',
      defaultEdgeIconPosition: 'left',
      defaultEdgeIconSize: null,
      defaultEdgeIconColor: '',
      serverUrl: 'http://localhost:3000',
      // User-rebindable shortcut overrides (id → combo). Defaults live in
      // Shortcuts.DEFAULT_SHORTCUTS; an empty object means all defaults.
      shortcuts: {}
    }
    return defaults
  },
  serverUrl() {
    const s = VueCookies.get('settings')
    if (s && s.serverUrl) return s.serverUrl
    const envBase = import.meta.env.VITE_API_BASE_URL
    if (envBase) {
      if (/^https?:\/\//.test(envBase)) return envBase
      return window.location.origin + envBase
    }
    return 'http://localhost:3000'
  },
  buildHints(elements, hyperLinks = false) {
    var hints = {}
    var shortcutOptions = this.hintOptions()
    var shortcutLength = shortcutOptions.length
    var shortcut = ''
    var iterations = 0
    var hintLinkColor = VueCookies.get('hintLinkColor')
    var hintBGColor = VueCookies.get('hintBGColor')
    for (var i = 0, len = elements.length; i < len; i++) {
      shortcut = shortcutOptions.charAt(this.mod(i, shortcutLength))
      if (i > shortcut) {
        iterations = iterations + 1
        for (var iter = 0, iterLen = iterations; iter < iterLen; iter++) {
          shortcut = shortcut + shortcutOptions.charAt(this.mod(i, shortcutLength))
        }
      }
      if (this.debug) {
        // console.log(shortcut)
        // console.log(elements[i])
        // console.log(elements[i].type)
      }

      var div = document.createElement('div')
      div.setAttribute('tabindex', '-1')
      div.innerHTML = shortcut
      if (elements[i].type === 'text') {
        console.log('am i here type text')
        div.style.cssText =
          'display: table-caption; color: ' +
          hintLinkColor +
          '; border: 1px solid #36004c; padding: 1px 8px 1px 8px; border-radius: 10px; background: ' +
          hintBGColor +
          '; z-index: 1; position: absolute'
        elements[i].parentNode.append(div)
      } else {
        console.log('am i here type text else')
        div.style.cssText =
          'display: table-caption; color: ' +
          hintLinkColor +
          '; border: 1px solid #36004c; padding: 1px 8px 1px 8px; border-radius: 10px; background: ' +
          hintBGColor +
          '; z-index: 1; position: absolute'
        /*Depending on what we are hinting on the parent is differnt*/
        if (hyperLinks) {
          elements[i].append(div)
        } else {
          //elements[i].parentElement.lastChild.append(div)
          elements[i].parentElement.append(div)
        }
      }

      if (this.debug) {
        console.log(elements[i])
      }
      hints[shortcut] = elements[i]
    }

    return hints
  },
  selectionBool(index) {
    console.log(this.menuLinks[index].title)
    this.currentMenuLink = this.menuLinks[index].title
  },
  d3FilterKeys(hints, filter, eventKey) {
    // var key = []
    var keys = {}
    var newHints = {}
    var filterData = {}
    var hintKeys = this.hintsKeyReplaced + eventKey

    if (this.debug) {
      console.log(hints)
    }
    // Remove all href links that do not start with the key in the filter
    for (var key in hints) {
      if (this.debug) {
        //console.log(key)
        //console.log(String(key).indexOf(eventKey))
        // console.log(hints[key])
        // console.log(hints[key].parentElement)
        // console.log(hints.hasOwnProperty(key))
        // console.log(filter.test(key))
      }

      if (key === hintKeys) {
        newHints[key] = hints[hintKeys]
        // continue
      } else if (String(key).startsWith(hintKeys)) {
        var href = hints[key].parentElement.querySelector('a')
        this.hintsKeyReplaced = hintKeys
        href.text = href.text.replace(eventKey, '')
        newHints[key] = hints[key]
        // continue
      } else {
        hints[key].parentElement.lastElementChild.remove()
      }
    }
    filterData['keys'] = keys
    filterData['newHints'] = newHints

    return filterData
  },
  formHints(event, form) {
    if (this.debug) {
      console.log(event.key)
      console.log('form hints')
    }

    if (event.key === 'Escape') {
      console.log('escape')
      // Closing the form is handled by the form's own keydown handler via the
      // user's configured 'close' shortcut — never assume Esc here.
      return form.hints
    } else if (
      Object.keys(form.hints).length > 0 &&
      Object.prototype.hasOwnProperty.call(form.hints, event.key)
    ) {
      if (this.debug) {
        //console.log(form.hints[event.key])
      }

      // Removes the hint
      this.removeHint(form.hints, event.key)
      //form.hints[event.key].parentElement.removeChild(form.hints[event.key].parentElement.lastChild)
      //delete Object.prototype.hasOwnProperty.call(form.hints, event.key)

      if (form.hints[event.key].type === 'text') {
        form.hints[event.key].focus()
        // this.hints[event.key].click()
      } else {
        form.hints[event.key].click()
      }
      // this.hints[event.key].previousSibling.click()
      if (Object.keys(form.hints).length === 1) {
        form.hints = {}
      }
    } else if (event.key == 'f') {
      if (Object.keys(form.hints).length > 0) {
        console.log('hints already being displayed')
        this.removeHint(form.hints, event.key)
      } else {
        var inputs = form.$refs.formfields.$el.querySelectorAll('submit,input,textarea')
        return (form.hints = this.buildHints(inputs))
        // this.addFollowLinks()
      }
      //  break
      // case 'Cancel':
      //   console.log('cancel')
      //   this.$root.$emit('nodeModal', 'node')
      //   break
      // default:
      //   console.log('default')
    }
    // This delete helps cleanup the remaining hints, without removing the form radio
    // object
    delete form.hints[event.key]
    return form.hints
  },
  removeHint(hints, eventKey) {
    hints[eventKey].parentElement.removeChild(hints[eventKey].parentElement.lastChild)
  },
  removeHints(hints) {
    try {
      if (this.debug) {
        console.log(hints)
      }
      var newHints = {}
      for (var key in hints) {
        console.log(key)
        console.log(hints[key].parentElement)
        console.log(hints[key].parentElement.lastElementChild)
        // hints[key].parentElement.removeChild(hints[key].parentElement.lastChild)
        // hints[key].parentElement.removeChild(hints[key].parentElement.lastChild)
        //Only remove if hint is active
        hints[key].parentElement.lastElementChild.remove()
        // hints[key].parentElement.removeChild(hints[key].parentElement.lastElementChild)
        //hints[key].removeChild(hints[key].parentElement.lastChild)
      }
    } catch (error) {
      console.log(error)
    }
    return newHints
  },
  /**
   * Return an id from a list of items based on j or k events
   * eg: list of li items an event of key j will return the first li
   * @param {integer} index being tracked
   * @param {integer} j or k event keys
   * @param {integer} max number of items
   * @return {integer} a number
   **/
  getIndex(index, key, items) {
    console.log(index)
    console.log(key)
    console.log(items)
    var id = null
    if (index === null || isNaN(index)) {
      id = 0
    } else {
      switch (key) {
        case 'j':
          id = this.add(index)
          break
        case 'k':
          id = this.remove(index)
      }
      id = this.mod(id, items)
    }

    return id
  },
  getPage(index, key, pages) {
    var id = null
    switch (key) {
      case 'l':
        id = this.add(index)
        break
      case 'h':
        id = this.remove(index)
        break
    }
    id = this.mod(id, pages + 1)
    if (id == 0) {
      id = 1
    }
    return id
  },
  add(item) {
    return item + 1
  },
  remove(item) {
    return item - 1
  },
  createLocalEntry(data) {
    try {
      let randomId = 'D3D' + this.randomId()
      let created = new Date()
      let json = modelToGraphlib(data.diagram)
      let payload = {
        name: data.name,
        description: data.description,
        diagram: JSON.stringify(json),
        created: created.toISOString(),
        updated: created.toISOString()
      }

      localStorage.setItem(randomId, JSON.stringify(payload))
      VueCookies.set('LastLocallySavedItemId', randomId)
      return randomId
    } catch (error) {
      console.log(error)
    }
  },
  deleteLocalEntry(id) {
    try {
      // Check if the item with the given ID exists in localStorage
      if (localStorage.getItem(id) !== null) {
        // Remove the item from localStorage
        localStorage.removeItem(id)
        console.log('Item with ID ' + id + ' has been removed from localStorage.')
      } else {
        console.log('Item with ID ' + id + ' does not exist in localStorage.')
      }
    } catch (error) {
      console.log(error)
    }
  },
  updateLocalEntry(data) {
    try {
      console.log(data)
      let updated = new Date()
      let json = modelToGraphlib(data.diagram)
      let payload = {
        name: data.name,
        description: data.description,
        diagram: JSON.stringify(json),
        created: data.created,
        updated: updated.toISOString()
      }

      localStorage.setItem(data.id, JSON.stringify(payload))
      VueCookies.set('LastLocallySavedItemId', data.id)
      console.log('updating item succeeded')
    } catch (error) {
      console.log('updating item failed')
      console.log(error)
    }
  },
  saveTempDiagram(cy) {
    try {
      let json = modelToGraphlib(cy)
      let created = new Date()
      let updatedData = {
        created: created.toISOString(),
        updated: created.toISOString(),
        name: this.tempInfo().name,
        description: this.tempInfo().description,
        diagram: JSON.stringify(json)
      }
      localStorage.setItem('samus.lastUpdated', JSON.stringify(updatedData))
    } catch (error) {
      console.log('saveTempDiagram failed', error)
    }
  },
  getTempDiagram() {
    var localData = JSON.parse(localStorage.getItem('samus.lastUpdated'))
    return localData
  },
  getLocalItem(id) {
    let localItem = JSON.parse(localStorage.getItem(id))
    return localItem
  },
  //Need to check if token is valid
  auth() {
    if (localStorage.getItem('token')) {
      return true
    } else {
      return false
    }
  },
  updateId(id) {
    var localData = this.getLocal()
    console.log(localData)
    localData.id = id

    this.saveTempDiagram(localData)
  },
  defaultNodeValues() {
    const s = this._readSettings()
    var data = {
      nodeLabel: s.defaultNodeLabel !== undefined ? s.defaultNodeLabel : '',
      nodeShape: s.defaultNodeShape || 'rectangle',
      textHalign: s.defaultNodeTextHalign || 'center',
      textValign: s.defaultNodeTextValign || 'top',
      bgColor: s.defaultNodeBgColor || '',
      borderColor: s.defaultNodeBorderColor || '',
      borderWidth: s.defaultNodeBorderWidth != null ? s.defaultNodeBorderWidth : null,
      fontSize: s.defaultNodeFontSize != null ? s.defaultNodeFontSize : null,
      iconSet: s.defaultNodeIconSet || '',
      iconName: s.defaultNodeIconName || '',
      iconPosition: s.defaultNodeIconPosition || 'left',
      iconSize: s.defaultNodeIconSize != null ? s.defaultNodeIconSize : null,
      iconColor: s.defaultNodeIconColor || ''
    }
    return data
  },
  defaultEdgeValues() {
    const s = this._readSettings()
    var data = {
      edgeLabel: s.defaultEdgeLabel !== undefined ? s.defaultEdgeLabel : '',
      edgeArrowHeadStyle: s.defaultEdgeArrowHeadStyle || 'filled',
      edgeArrowHead: s.defaultArrowShape || 'vee',
      sourceArrowhead: s.defaultEdgeSourceArrow || '',
      edgeWidth: s.defaultEdgeWidth != null ? Number(s.defaultEdgeWidth) : 2,
      edgeColor: s.defaultEdgeColor || '',
      edgeLineStyle: s.defaultEdgeLineStyle || 'solid',
      edgeCurve: this._normalizeEdgeCurve(s.defaultEdgeStyle),
      edgeOpacity: s.defaultEdgeOpacity != null ? Number(s.defaultEdgeOpacity) : 0.85,
      iconSet: s.defaultEdgeIconSet || '',
      iconName: s.defaultEdgeIconName || '',
      iconPosition: s.defaultEdgeIconPosition || 'left',
      iconSize: s.defaultEdgeIconSize != null ? s.defaultEdgeIconSize : null,
      iconColor: s.defaultEdgeIconColor || ''
    }
    return data
  },
  // Map the stored default curve value to a cytoscape curve-style. Legacy
  // settings saved 'curved' (label "Curved (Bezier)"); normalize it to the
  // cytoscape value 'bezier'.
  _normalizeEdgeCurve(val) {
    if (val === 'curved') return 'bezier'
    return val || 'bezier'
  },
  // Settings cookie that never throws (vue-cookies reads document.cookie, which
  // does not exist in headless/test environments).
  _readSettings() {
    try {
      return VueCookies.get('settings') || {}
    } catch (e) {
      return {}
    }
  }
}
