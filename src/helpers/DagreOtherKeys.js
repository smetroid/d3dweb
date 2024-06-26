import D3Util from '@/helpers/D3Util'
import * as d3 from 'd3'
//import DagreLib from '@/helpers/DagreLib'
//import D3NodeForm from '@/components/D3NodeForm'
//import D3Edge from '@/components/D3EdgeForm'
import Velocity from 'velocity-animate'
import VueCookies from 'vue-cookies'
//import MenuLink from '@/helpers/MenuLinks'
export default class DagreOtherKeys {
  constructor(emitter, modifier, hintFunction) {
    this.emitter = emitter
    this.modifier = modifier
    this.diagram = modifier.d3dInfo.diagram
    this.focusedIndex = modifier.focusedIndex
    this.selectedNodes = modifier.selectedNodes
    this.doubleSelection = modifier.doubleSelection
    this.hintFunction = hintFunction
  }

  defaultActions (eventKey, edgeOrNode, focusedNodeId, focusedEdgeId) {
    console.log(this)
    //let resetValues = false
    let d3Data = null
    switch (eventKey){
      case 'm':
        console.log('open menu')
        console.log(this)
        this.emitter.emit('changeActive', "Menu")
        break
      case '/':
        console.log('show help')
        this.emitter.emit('showHelp')
        break
      case 'a':
        console.log('open actions menu')
        this.emitter.emit('changeActive', "Actions Menu")
        break
      case 't':
        console.log('light dark toggle')
        this.emitter.emit('toggleTheme')
        break
      case 'n':
        var node = D3Util.defaultNodeValues()
        this.modifier.addNode(node)
        //resetValues = true
        break
      case 'd':
        var edge = D3Util.defaultEdgeValues()
        this.modifier.addEdge(edge)
        //resetValues = true
        break
      case 'e':
        if ( edgeOrNode === 'edges' ){
          d3Data = this.modifier.getEdgeData(focusedEdgeId)
          this.emitter.emit('changeActive', 'Edit Edge')
        } else if ( edgeOrNode === 'nodes' ) {
          console.log('editing a node object')
          d3Data = this.modifier.getNodeData(focusedNodeId)
          console.log(d3Data)
          this.emitter.emit('changeActive', 'Edit Node')
        } else {
          console.log('nothing to edit')
        }
        break

      default:
        //AnimateKeys.dagreGraphLib = dagreGraphLib
        console.log(eventKey)
        //var edgeOrNode = this.dagreGraphLib.edgeOrNode
        console.log(edgeOrNode)
        return this.Animate(eventKey, edgeOrNode)
    }
    /*NOTE - it seems resetValues was only needed for alt keys */
    //let result = [resetValues, d3Data]
    return d3Data
  }

  Animate(eventKey, nodeOrEdge) {
    console.log(this.modifier)
    var selectedId = null
    //this.modifier = this.dagreGraphLib.dagreLib
    //this.graph = this.dagreGraphLib.d3Diagram

    /*NOTE - Can probably delete
    this.selectedNodes = this.graphSelectedNodes
    this.doubleSelection = this.graphDoubleSelection
    */

    //this.[eventKey](nodeOrEdge)
    if (eventKey == "j"){
      selectedId = this.J(nodeOrEdge)
    } else if (eventKey == "k") {
      selectedId = this.K(nodeOrEdge)
    } else if (eventKey == "f") {
      this.hints = this.F()
    } else {
      console.log("Animate nothing to do")
    }

    if (eventKey == "f"){
      console.log(this.hints)
      this.returnData = {hints: this.hints}
    } else if (eventKey == "Enter") {
      this.returnData = this.enter(nodeOrEdge)
      console.log(this.returnData)
    } else {
      var key = nodeOrEdge.concat("Id")
      this.returnData = { [key]: selectedId, index: this.focusedIndex }
    }

    return this.returnData
  }

