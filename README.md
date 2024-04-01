# D3DWeb

Prof of concept to see if it was possible to create a mind-mapping/diagraming tool that could be easily updated and manipulated via keyboard shortcuts. Warning: Not for the faint of heart, it will drive you mad if you try to use the mouse. Although some pieces can be manipulated accessed via the mouse, this is not by any means the default or the way D3D works.

## Why

Since my Unix days vi/vim has been my editor of choice and since those days I have gravitated towards finding vi/vim inspired tools for productivity. I've been successful at finding many different tools that are vi/vim inspired, and about the only thing I haven't been able to find was a tool to quickly generate mind-maps without the use of a mouse (I know, crazy thought). D3D was inspired by vi/vim shortcuts, however it has taken on a mind of it's own. Even though you can use some vi/vim shortcuts(jk mainly), I have moved towards using hint keys, similar to what you would find in the surfingkeys and vimium C chrome plugins.

## Demo

https://d3dweb.vercel.app

## Tech Stack / Tools

Here are some of the main (the ones I remember from memory) tools/libraries used to build this project, not in any specific order.

[vuetify.js](https://vuetifyjs.com/en/) - component framework used

[d3-dagre](https://github.com/dagrejs/dagre-d3) - (deprecated) main tool used to generate the diagram

[d3.js](https://d3js.org) - main library used by d3-dagre


[velocity](http://velocityjs.org/) - used for some of svg animation

## Issues

Still a work in progress, but here are some of the main things that need work

[ ] Cluster rendering, I may need to look at a new library to fix this issue.  Hitting/pressing the `esc` key (re-renders the diagram) a few times fixes the issue, but I haven't been able to figure out how to properly fix the problem

[ ] Some vuetify.js animations still needs some TLC

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
