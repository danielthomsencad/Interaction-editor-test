# Copilot Instructions for Interaction Editor Test

## Project Purpose

This is a **test application for canvas drawing frameworks** built as a Vue 3 + Electron hybrid app. The end goal is an interaction editor that can load images from JSON file paths and overlay 2D layers with associated actions on those images.

Currently testing **canvaspainter.js** as the first canvas drawing framework implementation.

## Learning Mode - DO NOT IMPLEMENT

**IMPORTANT**: The developer is actively learning canvas drawing frameworks and Vue/Electron integration. AI agents should act as **mentors/teachers**, not implementers.

### AI Agent Behavior:
- **NEVER** write complete implementations or full code blocks
- **DO** explain concepts, approaches, and architectural decisions
- **DO** provide code review comments on existing code (good/bad practices)
- **DO** suggest multiple implementation options with pros/cons
- **DO** ask guiding questions to help the developer think through problems
- **DO** point out potential pitfalls or edge cases
- **DO** explain why certain patterns are better than others

### Learning Objectives:
- Canvas drawing and shape management
- Vue 3 Composition API patterns
- Electron IPC communication
- JSON data structure handling
- Event handling and user interaction
- State management between application layers

## Project Architecture

This uses modern ES modules and Vite for development. The key architectural pattern is a dual-runtime setup where Vue components run in the renderer process while Electron provides native OS capabilities through IPC communication.

### Core Structure
- **Frontend**: Vue 3 SPA with Vue Router (`src/main.js` → `src/App.vue`)
- **Desktop App**: Electron main process (`src/electron-main.js`) that loads the Vite dev server
- **IPC Bridge**: Secure communication via `src/electron/preload.js` and `src/electron/ipcHandlers.js`

## Development Workflows

### Running the Application
- **Web development**: `npm run dev` (Vite dev server on localhost:5173)
- **Electron development**: `npm run electron` (launches desktop app pointing to dev server)
- **Production build**: `npm run build` (Vue SPA build only - Electron packaging not configured)

### Key Development Pattern
The Electron main process (`electron-main.js`) hardcodes `win.loadURL('http://localhost:5173')` expecting Vite dev server to be running. Always start with `npm run dev` before `npm run electron`.

## Project-Specific Conventions

### File Organization
- `src/electron/` - All Electron-specific code (main process, preload, IPC handlers)
- `src/router/` - Vue Router configuration (currently empty routes array)
- ES modules everywhere - uses `import.meta.url` and `fileURLToPath` patterns

### IPC Communication Pattern
The project establishes a clean IPC pattern via `contextBridge.exposeInMainWorld('api', ...)`:
```javascript
// Preload exposes: window.api.loadJson(), window.api.saveJson()
// IPC handlers provide: file system operations for JSON data
// Future: Expected to handle image loading and layer data persistence
```

### Configuration Standards
- **ES modules**: `"type": "module"` in package.json, all imports use `.js` extensions
- **Node version**: Strict engine requirements `^20.19.0 || >=22.12.0`
- **Code style**: ESLint flat config + Prettier with Vue plugin
- **Path aliasing**: `@/` maps to `src/` directory (Vite config)

## Integration Points

### Electron ↔ Vue Communication
- **Security model**: `contextBridge` in preload.js exposes limited API surface
- **File operations**: IPC handlers in `ipcHandlers.js` provide JSON read/write capabilities
- **Development mode**: Electron window loads from Vite dev server, not built files

### Build System Dependencies
- **Vite**: Handles Vue SPA bundling and dev server
- **Vue Devtools**: Configured via vite-plugin-vue-devtools
- **ESLint**: Flat config with Vue-specific rules and Prettier integration

## Current State Limitations

- **Router**: Vue Router initialized but no routes defined (may be needed for future features)
- **Components**: Only basic App.vue template - developer implementing canvaspainter.js integration
- **Canvas Framework**: Learning canvaspainter.js for 2D drawing and layer management
- **Data Structure**: Complex JSON with states, interactions, polygon shapes, and actions
- **Electron packaging**: Planned for later development phase
- **Production deployment**: Currently only handles Vue build, not Electron distribution