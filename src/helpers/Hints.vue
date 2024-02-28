//import * as d3 from 'd3'
// import DagreLib from '@/helpers/DagreLib'
//import VueCookies from 'vue-cookies'
//var prevFocusedIndex = null
//var focusedIndex = null
//var DagreLib = null
<template>
  <div>
  </div>
</template>

<script>
import D3Util from '@/services/D3Util'
import * as Velocity from 'velocity-animate'
export default {
  name: 'Hints',
  // props: ['diagram', 'diagramId'],
  data () {
    return {
      data: null,
      hintKeysReplaced: '',
     }
  },
  mounted () {
    console.log('hints loaded')
  },
  followLinks (event) {
    if (D3Util.debug) {
      console.log('followingLinks')
      console.log(event)
      console.log(Object.keys(this.data).length)
    }
    var hintKeys = this.hintKeysReplaced + event.key
    var regex = new RegExp(event.key, 'g')
    var filteredData = this.d3FilterKeys(this.data, regex, event.key)
    this.data = filteredData.newHints
    var element = null
    if (Object.keys(this.data).length === 1) {
      console.log(this.data)
      element = this.data[hintKeys]
      if (D3Util.debug) {
        console.log('click link')
      }
      this.clickHref(element)
    }
    var data = {hints: this.data, hintKeys: hintKeys}
    return data
  },
  d3FilterKeys (hints, filter, eventKey) { // var key = []
    var keys = {}
    var newHints = {}
    var filterData = {}
    console.log(this.hintKeysReplaced)
    var hintKeys = this.hintKeysReplaced + eventKey

    if (D3Util.debug) {
      console.log(hints)
    }
    // Remove all href links that do not start with the key in the filter
    for (var key in hints) {
      if (D3Util.debug) {
        // console.log(key)
        // console.log(String(key).indexOf(eventKey))
        // console.log(hints[key])
        // console.log(hints[key].parentElement)
        // console.log(hints.hasOwnProperty(key))
        // console.log(filter.test(key))
      }

      if (key === hintKeys) {
        newHints[key] = hints[hintKeys]
        // continue
      } else if (String(key).startsWith(hintKeys)) {
        //var href = hints[key].parentElement.querySelector('a')
        this.hintKeysReplaced = hintKeys
        if(D3Util.debug){
          //console.log(href)
          //console.log(href.parentElement)
        }
        //href.text = href.text.replace(eventKey, '')
        newHints[key] = hints[key]
        // continue
      } else {
        if(D3Util.debug){
          //console.log(hints[key])
          //console.log(hints[key].lastElementChild)
        }
        hints[key].lastElementChild.remove()
      }
    }
    filterData['keys'] = keys
    filterData['newHints'] = newHints

    return filterData
  },
  clickHref (element) {
    if (D3Util.debug) {
      console.log(element)
    }
    var href = null
    Velocity(element.firstChild, {scale: 1.9}, {duration: 100})
    Velocity(element.firstChild, 'reverse', 100)
    // Velocity(this.hints[event.key].parentElement.lastChild, 'fadeOut',
    //   {delay: 100,
    //     duration: 500,
    //     complete: function () {
    //     }
    //   })

    href = element.lastElementChild.querySelector('a')
    href.click()
    this.removeHints(this.data)
    // resetting hintkeys
    //this.hintsKeyReplaced = ''
  },
  removeHints (hints) {
    // Remove all href links that do not start with the key in the filter
    for (var key in hints) {
      console.log(key)
      hints[key].lastElementChild.remove()
    }
  },
  hrefLink (){
    console.log(this)
    console.log('hrefLink')
  },
}
</script>
