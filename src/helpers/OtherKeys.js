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
    this.focusedNodeId = focusedNodeId
    this.focusedEdgeId = focusedEdgeId

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
    } else if (eventKey === 'h') {
      selectedId = this.H(nodeOrEdge)
    } else if (eventKey === 'l') {
      selectedId = this.L(nodeOrEdge)
    } else if (eventKey === 'f') {
      this.hints = this.F(nodeOrEdge)
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
    return this._navigate('j', nodeOrEdge)
  }

  K(nodeOrEdge) {
    return this._navigate('k', nodeOrEdge)
  }

  H(nodeOrEdge) {
    return this._navigate('h', nodeOrEdge)
  }

  L(nodeOrEdge) {
    return this._navigate('l', nodeOrEdge)
  }

  _navigate(direction, nodeOrEdge) {
    if (nodeOrEdge === 'nodes') {
      const prox = this._proximity(direction, 'nodes')
      if (prox !== undefined) return prox
      return this._arrayNav(direction, 'nodes')
    }
    const prox = this._proximity(direction, 'edges')
    if (prox !== undefined) return prox
    return this._arrayNav(direction, 'edges')
  }

  // Prefers the element geometrically nearest to the focused one in the given
  // direction (j/k/h/l). Returns the selected id, or undefined to signal the
  // caller to fall back to array-based navigation.
  _proximity(direction, which) {
    const fromId = which === 'nodes' ? this.focusedNodeId : this.focusedEdgeId
    if (!fromId) return undefined
    const method = which === 'nodes' ? 'selectNodeProximity' : 'selectEdgeProximity'
    if (typeof this.modifier[method] !== 'function') return undefined

    const res = this.modifier[method](direction, fromId)
    if (!res) return undefined
    this.focusedIndex = res.index
    return res.id
  }

  _arrayNav(direction, nodeOrEdge) {
    const delta = direction === 'k' || direction === 'h' ? -1 : 1
    if (nodeOrEdge === 'nodes') {
      if (this.focusedIndex === null || isNaN(this.focusedIndex)) {
        this.focusedIndex = delta === -1 ? this.modifier.nodeCount() - 1 : 0
      } else {
        this.prevFocusedIndex = this.focusedIndex
        this.focusedIndex = D3Util.mod(this.focusedIndex + delta, this.modifier.nodeCount())
        this.modifier.removeSelection(this.prevFocusedIndex)
      }
      return this.modifier.selectNode(this.focusedIndex)
    }
    if (this.focusedIndex === null || isNaN(this.focusedIndex)) {
      this.focusedIndex = delta === -1 ? this.modifier.edgeCount() - 1 : 0
    } else {
      this.prevFocusedIndex = this.focusedIndex
      this.focusedIndex = D3Util.mod(this.focusedIndex + delta, this.modifier.edgeCount())
      this.modifier.removeEdgeSelection(this.prevFocusedIndex)
    }
    return this.modifier.selectEdge(this.focusedIndex)
  }

  F(nodeOrEdge) {
    const renderer = this.modifier.renderer
    const elements = renderer
      ? (nodeOrEdge === 'edges'
          ? renderer.getAllEdgeElements()
          : renderer.getAllNodeElements())
      : []

    const availHints    = this.buildHints(elements)
    const hints         = {}
    const settings      = VueCookies.get('settings') || {}
    const hintLinkColor = settings.hintLinkColor || '#ffffff'
    const hintBGColor   = settings.hintBGColor   || '#36004c'

    for (let i = 0; i < elements.length; i++) {
      const shortcut = availHints[i]
      const el       = elements[i]

      const badge = document.createElement('div')
      badge.className = 'hint-badge'
      badge.style.setProperty('--fx-hint-link', hintLinkColor)
      badge.style.setProperty('--fx-hint-bg', hintBGColor)
      badge.innerHTML = [
        '<span class="hint-bracket htl"></span>',
        '<span class="hint-bracket htr"></span>',
        '<span class="hint-bracket hbl"></span>',
        '<span class="hint-bracket hbr"></span>',
        `<a href="#" tabindex="-1"><span class="hint-char">${shortcut}</span></a>`,
      ].join('')
      badge.addEventListener('click', this.hintFunction)
      el.appendChild(badge)

      hints[shortcut] = el
    }

    return hints
  }

  buildHints(elements) {
    const hintOptions = D3Util.hintOptions() || 'asdfjklqweruiopzxcvnmgh'
    const n = elements.length
    const hints = []

    // Single-char hints first
    for (let i = 0; i < hintOptions.length && hints.length < n; i++) {
      hints.push(hintOptions[i])
    }

    // Two-char hints if more are needed (prefix + suffix)
    if (hints.length < n) {
      const singles = hints.slice()
      for (let p = 0; p < singles.length && hints.length < n; p++) {
        for (let s = 0; s < hintOptions.length && hints.length < n; s++) {
          hints.push(singles[p] + hintOptions[s])
        }
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