  J (nodeOrEdge) {
    console.log('focus-index::'+this.focusedIndex)
    if (nodeOrEdge == "nodes") {
      if (this.focusedIndex === null 
      || isNaN(this.focusedIndex)) {
        this.focusedIndex = 0
      } else {
        console.log('nodeSelection case j else')
        console.log(this.diagram.nodeCount())
        console.log('focus-index'+this.focusedIndex)
        this.prevFocusedIndex = this.focusedIndex
        this.focusedIndex = this.focusedIndex + 1
        this.focusedIndex = D3Util.mod(this.focusedIndex, this.diagram.nodeCount())
        this.modifier.removeSelection(this.prevFocusedIndex)
      }
      console.log(this.modifier)
      return this.modifier.selectNode(this.focusedIndex)

    } else {
      if (this.focusedIndex === null || isNaN(this.focusedIndex)) {
        this.focusedIndex = 0
      } else {
        console.log('edgeSelection j else')
        this.prevFocusedIndex = this.focusedIndex
        this.focusedIndex = this.focusedIndex + 1
        this.focusedIndex = D3Util.mod(this.focusedIndex, this.diagram.edgeCount())
        console.log(this.prevFocusedIndex)
        this.modifier.removeEdgeSelection(this.prevFocusedIndex)
      }
      return this.modifier.selectEdge(this.focusedIndex)
    }
  }

  K (nodeOrEdge) {
    if (nodeOrEdge == "nodes") {
      if (this.focusedIndex === null || isNaN(this.focusedIndex)) {
        this.focusedIndex = (this.diagram.nodeCount() - 1)
      } else {
        this.prevFocusedIndex = this.focusedIndex
        this.focusedIndex = this.focusedIndex - 1
        this.focusedIndex = D3Util.mod(this.focusedIndex, this.diagram.nodeCount())
        this.modifier.removeSelection(this.prevFocusedIndex)
      }
      return this.modifier.selectNode(this.focusedIndex)
    } else {
      if (this.focusedIndex === null || isNaN(this.focusedIndex)) {
        this.focusedIndex = (this.diagram.edgeCount() - 1)
      } else {
        this.prevFocusedIndex = this.focusedIndex
        this.focusedIndex = this.focusedIndex - 1
        this.focusedIndex = D3Util.mod(this.focusedIndex, this.diagram.edgeCount())
        this.modifier.removeEdgeSelection(this.prevFocusedIndex)
      }
      return  this.modifier.selectEdge(this.focusedIndex)
    }
  }

  F (){
    /*create d3 shortcut hints*/
      var labels = d3.selectAll('svg g.label')
      if (D3Util.debug) {
        // console.log(d3.selectAll('svg g'))
        console.log(labels['_groups'])
        // console.log(labels[0])
        // console.log(labels['_groups'][0].__data__)
      }
      var elements = labels['_groups'][0]
      var shortcut = ''
      var hintLinkColor = VueCookies.get('settings')['hintLinkColor']
      var hintBGColor = VueCookies.get('settings')['hintBGColor']

      var availHints = this.buildHints(elements)
      if (D3Util.debug) {
        console.log(availHints)
      }
      var hints = {}
      console.log(elements)
      for (var i = 0; i < elements.length; i++) {
        shortcut = availHints[i]

        if (D3Util.debug) {
          // console.log(shortcut)
          //console.log(elements[i])
          // console.log(elements[i].__data__)
        }

        /**
         * determines where tp place the foreign object (hint)
         */
        console.log('foreign troubleshooting')
        console.log(elements[i])
        console.log(d3.select(elements[i]))
        console.log('foreign troubleshooting')
        /**
         * we need parentElement for edges and 
         * firstChild for nodes
         */
        if (elements[i].parentElement.classList.contains('cluster')) {
          var svg = d3.select(elements[i].lastChild)
        } else {
          svg = d3.select(elements[i].parentElement)
        }

        if (D3Util.debug) {
          // console.log(svg)
        }

        // adding the href to the label
        svg.append('foreignObject')
          .style('font', '14px')
          //.style('display', 'table-caption')
          .style('width', '40px')
          .style('height', '40px')
          // .style('border-radius', '10px')
          // .style('border', '1px solid')
          // .style('padding', '5px 14px')
          .append('xhtml:div')
          .html('<a href="#" tabindex="-1"><div style="display: table-caption;color:'+ hintLinkColor +';padding: 1px 8px 1px 8px; border-radius: 10px; background: '+hintBGColor+'">' + shortcut + '</div></a>')
          // .data(data)
          .on('click', this.hintFunction)
          //.on('click', this.d3Action())

        if (D3Util.debug) {
          //console.log(elements[i])
          //console.log(svg['_groups'][0][0])
          //console.log(svg)
        }
        // this.hints[shortcut] = element[i]
        hints[shortcut] = svg['_groups'][0][0]
      }

    labels = d3.selectAll('svg g.label')
    console.log(labels)
    return hints
  }

