import D3Util from '@/helpers/D3Util'

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
    // The Cytoscape DOM renderer draws to canvas — there are no per-node
    // HTML elements to hang hint badges on, so the visual hint system is
    // disabled for now (buildHints stays for future rework).
    return {}
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
    const id   = this.modifier.getNodeId?.(index)
    const node = id ? this.modifier.cy?.getElementById(id) : null
    const selectionExists = this.selectedNodes.indexOf(index)

    if (selectionExists === -1) {
      this.selectedNodes.push(this.focusedIndex)
      node?.addClass('selected')
    } else {
      if (this.doubleSelection.length === 0) {
        node?.addClass('d_active_node').removeClass('selected')
        this.selectedNodes = this.modifier.arrayRemove(this.selectedNodes, index)
        this.doubleSelection.push(index)
      } else {
        this.selectedNodes = this.modifier.arrayRemove(this.selectedNodes, index)
        node?.removeClass('d_active_node')
      }
    }

    return { selectedNodes: this.selectedNodes, doubleSelection: this.doubleSelection }
  }

  activeDeactiveEdge(index) {
    const edgeId = this.modifier.getEdgeId(index)
    const edge   = edgeId ? this.modifier.cy?.getElementById(edgeId) : null

    if (this.selectedEdges.indexOf(index) === -1) {
      this.selectedEdges.push(this.focusedIndex)
      edge?.addClass('selected')
    } else {
      edge?.removeClass('selected')
      this.selectedEdges = this.modifier.arrayRemove(this.selectedEdges, index)
    }

    return { selectedNodes: this.selectedNodes, doubleSelection: this.doubleSelection }
  }
}
