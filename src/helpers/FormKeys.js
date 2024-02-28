import D3Util from '@/services/D3Util'
import * as d3 from 'd3'
// import DagreLib from '@/helpers/DagreLib'
import VueCookies from 'vue-cookies'
export default {
  name: 'FormKeys',
  // props: ['diagram', 'diagramId'],
  data () {
    return {
      graph: undefined,
      focusedIndex: null,
      returnData: null,
      prevFocusedIndex: null,
     }
  },
  mounted () {
    console.log('focused keys loaded')
  },
  Animate(eventKey, nodeOrEdge) {
    var selectedId = null

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
      this.returnData = {hints: this.hints}
    } else {
      var key = nodeOrEdge.concat("Id")
      this.returnData = { [key]: selectedId, index: this.focusedIndex }

    }

    return this.returnData
  },
  J (nodeOrEdge) {
    if (nodeOrEdge == "nodes") {
      if (this.focusedIndex === null || isNaN(this.focusedIndex)) {
        this.focusedIndex = 0
      } else {
        console.log('nodeSelection case j else')
        this.prevFocusedIndex = this.focusedIndex
        this.focusedIndex = this.focusedIndex + 1
        this.focusedIndex = D3Util.mod(this.focusedIndex, this.graph.nodeCount())
        this.dagreLib.removeSelection(this.prevFocusedIndex)
      }
      return this.selectNode(this.focusedIndex)

    } else {
      if (this.focusedIndex === null) {
        this.focusedIndex = 0
      } else {
        console.log('edgeSelection j else')
        this.prevFocusedIndex = this.focusedIndex
        this.focusedIndex = this.focusedIndex + 1
        this.focusedIndex = D3Util.mod(this.focusedIndex, this.graph.edgeCount())
        console.log(this.prevFocusedIndex)
        this.dagreLib.removeEdgeSelection(this.prevFocusedIndex)
      }
      return this.dagreLib.selectEdge(this.focusedIndex)
    }
  },
  K (nodeOrEdge) {
    if (nodeOrEdge == "nodes") {
      if (this.focusedIndex === null || isNaN(this.focusedIndex)) {
        this.focusedIndex = (this.graph.nodeCount() - 1)
      } else {
        this.prevFocusedIndex = this.focusedIndex
        this.focusedIndex = this.focusedIndex - 1
        this.focusedIndex = D3Util.mod(this.focusedIndex, this.graph.nodeCount())
        this.dagreLib.removeSelection(this.prevFocusedIndex)
      }
      return this.dagreLib.selectNode(this.focusedIndex)
    } else {
      if (this.focusedIndex === null || isNaN(this.focusedIndex)) {
        this.focusedIndex = (this.graph.edgeCount() - 1)
      } else {
        this.prevFocusedIndex = this.focusedIndex
        this.focusedIndex = this.focusedIndex - 1
        this.focusedIndex = D3Util.mod(this.focusedIndex, this.graph.edgeCount())
        this.dagreLib.removeEdgeSelection(this.prevFocusedIndex)
      }
      return  this.dagreLib.selectEdge(this.focusedIndex)
    }
  },
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
      var hintLinkColor = VueCookies.get('hintLinkColor')
      var hintBGColor = VueCookies.get('hintBGColor')

      var availHints = this.buildHints(elements)
      if (D3Util.debug) {
        console.log(availHints)
      }
      var hints = {}
      for (var i = 0; i < elements.length; i++) {
        shortcut = availHints[i]

        if (D3Util.debug) {
          // console.log(shortcut)
          //console.log(elements[i])
          // console.log(elements[i].__data__)
        }

        var svg = d3.select(elements[i].parentElement)

        if (D3Util.debug) {
          // console.log(svg)
        }

        // adding the href to the label
        svg.append('foreignObject')
          .style('font', '14px')
          // .style('display', 'table-caption')
          .style('width', '40px')
          .style('height', '40px')
          // .style('border-radius', '10px')
          // .style('border', '1px solid')
          // .style('padding', '5px 14px')
          .append('xhtml:div')
          .html('<a href="#" tabindex="-1"><div style="display: table-caption;color:'+ hintLinkColor +';padding: 1px 8px 1px 8px; border-radius: 10px; background: '+hintBGColor+'">' + shortcut + '</div></a>')
          // .data(data)
          .on('click', this.d3Action)

        if (D3Util.debug) {
          //console.log(elements[i])
          //console.log(svg)
        }
        // this.hints[shortcut] = element[i]
        hints[shortcut] = svg['_groups'][0][0]
      }
    return hints
  },
  buildHints (elements) {
    var maxIterator = null
    var hints = []
    var hintOptions = D3Util.hintOptions()
    var hintsLength = hintOptions.length
    maxIterator = Math.floor(elements.length / hintsLength)
    if (D3Util.debug) {
      console.log(maxIterator)
      console.log(hintsLength)
      console.log(hintOptions)
    }
    var hint = ''
    for (var i = maxIterator; i <= elements.length; i++) {
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
}
