import D3Util from '@/helpers/D3Util'
import { gsap } from 'gsap'

export default class Hints {
  constructor() {
    this.data             = null
    this.hintKeysReplaced = null
  }

  followLinks(event) {
    const hintKeys     = this.hintKeysReplaced + event.key
    const regex        = new RegExp(event.key, 'g')
    const filteredData = this.d3FilterKeys(this.data, regex, event.key)
    this.data          = filteredData.newHints
    return { hints: this.data, hintKeys }
  }

  d3FilterKeys(hints, filter, eventKey) {
    const newHints   = {}
    const filterData = {}
    const hintKeys   = this.hintKeysReplaced + eventKey

    for (const key in hints) {
      if (key === hintKeys) {
        newHints[key] = hints[hintKeys]
      } else if (String(key).startsWith(hintKeys)) {
        this.hintKeysReplaced = hintKeys
        newHints[key] = hints[key]
      } else {
        // Remove the badge div appended to the node card
        const badge = hints[key].querySelector('.hint-badge')
        if (badge) badge.remove()
        else if (hints[key].lastElementChild) hints[key].lastElementChild.remove()
      }
    }

    filterData.keys     = {}
    filterData.newHints = newHints
    return filterData
  }

  clickHref(element) {
    if (D3Util.debug) console.log(element)
    gsap.fromTo(element.firstChild, { scale: 1 }, { scale: 1.9, duration: 0.1, yoyo: true, repeat: 1 })
    const href = element.lastElementChild?.querySelector('a')
    if (href) href.click()
    this.removeHints(this.data)
  }

  removeHints(hints) {
    for (const key in hints) {
      const badge = hints[key].querySelector('.hint-badge')
      if (badge) badge.remove()
      else if (hints[key].lastElementChild) hints[key].lastElementChild.remove()
    }
  }
}
