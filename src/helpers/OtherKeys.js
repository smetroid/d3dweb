import D3Util from '@/helpers/D3Util'
import VueCookies from 'vue-cookies'

export default class OtherKeys {
  constructor(emitter, modifier, hintFunction) {
    this.emitter       = emitter
    this.modifier      = modifier
    this.focusedIndex  = modifier.focusedIndex
    this.selectedNodes = modifier.selectedNodes
    this.doubleSelection = modifier.doubleSelection
    this.selectedEdges = modifier.selectedEdges || []
    this.hintFunction  = hintFunction
  }

  defaultActions(eventKey, edgeOrNode, focusedNodeId, focusedEdgeId) {
    let d3Data = null

    switch (eventKey) {
      case 'm':
        this.emitter.emit('changeActive', 'Menu')
        break
      case '/':
        this.emitter.emit('showHelp')
        break
      case 'a':
        this.emitter.emit('changeActive', 'Actions Menu')
        break
      case 't':
        this.emitter.emit('toggleTheme')
        break
      case 'n':
        this.modifier.addNode(D3Util.defaultNodeValues())
        break
      case 'd':
        this.modifier.addEdge(D3Util.defaultEdgeValues())
        break
      case 'e':
        if (edgeOrNode === 'edges') {
          d3Data = this.modifier.getEdgeData(focusedEdgeId)
          this.emitter.emit('changeActive', 'Edit Edge')
        } else if (edgeOrNode === 'nodes') {
          d3Data = this.modifier.getNodeData(focusedNodeId)
          this.emitter.emit('changeActive', 'Edit Node')
        }
        break
      default:
        return this.Animate(eventKey, edgeOrNode)
    }

    return d3Data
  }

  Animate(eventKey, nodeOrEdge) {
    let selectedId = null

    if (eventKey === 'j') {
      selectedId = this.J(nodeOrEdge)
    } else if (eventKey === 'k') {
      selectedId = this.K(nodeOrEdge)
    } else if (eventKey === 'f') {
      this.hints = this.F()
    }

    if (eventKey === 'f') {
      this.returnData = { hints: this.hints }
    } else if (eventKey === 'Enter') {
      this.returnData = this.enter(nodeOrEdge)
    } else {
      const key = nodeOrEdge.concat('Id')
      this.returnData = { [key]: selectedId, index: this.focusedIndex }
    }

    return this.returnData
  }

  J(nodeOrEdge) {
    if (nodeOrEdge === 'nodes') {
      if (this.focusedIndex === null || isNaN(this.focusedIndex)) {
        this.focusedIndex = 0
      } else {
        this.prevFocusedIndex = this.focusedIndex
        this.focusedIndex = D3Util.mod(this.focusedIndex + 1, this.modifier.nodeCount())
        this.modifier.removeSelection(this.prevFocusedIndex)
      }
      return this.modifier.selectNode(this.focusedIndex)
    } else {
      if (this.focusedIndex === null || isNaN(this.focusedIndex)) {
        this.focusedIndex = 0
      } else {
        this.prevFocusedIndex = this.focusedIndex
        this.focusedIndex = D3Util.mod(this.focusedIndex + 1, this.modifier.edgeCount())
        this.modifier.removeEdgeSelection(this.prevFocusedIndex)
      }
      return this.modifier.selectEdge(this.focusedIndex)
    }
  }

  K(nodeOrEdge) {
    if (nodeOrEdge === 'nodes') {
      if (this.focusedIndex === null || isNaN(this.focusedIndex)) {
        this.focusedIndex = this.modifier.nodeCount() - 1
      } else {
        this.prevFocusedIndex = this.focusedIndex
        this.focusedIndex = D3Util.mod(this.focusedIndex - 1, this.modifier.nodeCount())
        this.modifier.removeSelection(this.prevFocusedIndex)
      }
      return this.modifier.selectNode(this.focusedIndex)
    } else {
      if (this.focusedIndex === null || isNaN(this.focusedIndex)) {
        this.focusedIndex = this.modifier.edgeCount() - 1
      } else {
        this.prevFocusedIndex = this.focusedIndex
        this.focusedIndex = D3Util.mod(this.focusedIndex - 1, this.modifier.edgeCount())
        this.modifier.removeEdgeSelection(this.prevFocusedIndex)
      }
      return this.modifier.selectEdge(this.focusedIndex)
    }
  }

  F() {
    // In 3D mode, node cards are real HTML elements — query them directly
    const elements = this.modifier.renderer
      ? this.modifier.renderer.getAllNodeElements()
      : []

    const availHints    = this.buildHints(elements)
    const hints         = {}
    const settings      = VueCookies.get('settings') || {}
    const hintLinkColor = settings.hintLinkColor || '#fff'
    const hintBGColor   = settings.hintBGColor   || '#36004c'

    for (let i = 0; i < elements.length; i++) {
      const shortcut = availHints[i]
      const el       = elements[i]

      // Append a floating badge div to the node anchor
      const badge = document.createElement('div')
      badge.className = 'hint-badge'
      badge.style.setProperty('--fx-hint-link', hintLinkColor)
      badge.style.setProperty('--fx-hint-bg', hintBGColor)
      badge.innerHTML = `<a href="#" tabindex="-1"><span class="hint-char">${shortcut}</span></a>`
      badge.addEventListener('click', this.hintFunction)
      el.appendChild(badge)

      hints[shortcut] = el
    }

    return hints
  }

  buildHints(elements) {
    const hintOptions  = D3Util.hintOptions() || 'asdfjklqweruiopzxcvnmgh'
    const hintsLength  = hintOptions.length
    const maxIterator  = Math.floor(elements.length / hintsLength)
    const hints        = []
    for (let i = maxIterator; i <= elements.length; i++) {
      let hint = hintOptions.charAt(D3Util.mod(i, hintsLength))
      if (i >= hintsLength) {
        for (let t = 0; t < maxIterator; t++) {
          hint = hintOptions.charAt(D3Util.mod(t, hintsLength)) + hint
          hints.push(hint)
        }
      } else {
        hints.push(hint)
      }
    }
    return hints
  }

  enter(nodeOrEdge) {
    if (nodeOrEdge === 'nodes') {
      return this.activeDeactiveNode(this.focusedIndex)
    } else {
      return this.activeDeactiveEdge(this.focusedIndex)
    }
  }

  activeDeactiveNode(index) {
    const selectionExists = this.selectedNodes.indexOf(index)

    if (selectionExists === -1) {
      this.selectedNodes.push(this.focusedIndex)
    } else {
      if (this.doubleSelection.length === 0) {
        this.selectedNodes = this.modifier.arrayRemove(this.selectedNodes, index)
        this.doubleSelection.push(index)
      } else {
        this.selectedNodes = this.modifier.arrayRemove(this.selectedNodes, index)
      }
    }

    return { selectedNodes: this.selectedNodes, doubleSelection: this.doubleSelection }
  }

  activeDeactiveEdge(index) {
    const edgeId = this.modifier.getEdgeId(index)

    if (this.selectedEdges.indexOf(index) === -1) {
      this.selectedEdges.push(this.focusedIndex)
      if (edgeId && this.modifier.renderer) {
        this.modifier.renderer.selectEdge(edgeId)
      }
    } else {
      if (edgeId && this.modifier.renderer) {
        this.modifier.renderer.deselectEdge(edgeId)
      }
      this.selectedEdges = this.modifier.arrayRemove(this.selectedEdges, index)
    }

    return { selectedNodes: this.selectedNodes, doubleSelection: this.doubleSelection }
  }
}
