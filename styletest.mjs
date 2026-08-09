import cytoscape from 'cytoscape'
const cy = cytoscape({ headless: true })
cy.add([
  { data: { id: 'a' } },
  { data: { id: 'b' } },
  { data: { id: 'ab', source: 'a', target: 'b' } },
])
console.log('before:', cy.edges().first().style('width'))
cy.style([
  { selector: 'edge', style: { 'width': 4, 'line-color': 'red' } },
])
console.log('after:', cy.edges().first().style('width'))
cy.destroy()
console.log('OK')
