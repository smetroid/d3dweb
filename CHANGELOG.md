# Changelog

## [1.8.0](https://github.com/smetroid/d3dweb/compare/d3dweb-v1.7.0...d3dweb-v1.8.0) (2026-09-04)


### Features

* **catalog:** add share thumbnails, card import, and a centred preview ([4a10a58](https://github.com/smetroid/d3dweb/commit/4a10a583d9ced1ca7b0fac66711f7c0f212f6efb))
* **catalog:** preview shared clusters in a dialog instead of navigating ([2242a9b](https://github.com/smetroid/d3dweb/commit/2242a9b4124c3c84c9877f684143835c782ddcc5))
* **deploy:** build d3dweb on Fly.io with nginx + CD workflow ([5318715](https://github.com/smetroid/d3dweb/commit/531871513dcb16e65f4f299f34d99cb061cda7ff))
* element sharing — public catalog, shared inbox, and rendered previews ([6826567](https://github.com/smetroid/d3dweb/commit/68265679abba48a7b6a787cfcb726bc6b11a697c))
* **icons:** make Material Symbols usable in the icon picker ([7bd5fe9](https://github.com/smetroid/d3dweb/commit/7bd5fe90164be7b548cb7622c49382e5826e36c6))
* **nav:** add Public Catalog menu entry and back-to-app links ([bcd6e72](https://github.com/smetroid/d3dweb/commit/bcd6e72b61b10999140384913530abfc6109df42))
* shareable nodes and edges ([849b2e2](https://github.com/smetroid/d3dweb/commit/849b2e276dc1e789cd70d2781e9864e455925d46))
* **shares:** render shared clusters and report save state ([3f87596](https://github.com/smetroid/d3dweb/commit/3f875961fee5c655dd68c89f0e60c3862fe05e64))


### Bug Fixes

* add cluster elements directly to mod.cy in mergeElementShare ([07f3c72](https://github.com/smetroid/d3dweb/commit/07f3c72970878b522f6b7c340f444e06d2f90679))
* add cluster elements directly to mod.cy in mergeElementShare ([27d3528](https://github.com/smetroid/d3dweb/commit/27d3528dd067e5c5896ca43da8bbd27eac1f0329))
* defensive JSON.parse for cluster in merge and import paths ([5714d96](https://github.com/smetroid/d3dweb/commit/5714d96a975ce11c429ae16e812a835b6ff55a43))
* **inbox:** add cluster elements directly to mod.cy after newDiagram ([f96c1e4](https://github.com/smetroid/d3dweb/commit/f96c1e44a97fa5c13416412309e236df0410fe24))
* **inbox:** add cluster elements directly to mod.cy after newDiagram ([caae887](https://github.com/smetroid/d3dweb/commit/caae8873eed5d4170648944d102a3180e98fc324))
* **inbox:** populate imported cluster into fresh diagram ([e75715a](https://github.com/smetroid/d3dweb/commit/e75715a0d172b375aafb749bdeda902c112d2b1e))
* **inbox:** populate imported cluster into fresh diagram ([f040609](https://github.com/smetroid/d3dweb/commit/f040609566b15c360761e2343c14abf7f434a67d))
* **inbox:** wire New Diagram button and fix field names ([ff1acac](https://github.com/smetroid/d3dweb/commit/ff1acac34366684fdafda3357d8c4d877a6770ab))
* **inbox:** wire New Diagram button and fix template field names ([cd8b526](https://github.com/smetroid/d3dweb/commit/cd8b5266d9c37eaa673003a77b35d3ee8a78094f))
* **shares:** debug logging for inbox load and share creation errors ([52a7f86](https://github.com/smetroid/d3dweb/commit/52a7f86b675185a624f8390004e95a3bbe28f9ae))
* **shares:** log inbox API response and surface fetch errors in console ([c76f21c](https://github.com/smetroid/d3dweb/commit/c76f21c70125ca95b59433b1e01d05ad5501ed18))
* **shares:** show the server's error message in the share dialog ([7c6a5f6](https://github.com/smetroid/d3dweb/commit/7c6a5f680b68629d9e0434de3a2904a9f5c208be))
* **shares:** surface createElementShare errors in console instead of swallowing them ([a211e75](https://github.com/smetroid/d3dweb/commit/a211e75c2b0c5e5e2145e4326c6bda583b44c074))
* **shares:** surface createElementShare errors in console instead of swallowing them ([21c4590](https://github.com/smetroid/d3dweb/commit/21c45907f9a157054f39879cdb5bc41582a04843))
* **shares:** surface server error messages in the remaining share views ([39655c8](https://github.com/smetroid/d3dweb/commit/39655c82bec86725d8e0a12165aa6905fbacb5a4))
* **shares:** surface the server message when toggling diagram visibility ([b4bb788](https://github.com/smetroid/d3dweb/commit/b4bb788915a8928e614f5789b7c390c510b87fb8))

## [1.7.0](https://github.com/smetroid/d3dweb/compare/d3dweb-v1.6.0...d3dweb-v1.7.0) (2026-08-25)


### Features

* **shares:** wire inbox and catalog — fix response shapes, add title + catalog UI ([a292e71](https://github.com/smetroid/d3dweb/commit/a292e710481c69deaaa0ad8e204df22b80fdd4a2))


### Bug Fixes

* correct segmented curve style value and add cycle shortcut ([7677ec7](https://github.com/smetroid/d3dweb/commit/7677ec759ecf4d12702c644afc830851591ffb77))
* correct segmented curve style value and add cycle shortcut ([e940ec0](https://github.com/smetroid/d3dweb/commit/e940ec051f7b84d18337d67250fcec658fcb0f67))
* normalize audience.id to ids array and populate username for Me audience ([2431f7f](https://github.com/smetroid/d3dweb/commit/2431f7f58751ffd847f64efb929abc061b41909c))
* **shares:** intercept all graph keys while element share dialog is open ([f0f7082](https://github.com/smetroid/d3dweb/commit/f0f7082069150eb23155283ed62139555383ab6c))
* **shares:** pass mod.cy to modelToGraphlib in graphlibJson computed ([c796aac](https://github.com/smetroid/d3dweb/commit/c796aac53408394a7c647c262ddbecf2dd04a62e))
* **shares:** release graph focus trap when element share dialog opens ([e2ee3b7](https://github.com/smetroid/d3dweb/commit/e2ee3b736265dd7d762c3ea4891a39becde5647a))
* **shares:** remove trapGraph toggle from element share dialog open/close ([db7903f](https://github.com/smetroid/d3dweb/commit/db7903f7df8a1d243b151ed4e346fc4748e62488))
* **shares:** resolve shift+e conflict and add selection instructions ([371f0cf](https://github.com/smetroid/d3dweb/commit/371f0cf503604163000b66f25206dfcbe83620c4))
* **shares:** resolve shift+e conflict and add share instructions ([da56a91](https://github.com/smetroid/d3dweb/commit/da56a91b7953627d78036cea69bca363277593ae))
* **shares:** resolve Shift+E conflict and add share instructions ([a565422](https://github.com/smetroid/d3dweb/commit/a56542233f78b0a124ff70aa7ef85b46170adfa5))
* **shares:** use focused element for sharing; update docs and helper pane ([91dc720](https://github.com/smetroid/d3dweb/commit/91dc720bb37e884b80d9c68612fe21cea2713fb9))
* show inbox-sent confirmation for non-public shares instead of error ([5a6390d](https://github.com/smetroid/d3dweb/commit/5a6390d0a40dc04e3dac029f6e893f9e358fb7ca))
* snapshot shareRootId at dialog open to prevent 400 on share POST ([52230e5](https://github.com/smetroid/d3dweb/commit/52230e5164f611e44cb9d28f3efc1c24a579fb60))
* use camelCase field names in share request to match API contract ([132f188](https://github.com/smetroid/d3dweb/commit/132f188dbc84f39394924d2f0d645238ff8d4be7))

## [1.6.0](https://github.com/smetroid/d3dweb/compare/d3dweb-v1.5.2...d3dweb-v1.6.0) (2026-08-23)


### Features

* **shares:** add frontend components, routes, and tests for element sharing ([#45](https://github.com/smetroid/d3dweb/issues/45)-[#50](https://github.com/smetroid/d3dweb/issues/50)) ([eb201c4](https://github.com/smetroid/d3dweb/commit/eb201c4563578d61b1cb34864f1ad1a355f52631))
* **shares:** element share + company/group API client + cluster helpers ([22098c0](https://github.com/smetroid/d3dweb/commit/22098c0c8c3d094d66aac988c4218f3a886f5b5d))
* **shares:** element sharing — dialogs, routes, inbox, catalog ([#45](https://github.com/smetroid/d3dweb/issues/45)–[#50](https://github.com/smetroid/d3dweb/issues/50)) ([a140da0](https://github.com/smetroid/d3dweb/commit/a140da0db178302c019b08010492d99243aa3cc2))

## [1.5.2](https://github.com/smetroid/d3dweb/compare/d3dweb-v1.5.1...d3dweb-v1.5.2) (2026-08-22)


### Bug Fixes

* **api:** stop swallowing HTTP errors and handle failures at call sites ([7a5f5c2](https://github.com/smetroid/d3dweb/commit/7a5f5c2feb06c67cb1b7bd62e27bc8d9ac8a61fd))
* **api:** stop swallowing HTTP errors and handle failures at call sites ([ab46fe2](https://github.com/smetroid/d3dweb/commit/ab46fe2243efd6e675a09fca9c7406a58e126b99))
* **embed:** detect fork success correctly and always notify ([822e323](https://github.com/smetroid/d3dweb/commit/822e3235128f1121e96ed6155f8d840be255e8ff))
* **embed:** detect fork success correctly and always notify ([8db3715](https://github.com/smetroid/d3dweb/commit/8db3715bd3f8295302090f274a1c2a48f3bc3186))
* **embed:** detect fork success correctly and always notify ([14742a5](https://github.com/smetroid/d3dweb/commit/14742a5642ee9af4990d2606f91e9fa4285a6304))
* **embed:** detect fork success correctly and always notify ([44b5051](https://github.com/smetroid/d3dweb/commit/44b5051b1a4237d36a84335b612ff29de7dfbc3e))

## [1.5.1](https://github.com/smetroid/d3dweb/compare/d3dweb-v1.5.0...d3dweb-v1.5.1) (2026-08-22)


### Bug Fixes

* **embed:** show fork bar for logged-in users and lift it above the footer ([849f30f](https://github.com/smetroid/d3dweb/commit/849f30fb82fe80fb42a679c5dbb1aed55a44f9bd))
* **embed:** show fork bar for logged-in users and lift it above the footer ([4918b9b](https://github.com/smetroid/d3dweb/commit/4918b9b5267ebfacc9c6fee7c50b54a3bff555be))

## [1.5.0](https://github.com/smetroid/d3dweb/compare/d3dweb-v1.4.0...d3dweb-v1.5.0) (2026-08-22)


### Features

* **graph:** add shortcuts for node/edge selection mode ([cbeb1f6](https://github.com/smetroid/d3dweb/commit/cbeb1f659eef7be07b938ff79ddd3a0a76bf1b07))
* **graph:** add shortcuts for node/edge selection mode ([9c24b70](https://github.com/smetroid/d3dweb/commit/9c24b70faf87931fe19f6e9b2e12b75e9a14e3e5))
* **settings:** change defaults for help pane and new node shape/alignment ([0c8c13b](https://github.com/smetroid/d3dweb/commit/0c8c13be568d742bbb643873fdc96db47bde41e8))
* **settings:** change defaults for help pane and new node shape/alignment ([aff8d7e](https://github.com/smetroid/d3dweb/commit/aff8d7e475097ec877f122c6c7d7c2989322bc39))

## [1.4.0](https://github.com/smetroid/d3dweb/compare/d3dweb-v1.3.1...d3dweb-v1.4.0) (2026-08-22)


### Features

* **share:** add README badge tab to ShareDialog ([f9f91c8](https://github.com/smetroid/d3dweb/commit/f9f91c8d4b7e53c9060dcd28ff0c3d825ab4fc77))
* **share:** add README badge tab to ShareDialog ([3b1e3ef](https://github.com/smetroid/d3dweb/commit/3b1e3ef3e1251d652272e4adecbf67bc5d4f9c55))

## [1.3.1](https://github.com/smetroid/d3dweb/compare/d3dweb-v1.3.0...d3dweb-v1.3.1) (2026-08-21)


### Bug Fixes

* **app:** fall back to local storage by ID when server diagram not found ([d332d00](https://github.com/smetroid/d3dweb/commit/d332d00d1ce8adc8a72c033c9c077e21b16e4a7d))
* **diagram-list:** remove ID column to hide legacy byte-array IDs ([5926ff5](https://github.com/smetroid/d3dweb/commit/5926ff57f2a3670cdb8bf8e35bd97217d99327a9))
* **embed:** strip protocol from host to prevent double-https in embed URL ([1744aea](https://github.com/smetroid/d3dweb/commit/1744aea0df58c421bb834fee0fe93e34c702462e))
* **embed:** strip protocol from host to prevent double-https in embed URL ([2e4da9f](https://github.com/smetroid/d3dweb/commit/2e4da9f5ceb47539bd364e341812b6a0d9c92c0f))
* handle legacy byte-array diagram IDs gracefully ([566fed7](https://github.com/smetroid/d3dweb/commit/566fed7654cc9eed9961ed36648520300bfa0c09))
* remove catch blocks that silently swallow errors ([579ece2](https://github.com/smetroid/d3dweb/commit/579ece2595e500215e8f5c01930f27d912404cfe))
* remove catch blocks that silently swallow errors ([cd85fed](https://github.com/smetroid/d3dweb/commit/cd85fed37d80e4990b3c25c28fb8dfa610411c37))

## [1.3.0](https://github.com/smetroid/d3dweb/compare/d3dweb-v1.2.1...d3dweb-v1.3.0) (2026-08-21)


### Features

* **settings:** show deployed app version in settings footer ([93c52ce](https://github.com/smetroid/d3dweb/commit/93c52ce33442474a1a93be9a195f6396f35c395f))
* **settings:** show deployed app version in settings footer ([d618ea8](https://github.com/smetroid/d3dweb/commit/d618ea8eb7058b1cf485a30582a26c74ca1923be))


### Bug Fixes

* **lint:** declare __APP_VERSION__ as eslint global ([83c1349](https://github.com/smetroid/d3dweb/commit/83c13495451a0846da0e29526e3de51d6e588b6b))

## [1.2.1](https://github.com/smetroid/d3dweb/compare/d3dweb-v1.2.0...d3dweb-v1.2.1) (2026-08-21)


### Bug Fixes

* **api:** graceful fallback when diagram cannot be loaded from server ([ff01d6d](https://github.com/smetroid/d3dweb/commit/ff01d6dbecce96aaf90b45bb3c82e9eff6860a21))

## [1.2.0](https://github.com/smetroid/d3dweb/compare/d3dweb-v1.1.0...d3dweb-v1.2.0) (2026-08-19)


### Features

* **embed:** GitHub plugin embed fixes ([e5bf08d](https://github.com/smetroid/d3dweb/commit/e5bf08da12347dc50872cde2829547546d65d05d))


### Bug Fixes

* **embed:** add v=3 to render urls to bust github camo cache ([229d800](https://github.com/smetroid/d3dweb/commit/229d800c0f4be11196c80516469a1b4c1dccd6e6))
* **embed:** bust github camo cache + add v param to render urls ([4222ceb](https://github.com/smetroid/d3dweb/commit/4222ceb1cde03b73372eb60ea3b915b91b36359c))
* **embed:** pass GraphModel to modelToGraphlib, not DiagramGraph ([cfa86b3](https://github.com/smetroid/d3dweb/commit/cfa86b3849430828307cfd9f60c669631a53e173))

## [1.1.0](https://github.com/smetroid/d3dweb/compare/d3dweb-v1.0.0...d3dweb-v1.1.0) (2026-08-19)


### Features

* **auth:** add login status indicator, logout, and token validation ([14f8866](https://github.com/smetroid/d3dweb/commit/14f8866a2d3fc1a1eddb5e3d86e0b804b04e1db5))
* **auth:** login status indicator, logout, and token validation ([4aec892](https://github.com/smetroid/d3dweb/commit/4aec8924673a7fb3a3c6ab93104c1a52cc02f448))
* **embed:** add embed tab to ShareDialog with inline and by-id modes ([261bbb8](https://github.com/smetroid/d3dweb/commit/261bbb82d44396dc9769b826fab74885ff956aad)), closes [#57](https://github.com/smetroid/d3dweb/issues/57)
* **embed:** add npm workspaces + @d3dweb/embed package ([14270b5](https://github.com/smetroid/d3dweb/commit/14270b5fe495485e74e683d10ba16cf884d8f319))
* **embed:** Release 1 — inline embed, @d3dweb/embed package, ShareDialog Embed tab, README ([528477c](https://github.com/smetroid/d3dweb/commit/528477c396fd77d025eb1725811414c163185666))
* **embed:** spa deep-link handler for ?src= and ?id= embed params ([9af9a83](https://github.com/smetroid/d3dweb/commit/9af9a83f468e42f8422d207a35b46d5c4749e378)), closes [#56](https://github.com/smetroid/d3dweb/issues/56)
* expand diagram saved block and right-align meta group in control matrix header ([f5faa9a](https://github.com/smetroid/d3dweb/commit/f5faa9a8c332d6d0fee1f870ee63572b836f012e))
* move diagram info into footer nav bar and control matrix header ([12bfe9f](https://github.com/smetroid/d3dweb/commit/12bfe9f1c1ab4f6ea409e7e71e7f6c15ec96688f))
* move diagram info into footer nav bar and control matrix header ([6da760b](https://github.com/smetroid/d3dweb/commit/6da760b601a1ba4ec3f2c35b0db5094bd4fa5137))


### Bug Fixes

* **auth:** use correct JWT claim for username and normalize serverUrl to prevent double slashes ([ea7828f](https://github.com/smetroid/d3dweb/commit/ea7828f1e54fee8a3fcb4dfe6e4f14b17b0b6565))
* **auth:** use correct JWT claim for username and normalize serverUrl to prevent double slashes ([7f78d75](https://github.com/smetroid/d3dweb/commit/7f78d7561fdf7224a15ab73c6afd1fb32d099dab))
* **embed:** use TextDecoder for pako v2 inflate (dropped to:string option) ([9d6a63b](https://github.com/smetroid/d3dweb/commit/9d6a63b7b0765a01cee928ee2933509303fe7c60))
* **merge:** resolve conflict with main — keep embedMode + token validation ([2adbadc](https://github.com/smetroid/d3dweb/commit/2adbadced68533a7ccb5f7e7c42c8584a2902770))

## 1.0.0 (2026-08-15)


### Features

* add configurable server URL to settings ([daae138](https://github.com/smetroid/d3dweb/commit/daae1387350c14a217b7ac8dca77c1ece3f3e664))
* add dagre hierarchical layout ([d2fc8d4](https://github.com/smetroid/d3dweb/commit/d2fc8d4d59b1e9d1ef42bd1fcffa8bd562df1c50))
* add global Alt/⌥ shortcuts for menu actions ([44f23f9](https://github.com/smetroid/d3dweb/commit/44f23f98a3077cb0a9082834678eba6a35990bc4))
* add multi-layout support with per-layout settings ([9825c53](https://github.com/smetroid/d3dweb/commit/9825c531a6f457a1d04fb1418f27001645c0d5d3))
* advanced cytoscape UI polish — hover, glass, shape colors, custom fill ([0075a6c](https://github.com/smetroid/d3dweb/commit/0075a6c937b0ac3271e8c843e70b8bf8e043d5d9))
* align settings dropdowns with node and edge form options ([c34dba1](https://github.com/smetroid/d3dweb/commit/c34dba14008f729b10458e49f0671179b64dd4a6))
* **charts:** add d3d-stack helm chart for minikube dev ([e7a4e97](https://github.com/smetroid/d3dweb/commit/e7a4e977133c7542d4a839c5eb9563d2fb499c96))
* **charts:** add local dev targets to Makefile ([e4dbc2f](https://github.com/smetroid/d3dweb/commit/e4dbc2fbab1311f59af463c52bde1702dab7d4ac))
* **charts:** helm chart for minikube dev stack (d3d-stack) ([b951b6c](https://github.com/smetroid/d3dweb/commit/b951b6c2c5546db4d8836477e72e9ad8342f5ba0))
* **collab:** add VITE_COLLAB_ENABLED feature flag ([3ec5d37](https://github.com/smetroid/d3dweb/commit/3ec5d37a358bb2676f8a63b3829aa5d1f65fa384))
* **collab:** history panel ui and diagram reload wiring ([75bb270](https://github.com/smetroid/d3dweb/commit/75bb2703eccc24cbca82ccfac4f820a3d7e278ab))
* **collab:** include clientId in server save payload for echo prevention ([b5dd2a5](https://github.com/smetroid/d3dweb/commit/b5dd2a503af062aba6dc782229118849de524035))
* **collab:** merge production collaboration features into main ([f57dc4d](https://github.com/smetroid/d3dweb/commit/f57dc4d7862bcc58f523cfd19244d35b4ad07785))
* **collab:** persist and restore node positions for layout consistency ([800c04d](https://github.com/smetroid/d3dweb/commit/800c04dc8027b6c2e191b3a12998a4b4749e5d1b))
* **collab:** phase 3 share links ([20f604e](https://github.com/smetroid/d3dweb/commit/20f604e8cfc1389fd7f03b25a8b7e672ca62ec06))
* **collab:** presence layer — avatars hud and peer selection halos ([da7c0a3](https://github.com/smetroid/d3dweb/commit/da7c0a3bfae608e3ab07c84d68d07ae76a1a2695))
* **collab:** production collaboration features (history, shares, presence) ([4740750](https://github.com/smetroid/d3dweb/commit/474075078d75f0068dfe9eb5274fbdf484d793de))
* **collab:** store and display anon name for share-link holders ([956543b](https://github.com/smetroid/d3dweb/commit/956543bbd7a3d4b58eae86db11da090f1ebc557b))
* **collab:** task 1 — yjs poc with two-panel shared Y.Text ([640b395](https://github.com/smetroid/d3dweb/commit/640b3954d3f6cfdb8132b2621ab257c688e74596)), closes [#16](https://github.com/smetroid/d3dweb/issues/16)
* **collab:** task 2 — ws notification spike ([4839707](https://github.com/smetroid/d3dweb/commit/4839707cbc3fe0541db43f237110bbe63142ef71)), closes [#17](https://github.com/smetroid/d3dweb/issues/17)
* **collab:** view-only enforcement for share links with role=view ([9149371](https://github.com/smetroid/d3dweb/commit/914937176b4b8e40c41b16271667cddde82e89bf)), closes [#32](https://github.com/smetroid/d3dweb/issues/32)
* **collab:** ws client service and debounced auto-save ([5ff5645](https://github.com/smetroid/d3dweb/commit/5ff5645f98753111e6c1a7bfb6cea766d8cc6c0f))
* **config:** allow build-time API base URL via VITE_API_BASE_URL ([2190f90](https://github.com/smetroid/d3dweb/commit/2190f90fc36776b10f31149c1735ce572668165b))
* **diagram:** local autosave on change and browser snapshot history ([02a0a2f](https://github.com/smetroid/d3dweb/commit/02a0a2f72f616da38a5a479b52d3e37a5c12754a))
* **diagram:** local autosave on change and browser snapshot history ([bb0fa0d](https://github.com/smetroid/d3dweb/commit/bb0fa0d6990a6630a7537d80ecf0a14de932d35c))
* **icons:** add node/edge icon support and shapeless node shape ([486b009](https://github.com/smetroid/d3dweb/commit/486b009af938d1d1a80e03f36bc42a150bc202cb))
* **icons:** node/edge icon support and shapeless node shape ([a9d3c7d](https://github.com/smetroid/d3dweb/commit/a9d3c7d485a8d9e099256586059ffd83a35dafde))
* **join:** call backend exchange endpoint; reject revoked share links ([de86580](https://github.com/smetroid/d3dweb/commit/de865804cac262f5cac2f717f84ae18c743a599f))
* make node and edge labels optional with empty default ([a61cf89](https://github.com/smetroid/d3dweb/commit/a61cf89381f3eaa8ed42fd3d22b2ce7508af4e55))
* make node and edge labels optional with empty default ([87f6232](https://github.com/smetroid/d3dweb/commit/87f62321e91d8cc9214d1fc59ece3ced694b8ce6))
* migrate diagram renderer from three.js/webcola to cytoscape.js ([dbb99d3](https://github.com/smetroid/d3dweb/commit/dbb99d3ac1c6018b3ed4df785d7a3c7c32452a5d))
* migrate to cytoscape renderer, modernize UI, and add full CI/CD pipeline ([a416e14](https://github.com/smetroid/d3dweb/commit/a416e14deb415a5d64ad4f999868127db0831571))
* modernize cytoscape UI and fix zoom/pan controls ([906ea82](https://github.com/smetroid/d3dweb/commit/906ea8287db82f6a6a91c615ef84e1ae811326c2))
* modernize login, save/edit, and open forms with HUD styling ([a6e1619](https://github.com/smetroid/d3dweb/commit/a6e16198da2e453766f3a94a633147acd9c8e063))
* per-diagram layout selection and options in save form ([a18b358](https://github.com/smetroid/d3dweb/commit/a18b358327d92bea4bf481556119c55f96112697))
* proximity-based j/k/h/l node and edge selection ([c3b4737](https://github.com/smetroid/d3dweb/commit/c3b473744f0449bfbf6fd8311c798fadbed8e0bb))
* render edge labels when set ([432b6e9](https://github.com/smetroid/d3dweb/commit/432b6e9a4cec0e3c042abba9ad98b725d7b00c72))
* replace dropdown menus with command palette (M/A/⌘K) ([09eb75e](https://github.com/smetroid/d3dweb/commit/09eb75e2c2b0db22fc5c1d4769916d7eae9bd854))
* settings-driven defaults for new nodes and edges ([aaae783](https://github.com/smetroid/d3dweb/commit/aaae78322c7e54eb87203f8ad3c2192825f38d1e))
* **shortcuts:** configurable form and graph shortcuts ([c93ca97](https://github.com/smetroid/d3dweb/commit/c93ca97fc66e11e8045825784f05dfb13a1587ea))
* **shortcuts:** user-rebindable shortcut registry, settings editor, and graph-key dispatch ([a327270](https://github.com/smetroid/d3dweb/commit/a3272707db0ee56fe9b3a142d20cd5b78c2013b5))
* webcola obstacle-avoiding edge routing ([09731b2](https://github.com/smetroid/d3dweb/commit/09731b2b36509d9c456da800924eff026b91b51a))


### Bug Fixes

* add min-width/min-height to nodes so unlabelled nodes stay visible ([d20576b](https://github.com/smetroid/d3dweb/commit/d20576be786f09352d88fe361250548d72e30331))
* allow empty string label to pass through _cleanPatch ([647dba1](https://github.com/smetroid/d3dweb/commit/647dba169eb66fb028d1ab53085a47078dc10ca2))
* **charts:** patch ingress-nginx to LoadBalancer for macOS Docker driver ([6881ed9](https://github.com/smetroid/d3dweb/commit/6881ed9b044f392307c84668395152493be7ec6c))
* clear selections after edge creation and show double-selection crosshair ([695ea10](https://github.com/smetroid/d3dweb/commit/695ea109589ea427964a2de05cab82eb96176434))
* close custom select dropdown after picking an option ([c675eb3](https://github.com/smetroid/d3dweb/commit/c675eb374d05dfe3fa004f92beb3515525d85468))
* **collab:** disable focus-trap escapeDeactivates so Esc closes panels ([d2457fe](https://github.com/smetroid/d3dweb/commit/d2457fec7f8fdcdd84c21f7118aed3162fb47996))
* **collab:** eliminate diagram:updated feedback loop and WS reconnect storm ([eb96e9d](https://github.com/smetroid/d3dweb/commit/eb96e9da342328ea12dd6b6b79e387e55dd2a9f2))
* **collab:** extract [@mousedown](https://github.com/mousedown) to method to avoid prettier/vue conflict ([481b4cc](https://github.com/smetroid/d3dweb/commit/481b4ccb84102abd889815d5a107ad600869163f))
* **collab:** only suppress auto-save during initial layout in collab mode ([92ba11c](https://github.com/smetroid/d3dweb/commit/92ba11c9cfe5c5b5e6db7227d05c57ac8904756c))
* **collab:** prevent diagram:updated feedback loop + UX improvements ([8a19a8d](https://github.com/smetroid/d3dweb/commit/8a19a8d9c91311bdfea63132bb34918987cdff5f))
* **collab:** reduce remote reload debounce from 2s to 300ms ([a6f4520](https://github.com/smetroid/d3dweb/commit/a6f452035a253e30ef01e581b7dd421d46a85b3b))
* **collab:** skip layout on remote reload to preserve node positions ([030274f](https://github.com/smetroid/d3dweb/commit/030274f20d3bda587297f97b5a0a6bc6afdb3928))
* handle null localDiagramInfo on first visit to avoid crash in loadDiagram ([5b92af7](https://github.com/smetroid/d3dweb/commit/5b92af72c0d89c878b9be8830de9b7cedffc9085))
* initialize empty modifier on first visit so graph view renders ([8ec2e84](https://github.com/smetroid/d3dweb/commit/8ec2e84ddde08f748cd23a3c900b6fd9d7a30786))
* keyboard nav + prefix search for form dropdowns ([b17666e](https://github.com/smetroid/d3dweb/commit/b17666e3ef50cae3ad4a1afb1736b507f9bcc333))
* make graph viewport grid visible on light theme ([2a356df](https://github.com/smetroid/d3dweb/commit/2a356dfb24862b0650f499fa6cd0dd6f9698b213))
* match helper shortcut color with theme, menu, and actions ([cb1c1cb](https://github.com/smetroid/d3dweb/commit/cb1c1cb5909c49ce580934b0f293370b78d7c3da))
* move localStorage access from template to computed property in DiagramList ([880dddc](https://github.com/smetroid/d3dweb/commit/880dddcdebfd00205f2356f834cee4e8cfa4903b))
* normalize empty optional node/edge style fields ([67b49fa](https://github.com/smetroid/d3dweb/commit/67b49fa60b95feed82048d869d58f9f09e25fd6b))
* re-apply cytoscape theme after data-theme attr is set on mount ([fd6ef4e](https://github.com/smetroid/d3dweb/commit/fd6ef4e1b18e76d6dd81239a4821bb5d9347bccf))
* remove crosshair pop/jump animation on j/k navigation ([30d9d72](https://github.com/smetroid/d3dweb/commit/30d9d72b42295dace0c91195ca674f63024ae241))
* remove orphaned JQ component usage ([b718747](https://github.com/smetroid/d3dweb/commit/b7187473d3e5dd710d8ffbd9a0fb7a05b90bde53))
* render unlabelled nodes at fixed 40x30px size ([6d01f5a](https://github.com/smetroid/d3dweb/commit/6d01f5a01fcd3df3d8553f5b46974357a103e6cc))
* respect empty default node/edge label from settings ([39690b1](https://github.com/smetroid/d3dweb/commit/39690b13b3a5aff980207a4010790a55c4b3ed91))
* restore graph focus after cytoscape mousedown and normalize hint color ([9795f54](https://github.com/smetroid/d3dweb/commit/9795f54e3328162f924e21a143887a09f2d816c2))
* seed new nodes from viewport center on fresh load ([30fccff](https://github.com/smetroid/d3dweb/commit/30fccfffa2f58b8560d309927eb07b8c42218c3f))
* use dedicated click handler for hint badges instead of keyPress ([c3752a2](https://github.com/smetroid/d3dweb/commit/c3752a2fcfa8b9e55e82b463c9061795d61c444b))
