# d3dweb

Vue 3 + Cytoscape DAG (directed acyclic graph) editor with real-time multi-user collaboration. Connects to [d3d-api](https://github.com/smetroid/d3d-api) for persistence and WebSocket relay.

## Tech stack

| Layer            | Library                                                                      |
| ---------------- | ---------------------------------------------------------------------------- |
| Framework        | [Vue 3](https://vuejs.org/) (Options API) + [Vite](https://vitejs.dev/)      |
| Graph rendering  | [Cytoscape.js](https://js.cytoscape.org/) + cytoscape-cola + cytoscape-dagre |
| UI components    | [Vuetify 3](https://vuetifyjs.com/)                                          |
| HTTP             | [Axios](https://axios-http.com/)                                             |
| Real-time        | Native WebSocket (via `src/services/collab.js`)                              |
| Routing          | Vue Router 4                                                                 |
| Focus management | focus-trap-vue                                                               |
| Animations       | GSAP                                                                         |

## Prerequisites

- Node.js 18+
- [d3d-api](https://github.com/smetroid/d3d-api) running locally (see that repo's README)

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env.local` (gitignored) with your local overrides:

```bash
# Enable real-time collaboration features
VITE_COLLAB_ENABLED=true

# API base URL (defaults to http://localhost:3001 if not set)
VITE_API_BASE_URL=http://localhost:3001
```

`.env` ships with `VITE_COLLAB_ENABLED=false` as the safe default for production builds.

### 3. Start the dev server

```bash
npm run dev
```

Open `http://localhost:5173`. Log in with a user created via the `d3d-api` `createuser` CLI.

## Environment variables

| Variable              | Default                 | Description                                                     |
| --------------------- | ----------------------- | --------------------------------------------------------------- |
| `VITE_COLLAB_ENABLED` | `false`                 | Enables WS collab, presence HUD, history panel, and share links |
| `VITE_API_BASE_URL`   | `http://localhost:3001` | Base URL for d3d-api                                            |

## Real-time collaboration features

Enabled when `VITE_COLLAB_ENABLED=true`.

### Presence

Each connected user appears as an avatar chip in the top-left HUD. Peer node selections are shown as colored halos on the graph. Presence messages are relayed via the WebSocket room for the current diagram.

### Auto-save

Diagram changes are debounced (500ms) and saved to the server via `POST /dag/:dag/update`. The `clientId` claim in the payload prevents the saving peer from reloading its own change.

### History panel (`Shift+H`)

Opens a drawer listing the last 50 diagram snapshots. Any snapshot can be restored; restoration broadcasts `diagram:updated` to all live peers.

### Share links (`Shift+S`)

Generates a signed JWT share link. Recipients open `/join/:token` which:

1. Calls `GET /shares/exchange?token=<jwt>` on d3d-api to validate the token and check the revocation list
2. Stores the token in `localStorage` and redirects to the diagram

**Roles:**

- `view` — read-only; edit keyboard shortcuts, auto-save, and the share dialog are all disabled; a **VIEW ONLY** badge is shown top-right
- `edit` — full editing access

Share tokens can be revoked by the owner via the API (`POST /dag/:dag/shares/:jti/revoke`).

### Anonymous identity

View-only share holders are assigned a random display name (e.g. `"Teal Fox"`) on the server at share-creation time. The name is returned by `/shares/exchange` and stored in `localStorage` as `d3d_anon_name`, where it is picked up by presence messages.

## Keyboard shortcuts

| Key       | Action                              |
| --------- | ----------------------------------- |
| `j` / `k` | Navigate nodes                      |
| `h` / `l` | Navigate edges                      |
| `e`       | Edit focused node or edge           |
| `x`       | Delete focused node or edge         |
| `n`       | Add node (via alt/meta combo)       |
| `f`       | Hint mode (visual shortcut overlay) |
| `d`       | Clear multi-selection               |
| `Shift+H` | Open history panel                  |
| `Shift+S` | Open share dialog                   |
| `Esc`     | Close panels / cancel               |

All mutating shortcuts (`e`, `x`, `n`, alt/meta combos, `Shift+S`) are disabled in view-only mode.

## Routes

| Path               | Description                                                 |
| ------------------ | ----------------------------------------------------------- |
| `/`                | Main DAG editor (App.vue)                                   |
| `/join/:token`     | Share link exchange — validates token, redirects to diagram |
| `/collab-poc`      | Dev POC: Yjs text sync (internal, can be removed)           |
| `/collab-cyto-poc` | Dev POC: Cytoscape collab spike (internal, can be removed)  |

## Project structure

```
src/
  components/
    DiagramGraphView.vue   # Main graph canvas, keyboard handler, collab HUD
    DiagramGraph.js        # (helpers/) Cytoscape model, auto-save, layout
    HistoryPanel.vue       # Snapshot list and restore UI
    ShareDialog.vue        # Share link generator
    JoinView.vue           # /join/:token exchange and redirect
    D3NodeForm.vue         # Node edit form
    D3EdgeForm.vue         # Edge edit form
  services/
    api.js                 # Axios wrapper for all d3d-api calls
    collab.js              # WebSocket client singleton (connect, presence, echo prevention)
  helpers/
    DiagramGraph.js        # Graph model, layout, auto-save
    CytoscapeRenderer.js   # Peer selection halos
    D3Util.js              # Shared utilities
  router/
    index.js               # Vue Router routes
```

## Scripts

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run preview   # Preview production build locally
npm run lint      # ESLint (auto-fix)
npm run test      # Vitest unit tests
npm run format    # Prettier
```

## Building for production

```bash
npm run build
```

Output goes to `dist/`. Set `VITE_API_BASE_URL` to your production API URL at build time or via the hosting platform's environment variables.

## Deployment

CI runs lint and tests on every push. Production deploys are gated on CI passing. See `.github/workflows/` for the pipeline configuration.