  buildHints (elements) {
    let maxIterator = null
    let hints = []
    let hintOptions = D3Util.hintOptions()
    let hintsLength = hintOptions.length
    maxIterator = Math.floor(elements.length / hintsLength)
    if (D3Util.debug) {
      console.log(maxIterator)
      console.log(hintsLength)
      console.log(hintOptions)
    }
    let hint = ''
    for (let i = maxIterator; i <= elements.length; i++) {
      hint = hintOptions.charAt(D3Util.mod(i, hintsLength))
      if (i >= hintsLength) {
        for (var t = 0; t < maxIterator; t++) {
          console.log(t)
          hint = hintOptions.charAt(D3Util.mod(t, hintsLength)) + hint
          hints.push(hint)
        }
      } else {
        hints.push(hint)
      }
    }

    return hints
  }

  enter (nodeOrEdge) {
    var result = ""
    if (nodeOrEdge == 'nodes') {
      console.log(this.focusedIndex)
      result = this.activeDeactiveNode(this.focusedIndex)
    } else {
      result = this.activeDeactiveEdge(this.focusedIndex)
    }

    return result
  }

  /**
   * TODO: need to move away from index to node id, now that the diagram
   * can be build with the random ids being passed when created
   * @param {*} index 
   */
  activeDeactiveNode (index) {
    let node = this.modifier.getNode(index)
    console.log('node')
    console.log(node)
    console.log(this.selectedNodes)
    //var selectedNodes = []
    //console.log(selectedNodes)
    let selectionExists = this.selectedNodes.indexOf(index)
    console.log('selectionExists')
    console.log(selectionExists)
    var selection = d3.select(node)
    if (selectionExists === -1) {
      this.selectedNodes.push(this.focusedIndex)
      Velocity(node, { scale: (1.2) }, { duration: 300 })
      Velocity(node, 'reverse', 500)
      //var selection = d3.select(node)
      selection.classed('active_node', true)
    } else {
      console.log('this.doubleSelection.length')
      console.log(this.doubleSelection.length)
      if (this.doubleSelection.length === 0 ) {
        console.log('doubleActive')
        selection.classed('d_active_node', true)
        this.selectedNodes = this.modifier.arrayRemove(this.selectedNodes, index)
        this.doubleSelection.push(index)
      } else {
        console.log("insideDoubleSelection")
        this.selectedNodes = this.modifier.arrayRemove(this.selectedNodes, index)
        selection.classed('d_active_node', false)
        //this.doubleSelection = []
      }
    }
    //var nodeId = this.modifier.getNodeId(index)
    //var nodeData = this.g.node(nodeId)
    //this.$root.$emit('d3NodeData', nodeData, nodeId)
    var data = {"selectedNodes": this.selectedNodes, "doubleSelection": this.doubleSelection}

    //this.dagreGraphLib.selectedNodes = this.selectedNodes
    //this.dagreGraphLib.doubleSelection = this.doubleSelection
    // this.$emit('activeDeactiveNodes', data)
    return data
  }

  activeDeactiveEdge (index) {
    var edge = this.modifier.getEdge(index)
    console.log('edge')
    console.log(edge)
    if (this.selectedEdges.indexOf(index) === -1) {
      this.selectedEdges.push(this.focusedIndex)
      Velocity(edge['_groups'][0], { scale: (1.1) }, { duration: 300 })
      Velocity(edge['_groups'][0], 'reverse', 500)
      edge.classed('active_edge', true)
      this.activeEdgeId = this.getEdgeId(index)
      var edgeData = this.g.edge(this.focusedEdgeId)
      console.log(edgeData)
      this.emitter.emit('edgesD3Data', edgeData, this.activeEdgeId)
    } else {
      edge.classed('active_edge', false)
      this.selectedEdges = this.modifier.arrayRemove(this.selectedEdges, index)
    }
    var data = {"selectedNodes": this.selectedNodes, "doubleSelection": this.doubleSelection}
    return data
  }
}
