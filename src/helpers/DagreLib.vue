<template>
  <div>
  </div>
</template>
<script>
//import D3VimApi from '@/services/api/SamusApi'
// import * as dagreD3 from 'dagre-d3-webpack'
import VueCookies from 'vue-cookies'
import * as d3 from 'd3'
import * as Velocity from 'velocity-animate'
import * as dagreD3 from 'dagre-d3'
// var dagreD3 = require('dagre-d3')
import D3Util from '@/services/D3Util'
// import graph from '@/services/DagreGraphLib'
/*these vars are global needed for the click.reset() function*/
var svg = null
var zoom = null
var gWidth = null
var gHeight = null
var initialScale = 0.95
export default {
  name: 'DagreLib',
  // props: ['name', 'description','id'],
  // components: {DagreGraphLib},
  data () {
    return {
      diagram: null,
      focusedEdgeId: null,
      focusedNodeId: null,
      id: null,
      name: null,
      description: null,
      app: null,
      json: null,
    }
  // },
  // mounted() {
  //   console.log(this.g)
  },
  methods: {
    // randomId () {
    //   // Math.random should be unique because of its seeding algorithm.
    //   // Convert it to base 36 (numbers + letters), and grab the first 9 characters
    //   // after the decimal.
    //   return '_' + Math.random().toString(36).substr(2, 9)
    // },
    // selectEdge (index) {
    //   console.log(index)
    //   var edge = this.getEdge(index)
    //   // Velocity(edge['_groups'][0], { scale: (1.0) }, { duration: 300 })
    //   // Velocity(edge['_groups'][0], 'reverse', 500)
    //   edge.classed('selected', true)

    //   this.focusedEdgeId = this.getEdgeId(index)
    //   var edgeData = this.g.edge(this.focusedEdgeId)

    //   if (D3Util.debug) {
    //     console.log(edgeData)
    //   }
    //   this.$root.$emit('edgesD3Data', edgeData)
    // },
    /*
    returns the d3Dagre node, based on the selected index key
    */
    // arrayRemove (gAactiveNodes, valueToRemove) {
    //   return comp.selectedNodes.filter(function (ele) {
    //     return ele !== valueToRemove
    //   })
    // },

  },
  enter () {
    if (this.gDebug) {
      console.log('enter')
    }
    // selectNode (refs.svg)
  },
  deleteEdge (id){
    var g = this.diagram
    g.removeEdge(id.v, id.w)
    this.redraw(g)
  },
  deleteEdges (edges) {
    //var g = this.g
    if (D3Util.debug) {
      console.log(edges)
    }
    // var edge = this.getEdge(this.focusedEdgeId)

    // Unable to use this since removing the
    var object = {}
    for (var index in edges) {
      var id = this.getEdgeId(this.selectedEdges[index])
      if (D3Util.debug) {
        console.log(this.selectedEdges[index])
        console.log(index)
        console.log(id)
      }
      object[index] = id
    }

    for (var i in object) {
      id = object[i]
      this.g.removeEdge(id.v, id.w)
    }
    this.redraw(this.g)
    this.selectedEdges = []
  },
  addEdge (data) {
    //var g = this.g
    if (D3Util.debug) {
      console.log(data)
      console.log(this.diagram)
      console.log(this.selectedNodes)
      console.log(this.doubleSelection)
    }

    var nodes = this.selectedNodes
    var firstNode = this.diagram.nodes()[nodes[0]]
    var secondNode = this.diagram.nodes()[nodes[1]]

    var label = data.edgeLabel === '' ? ' ': data.edgeLabel
    if (this.doubleSelection.length === 0) {
      this.diagram.setEdge(firstNode, secondNode, { 'label': data.edgeLabel, 'labelType': data.edgeLabelType, 'arrowheadStyle': data.edgeArrowHeadStyle, 'arrowhead': data.edgeArrowHead, 'curve': d3.curveBasis })
    } else {
      var headNode = this.diagram.nodes()[this.doubleSelection]
      for(var node in nodes) {
        console.log(node)
        secondNode = this.diagram.nodes()[nodes[node]]
        this.diagram.setEdge(headNode, secondNode, { 'label': label, 'labelType': data.edgeLabelType, 'arrowheadStyle': data.edgeArrowHeadStyle, 'arrowhead': data.edgeArrowHead, 'curve': d3.curveBasis })
      }
    }
    this.redraw(this.diagram)
    this.selectedNodes = []
  },
  updateEdge (data, id) {
    if (D3Util.debug) {
      console.log(data)
      console.log(data.edgeLabel)
      console.log(id)
    }
    //var g = this.g
    // var edge = this.activeEdgeId
    // var edge = this.getEdge(this.focusedEdgeId)
    var label = data.edgeLabel === '' ? ' ': data.edgeLabel
    this.diagram.setEdge(id.v, id.w, { 'label': label, 'labelType': data.edgeLabelType, 'arrowheadStyle': data.edgeArrowHeadStyle, 'arrowhead': data.edgeArrowHead, 'curve': d3.curveBasis })

    this.redraw(this.diagram)
    this.selectedNodes = []
  },
  addNode (data) {
    //var g = this.g
    if (D3Util.debug) {
      console.log(data)
      console.log(this.diagram)
    }

    var randomId = D3Util.randomId()
    this.diagram.setNode(randomId, { 
    'label': data.nodeLabel, 
    'shape': data.nodeShape, 
    'labelType': data.nodeLabelType, 
    'clusterLabelPos': data.clusterLabelPos,
    'style': data.style,
    'id': randomId
    })

    if(data.parentNode) {
      var parentId = data.parentNode
      this.diagram.setParent(randomId, parentId)
    }

    this.redraw(this.diagram)
    return randomId
  },
  updateNode (data, id) {
    if (D3Util.debug) {
      console.log(data)
      console.log(this.diagram)
    }
    //var g = this.g
    // var nodeId = this.getNodeId(this.focusedIndex)
    this.diagram.setNode(id, { 
      'label': data.nodeLabel, 
      'shape': data.nodeShape, 
      'labelType': data.nodeLabelType ,
      'clusterLabelPos': data.clusterLabelPos,
      'style': data.style,
      'id': id
      })

    /**
     * need to write logic for removal of parent?
     */
    if (data.parentNode) {
      var parentId = data.parentNode
      try{
        this.diagram.setParent(id, parentId)
      }
      catch{
        console.log('check logs for error')
      }
    }

    this.redraw(this.diagram)
  },
  deleteNode (id) {
    if(D3Util.debug){
      console.log('deleting node')
      console.log(id)
    }
    try{
      var g = this.diagram
      /**
       * if node is a parent, then we remove the children before we delete the node
       */
      var children = this.getChildren(id)
      if (children.length > 0) {
      //  /**
      //   * we need to remove the parent label position
      //   * and the the radius for the node is missing when 
      //   * re-rendering ... issue might be with the library
      //   * a work around is to:
      //   * 1. create a copy of the node
      //   * 2. remove the parent
      //   * 3. delete the node
      //   * 4. create a new node, 
      //   */
      //  console.log(children)

          /**
           * ISSUE: problem with create-cluster.js
           * it does not remove the cluster class if node being deleted is a parent
           * or setting the parent of the child as undefined
           */
      
        g.setParent(children[0], undefined)
        this.removeClusterClass(id)
      //  g.removeNode(id)
      //  //this.createCopy(id)
      //} else {
      //  g.removeNode(id)
        this.redraw(g)
      } else {
        g.removeNode(id)
        this.redraw(g)
      }
      return true
    } catch (err) {
      console.log(err.message)
      console.log('deleting a node failed')
      return false
    }
  },
  /**
   * 
   * @param {class id to remove} id 
   */
  removeClusterClass (id) {
    console.log('remove cluster class')
    var element = document.getElementById(id).remove()
    console.log(element)
  },
  copyNode(data, parentId) {
    var copy = {}
    console.log(data)

    copy.name = data.name
    copy.description = data.description
    copy.nodeShape = data.shape
    copy.nodeLabel = data.label
    copy.nodeLabelType = data.labelType
    copy.clusterLabelPos = data.clusterLabelPos
    copy.style = data.style

		if (parentId) {
      copy.parentNode = parentId
    }

    return parentId = this.addNode(copy)
  },
  /**
   * 
   * @param {id of node to copy} id 
   */
  createCopy (id, parentNode) {
    var data = this.getNodeData(id)
    var parentId = this.copyNode(data, parentNode)
		var hasChildren = this.getChildren(id)
		if (hasChildren.length > 1) {
			for (var child in hasChildren) {
				console.log(hasChildren[child])
				data = this.getNodeData(hasChildren[child])
				this.copyNode(data, parentId)
			}
		} else {
			/*only has one child object*/
			//calling itself to build a copy of the objects ... seems to work
			this.createCopy(hasChildren[0],parentId)
		}
		console.log(hasChildren)
  },
	createCopyV2 (id) {
    var data = this.getNodeData(id)
    var parentId = this.copyNode(data)
		var hasChildren = this.getChildren(id)

		for (var child in hasChildren) {
			this.createCopy(hasChildren[child], parentId)
		}
	},
  getChildren (id) {
    if (D3Util.debug){
      console.log('children')
      console.log(this.diagram.children(id))
    }
    var children = this.diagram.children(id)
    console.log(children)

    return children
  },
  getParent (id) {
    if (D3Util.debug){
      console.log('parent')
      console.log(this.diagram.parent(id).elem['firstChild'])
    }
    var node = d3.select(this.diagram.parent(id).elem['firstChild'])
    return node

  },
  deleteNodes (nodes) {
    var g = this.diagram
    if (D3Util.debug) {
      console.log(nodes)
      console.log('deleteNodes function')
      console.log(this.selectedNodes)
    }

    for (var node in nodes) {
      if(D3Util.debug){
        console.log(node)
      }
      // var nodeId = this.g.nodes()[this.selectedNodes[node]]
      var nodeId = this.getNodeId(this.selectedNodes[node])
      g.removeNode(nodeId)
    }
    this.redraw(g)
    return this.selectedNodes = []
    // this.redraw()
  },
  selectNode (index) {
    console.log(index)
    var node = this.getNode(index)
    console.log(node)
    //node = node['_groups'][0][0]
    Velocity(node, { scale: (1.2) }, { duration: 300 })
    Velocity(node, 'reverse', 500)
    /**classed is part of d3.js */
    var selection = d3.select(node)
    selection.classed('selected', true)

    // Select node should only return the id of the 
    // selected node and not the NodeData
    //var nodeData = this.diagram.node(this.getNodeId(index))
    return this.getNodeId(index)
    //return nodeData
    // this.$root.$emit('d3DagreData', nodeData)
  },
  getNode (index) {
    try{
      if(D3Util.debug){
        console.log(index)
        //console.log(this.diagram.nodes())
      }
      var id = this.getNodeId(index)
      /**
       * elem attribute is only found on nodes that are not of type cluster
       */
      //node = d3.select(this.diagram.node(id).elem['firstChild'])
      if(id){
        console.log('#'+id)
        var node = d3.select('#' + id)
        console.log(node)
        node = node['_groups'][0][0].firstChild
        console.log(node)
        return node

      }
    } catch {
      console.log('no node found')
    }
  },
  getNodeId (index) {
    if(D3Util.debug) {
      console.log(this.diagram.nodes())
      console.log(this.diagram.nodes().length)
      console.log(index)
    }
    /**
     * issue: index!! when it's 11 there is no index 11 the max is 10
     * because it starts at 0 and not 1
     */
    //index = D3Util.mod(index, this.diagram.nodes().length)
    var nodeId = this.diagram.nodes()[index]
    return nodeId
  },
  getNodeById (id) {
    var node = d3.select(this.diagram.node(id).elem['firstChild'])
    return node
  },
  removeSelection (index) {
    // Deselect the previous selection
    // node = d3.select('svg g.node:nth-child('+ (deselect_node + 1) +') rect');
    try {
      var node = this.getNode(index)
      console.log('remove selected')
      console.log(index)
      console.log(node)
      console.log('remove selected')
      var selection = d3.select(node)
      selection.classed('selected', false)
    } catch {
      console.log('no previous selection')
    }
  },
  removeNodeSelectionById (id) {
    try {
      var node = this.getNodeById(id)
      node.classed('selected', false)
    } catch (error) {
      console.log(error)
    }
  },
  removeEdgeSelection (index) {
    if (D3Util.debug) {
      console.log('remove edge selected')
    }
    var edge = this.getEdge(index)
    if (edge){
      edge.classed('selected', false)
    }
  },
  removeEdgeSelectionById (id) {
    var edge = this.getEdgeById(id)
    if (edge){
      edge.classed('selected', false)
    }
  },
  /**
   * changes the class for the edge
   */
  selectEdge (index) {
    if (D3Util.debug){
      console.log(this.diagram.edges())
    }
      var edge = this.getEdge(index)
      // Velocity(edge['_groups'][0], { scale: (1.0) }, { duration: 300 })
      // Velocity(edge['_groups'][0], 'reverse', 500)
      if(edge){
        edge.classed('selected', true)
        var focusedEdgeId = this.getEdgeId(index)
      }

      /*We'll grab this data from the edit form*/
      //var edgeData = this.diagram.edge(this.focusedEdgeId)
    return focusedEdgeId
  },
  /**
   * get edgeId by index selection
   */
  getEdgeId (index) {
    var edges = this.diagram.edges()
    if (D3Util.debug) {
      console.log(index)
      console.log(edges.length)
    }

    // if index is 0 then it thinks it false
    if (edges.length == 0) {
      this.app.$root.$emit('appMessage', 'info', 'No edges found in diagram')
    } else {
      var edgeId = this.diagram.edges()[index]
    }

    return edgeId
  },
  /**
   * get edge by selected index
   */
  getEdge (index) {
    var id = this.getEdgeId(index)
    if (D3Util.debug){
      console.log(id)
    }
    if(id){
      var edge = d3.select(this.diagram.edge(id.v, id.w).elem['firstChild'])
    }
    return edge
  },
  /**
   * get edge by edge id
   */
  getEdgeById (id) {
    try {
      var edge = d3.select(this.diagram.edge(id.v, id.w).elem['firstChild'])
      
    } catch (error) {
      console.log(error)
    }
    return edge
  },
  /**
  desciption: get d3 node data
  params: node id
  return: d3 diagram node data
   */
  getNodeData (id) {
    var nodeData = this.diagram.node(id)
    nodeData.id = id
    // this.$root.$emit('d3NodeData', nodeData, id)
    return nodeData
  },
  /**
  desciption: get d3 edge data
  params: edge id
  returns: d3 diagram edge data
   */
  getEdgeData (id) {
    var edgeData = this.diagram.edge(id)
    edgeData.id = id

    if (D3Util.debug) {
      console.log(id)
      console.log(edgeData)
    }

    return edgeData
    // this.$root.$emit('edgesD3Data', edgeData, id)
  },
  redraw (g, options={}) {

    // Get the edge line type
    /*render edges based on the d3Line selected*/
    var d3Lines = VueCookies.get('edgeLine'+this.id)
    try{
      g.edges().forEach(function (v) {
        var edge = g.edge(v)
        switch (d3Lines){
          case 'curveBasis':
            edge.curve = d3.curveBasis
            break;
          case 'curveLinear':
            edge.curve = d3.curveLinear
            break;
          case 'curveStep':
            edge.curve = d3.curveStep
            break;
          case 'curveStepAfter':
            edge.curve = d3.curveStepAfter
            break;
          case 'curveStepBefore':
            edge.curve = d3.curveStepBefore
            break;
          default:
            edge.curve = d3.curveLinear
        }
      })
    } catch {
      console.log('redraw edges catch error')
    }

    g.nodes().forEach(function (v) {
      var node = g.node(v)
      node.rx = node.ry = 5
    })

    // Set up zoom support
    // on click reset the viewport to show the whole diagram
    svg = d3.select('svg')
    var svgWidth = svg.property('clientWidth')
    var svgHeight = svg.property('clientHeight')
    svg.attr("viewBox", [0,0,svgWidth,svgHeight])
    svg.on("click", this.reset)

    var inner = svg.select('g')

    /**/
    zoom = d3.zoom()
      .scaleExtent(['.1', '10'])
      // .on('zoom', this.zoomed)
      .on('zoom', () => {
        inner.attr('transform', d3.event.transform)
      })
    /* Activates the zoom */
    svg.call(zoom)

    if (Object.keys(options).length == 0){
      /* eslint-disable-next-line */
      var render = dagreD3.render()
      d3.select('svg g').call(render, g)
      gWidth = ((svgWidth - (g.graph().width * initialScale)) / 2)
      gHeight = ((svgHeight - (g.graph().height * initialScale)) / 2)
    }

    if(options.zoom == "In"){
      initialScale = initialScale + .3
      gWidth = ((svgWidth - (g.graph().width * initialScale)) / 2)
      gHeight = ((svgHeight - (g.graph().height * initialScale)) / 2)
    } else if(options.zoom == "Out"){
      initialScale = initialScale - .3
      gWidth = ((svgWidth - (g.graph().width * initialScale)) / 2)
      gHeight = ((svgHeight - (g.graph().height * initialScale)) / 2)
    } else if(options.pan == "Up"){
      gHeight = gHeight - 100
    } else if(options.pan == "Down"){
      gHeight = gHeight + 100
    } else if (options.pan == "Left"){
      gWidth = gWidth - 100
    } else if (options.pan == "Right"){
      gWidth = gWidth + 100
    }

    svg.transition().duration(150).call(
      zoom.transform,
      d3.zoomIdentity.translate(gWidth, gHeight).scale(initialScale)
    )

    /*at every redraw save changes to localStorage*/
    this.json = new dagreD3.graphlib.json.write(g)
    var created = new Date()
    var updatedData = {
      'updatedTime': created.toISOString(),
      'id': this.id,
      'name': this.name,
      'description': this.description,
      'diagram': JSON.stringify(this.json),
    }

    D3Util.saveLocal(updatedData)
    return g
  },
  reset () {
    console.log('reset click')
    console.log(this.svg)
    // console.log(gWidth)
    // console.log(gHeight)
    // console.log(initialScale)
    // var initialScale = .96
    svg.transition().duration(750).call(
      zoom.transform,
      //d3.zoomIdentity,
      //d3.zoomIdentity.
      d3.zoomIdentity.translate(gWidth, gHeight).scale(initialScale)
      /*Note: width, and height need to be defined in order to see animation*/
      //d3.zoomTransform(this.svg.node()).invert([this.width / 2, this.height / 2])
    )
  },
  arrayRemove (gActiveNodes, valueToRemove) {
    return gActiveNodes.filter(function (ele) {
      return ele !== valueToRemove
    })
  },
}
</script>
