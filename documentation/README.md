# Interaction Editor Test

A Vue 3 + Electron hybrid application for editing interactive image overlays with polygon shapes, actions, and informational layers.

## Overview

This application serves as an interaction editor for loading images from JSON configurations and overlaying 2D interactive layers with associated actions. It provides a visual canvas-based editing environment where users can create, edit, and manage polygon shapes, text elements, and interactive zones.

## Architecture

### Technology Stack

- **Vue 3** with Composition API
- **Pinia** for state management
- **Vite** for build tooling and dev server
- **Electron** for desktop application wrapper
- **CodeMirror 6** for JSON editing
- **HTML5 Canvas** for rendering shapes and overlays

### Project Structure

```
src/
├── components/          # Vue components
├── composables/         # Reusable composition functions
├── stores/             # Pinia state management
├── electron/           # Electron-specific code (IPC, preload)
├── router/             # Vue Router (currently unused)
└── styles/             # SCSS styles and bitmap fonts
```

## Components

### App.vue

**Purpose:** Root application component that establishes the main layout grid.

**Layout Structure:**

- **Grid Areas:**
  - `toolbar` - Top navigation bar
  - `content` - Main canvas area (left)
  - `sidebar` - Interaction list (right, 300px)
  - `action-container` - Overlay for action editing

**Child Components:**

- ToolBar
- CanvasComponent
- SideBar
- ActionContainer

---

### ToolBar.vue

**Purpose:** Top navigation bar with file management and drawing tools.

**Features:**

- **Open File** button - Loads JSON configuration files
- **Create Shape** toggle button - Activates polygon drawing mode
  - Disabled when no interaction is selected
  - Shows "Drawing Mode" when active
  - Styled with active state (blue background)

**State Dependencies:**

- `jsonStore.isCreationToolActive` - Drawing mode state
- `jsonStore.selectedShapeId` - Current interaction selection

**Interactions:**

- Calls `openFile()` from toolBarComposable
- Calls `jsonStore.toggleCreationTool()` to enable/disable creation mode

---

### SideBar.vue

**Purpose:** Displays and manages interactions, states, and info layers in a hierarchical structure.

**Features:**

- **Interaction List:**
  - Drag-and-drop reordering
  - Color-coded visual indicators
  - Inline renaming (double-click)
  - Delete with confirmation dialog
  - Expandable to show child states

- **State Management:**
  - Nested under parent interactions
  - State switching with auto-save
  - Inline state renaming
  - State deletion tracking

- **Info Layer Navigation:**
  - Lists info layers within each state
  - Click to enter grayscale editing mode
  - Inline renaming and deletion

- **History Panel:**
  - Toggle view for deleted items
  - Restore deleted interactions/states/layers
  - Auto-close after 3 seconds if empty

**State Dependencies:**

- `jsonStore.currentInteractionShapes` - Shape data
- `jsonStore.currentInteractions` - Interaction metadata
- `jsonStore.currentStateIndex` - Active state
- `jsonStore.selectedShapeId` - Selected interaction
- `jsonStore.selectedInfolayerId` - Selected info layer

**Key Interactions:**

- Calls `jsonStore.setSelectedShape(id)` on interaction click
- Calls `jsonStore.setCurrentState(index)` on state change
- Calls `jsonStore.setSelectedInfolayer(name)` for info layer mode
- Finalizes shapes in creation mode before navigation

---

### CanvasComponent.vue

**Purpose:** Container component that manages the image display and canvas overlay system.

**Features:**

- Loads and displays the current state image
- Centers image on load
- Applies grayscale filter when in info layer mode
- Wraps content in ViewContainer for pan/zoom

**Child Components:**

- ViewContainer - Handles pan/zoom interactions
- ShapeRenderer - Renders shapes and handles drawing

**State Dependencies:**

- `jsonStore.currentImg` - Image path for current state
- `transformStore.panX/panY` - Pan position
- `transformStore.zoomLevel` - Zoom scale
- `transformStore.grayscale` - Info layer mode filter

**Computed Properties:**

- Centers image using container dimensions and image natural size
- Stores initial center position for zoom reset

---

### ViewContainer.vue

**Purpose:** Handles pan and zoom transformations for the canvas viewport.

**Features:**

- **Pan Mode:**
  - Space + drag to pan canvas
  - Boundary clamping (keeps portion of image visible)
  - Progressive freedom at higher zoom levels

- **Zoom Mode:**
  - Ctrl + scroll to zoom in/out
  - Min: 15%, Max: 250%
  - Zoom centered on mouse cursor position
  - Zoom reset to default (100%)

- **Movement Modifiers:**
  - First-pressed modifier wins (Ctrl OR Shift, not both)
  - Prevents conflicting zoom/selection operations

- **Text Editing:**
  - Opens InfoTextEditor modal for text elements
  - Handles save/cancel events

**State Management:**

- `transformStore.panX/panY` - Current pan offset
- `transformStore.zoomLevel` - Current zoom scale
- `transformStore.contentWidth/Height` - Image dimensions

**Key Methods:**

- `clampPanToBounds()` - Keeps image partially visible
- `openTextEditor()` - Exposed to child components for text editing

---

### ShapeRenderer.vue

**Purpose:** Core rendering engine for polygon shapes, info layers, and creation tool preview.

**Features:**

**1. Shape Rendering:**

- Draws polygon shapes with color-coded fills
- Renders selection highlights (yellow for layer, red for individual)
- Handles multi-select drag box visualization
- Shows vertex points and bounding boxes

**2. Info Layer Rendering:**

- Renders text elements using bitmap fonts
- Displays image overlays (popup images)
- Handles element selection and highlighting
- Supports drag-box multi-select for info elements

**3. Creation Tool:**

- **Vertex Placement:**
  - Shift+click to start new polygon
  - Click to add vertices
  - Visual preview with cyan lines
  - Vertex dots (white with black outline)
  - Rubber band line to cursor (dashed)

- **Finalization:**
  - Shift+click to start new shape (finalizes current)
  - Escape key to finalize/cancel
  - Automatic finalize on sidebar navigation
  - Converts absolute coordinates to relative vertices

- **Undo System:**
  - Ctrl+Z in creation mode: Undo last vertex OR un-finalize last shape
  - Ctrl+Z outside creation mode: Undo deletions
  - Un-finalizing restores vertices for continued editing
  - Automatically switches sidebar to shape's interaction when undoing

**4. Interaction Handling:**

- Click: Select shapes/elements
- Double-click: Open action editor or text editor
- Drag: Multi-select shapes/elements
- Keyboard: Arrow keys for movement, Delete for removal
- Mouse hover: Cursor changes (move, pointer, crosshair)

**State Dependencies:**

- `jsonStore.currentInteractionShapes` - Polygon shape data
- `jsonStore.currentInfolayer` - Info layer elements
- `jsonStore.isCreationToolActive` - Drawing mode
- `jsonStore.currentDrawingVertices` - Vertices being drawn
- `jsonStore.creationModeHistory` - Undo history for creation
- `jsonStore.selectedElements` - Current selection set

**Rendering Methods:**

- `renderShapes()` - Main shape rendering loop
- `renderInfoLayer()` - Info layer rendering loop
- `renderCreationPreview()` - Shows partial polygon during creation
- `drawPolygon()` - Renders individual polygon element
- `drawBitmapText()` - Renders text using bitmap font

**Canvas Coordination:**

- Dual canvas system: main canvas + info layer canvas
- Synchronized dimensions with image size
- Z-index layering for proper overlay

---

### ActionContainer.vue

**Purpose:** Overlay panel for editing interaction action data (JSON configuration).

**Features:**

- **Action List Display:**
  - Shows all action properties for selected interaction
  - Inline renaming of action keys
  - Delete actions with history tracking
  - Color-coded by interaction

- **JSON Editor:**
  - Opens EditorComponent for action editing
  - CodeMirror-based JSON editing
  - Syntax validation and linting
  - Save/cancel operations

- **History Panel:**
  - View deleted actions
  - Restore deleted actions
  - Auto-close after 3 seconds

**State Dependencies:**

- `actionStore.currentInteractionId` - Active interaction
- `actionStore.isActionContainerVisible` - Panel visibility
- `jsonStore.currentInteractions` - Interaction data
- `historyStore.deleteInteractionToolHistory` - Deleted actions

**Key Interactions:**

- Opens when action is double-clicked in ShapeRenderer
- Saves changes back to `jsonStore.currentInteractions`
- Tracks deletion/restoration in history store

---

### EditorComponent.vue

**Purpose:** CodeMirror 6 wrapper for JSON editing.

**Features:**

- **CodeMirror Configuration:**
  - JSON language mode
  - Syntax highlighting
  - JSON linting and error detection
  - Lint gutter for inline errors
  - Basic setup (line numbers, search, etc.)

- **Event Handling:**
  - `@save` emits edited content
  - `update:modelValue` for v-model support
  - Keydown stopPropagation to prevent canvas shortcuts

**Props:**

- `modelValue` - Initial JSON string

**Emits:**

- `save` - User clicks save button
- `update:modelValue` - Content changes (for v-model)

---

### InfoTextEditor.vue

**Purpose:** Modal dialog for editing text elements in info layers.

**Features:**

- **Text Editing:**
  - Textarea for multi-line text input
  - Auto-converts to uppercase on save
  - Tracks old/new values for history

- **Modal Controls:**
  - Save - Commits changes and closes
  - Cancel - Discards changes and closes
  - Click overlay to cancel

**Props:**

- `isOpen` - Controls modal visibility
- `textElement` - Element being edited (with x, y, text)

**Emits:**

- `save` - Passes edited text
- `close` - User cancels editing

---

## State Management (Pinia Stores)

### jsonStore

**Purpose:** Core data management for JSON configuration, shapes, and interactions.

**State:**

- `jsonData` - Full loaded JSON
- `states[]` - Array of state objects
- `currentStateIndex` - Active state index
- `currentImg` - Image path for current state
- `currentInteractionShapes` - Shape elements for current state
- `currentInteractions` - Interaction metadata
- `currentInfolayer` - Info layer elements
- `selectedShapeId` - Currently selected interaction
- `selectedInfolayerId` - Currently selected info layer
- `selectedElementCoords` - Individual element selection
- `selectedElementCoordsArray` - Multi-select elements
- `isCreationToolActive` - Drawing mode active
- `currentDrawingVertices` - Vertices being drawn
- `creationModeHistory` - Undo stack for creation mode
- `deletionHistory` - Undo stack for deletions

**Key Actions:**

- `setCurrentState(index)` - Switch state, load image and shapes
- `setSelectedShape(id)` - Select interaction
- `setSelectedInfolayer(name)` - Enter info layer mode
- `toggleCreationTool()` - Activate/deactivate drawing mode
- `addVertex(x, y)` - Add vertex to current drawing
- `finalizeDrawing(targetId)` - Convert drawing to shape element
- `undoCreationStep()` - Undo last vertex or un-finalize shape
- `undoRegularDeletion()` - Restore deleted elements
- `moveSelectedElements(dx, dy)` - Move shapes/elements
- `updateInteractionData(id, key, value)` - Update action data

---

### actionStore

**Purpose:** Manages action container visibility and current interaction.

**State:**

- `isActionContainerVisible` - Panel open/closed
- `currentInteractionId` - Active interaction for editing

**Actions:**

- `toggleActionContainerVisibility(id)` - Open/close panel

---

### transformStore

**Purpose:** Manages viewport pan/zoom transformations and visual filters.

**State:**

- `panX/panY` - Current pan offset
- `zoomLevel` - Current zoom scale (0.15 - 2.5)
- `contentWidth/Height` - Image dimensions
- `initialCenterX/Y` - Center position for zoom reset
- `grayscale` - Info layer mode filter

**Actions:**

- `setGrayscale()` - Enable grayscale filter
- `clearGrayscale()` - Disable grayscale filter

---

### historyStore

**Purpose:** Tracks deletion/restoration history for undo functionality.

**State:**

- `deleteInteractionLayerHistory` - Deleted interactions/states/layers
- `deleteInteractionToolHistory` - Deleted actions
- `infoLayerHistory` - Info layer element changes (add/edit/delete)

**Actions:**

- `deleteInteractionLayer(id)` - Track deleted interaction
- `restoreInteractionLayer(id)` - Restore deleted interaction
- `deleteInteractionTool(name)` - Track deleted action
- `restoreInteractionTool(name)` - Restore deleted action
- `addInfoLayerAction(action)` - Track info layer change
- `undoInfoLayerAction()` - Undo last info layer change

---

## Component Communication Flow

### Data Flow Hierarchy

```
App.vue
├── ToolBar.vue
│   └── → jsonStore (toggleCreationTool, openFile)
│
├── SideBar.vue
│   ├── → jsonStore (setSelectedShape, setCurrentState, setSelectedInfolayer)
│   ├── → historyStore (delete/restore interactions)
│   └── → ActionContainer (via state changes)
│
├── CanvasComponent.vue
│   └── ViewContainer.vue
│       ├── → transformStore (pan, zoom, grayscale)
│       ├── InfoTextEditor.vue
│       │   └── ← textElement (prop)
│       │   └── → @save (emit)
│       │
│       └── ShapeRenderer.vue
│           ├── → jsonStore (shapes, selections, creation mode)
│           ├── → historyStore (track changes)
│           └── ← @openTextEditor (emit to ViewContainer)
│
└── ActionContainer.vue
    ├── → actionStore (visibility, currentInteraction)
    ├── → jsonStore (interaction data)
    └── EditorComponent.vue
        └── → @save (emit JSON changes)
```

### Key Interaction Patterns

**1. Shape Selection:**

```
User clicks canvas
→ ShapeRenderer.handleCanvasClick()
→ jsonStore.setSelectedShape(id)
→ SideBar updates active highlight
```

**2. Creation Mode:**

```
User clicks "Create Shape" button
→ ToolBar calls jsonStore.toggleCreationTool()
→ ShapeRenderer shows crosshair cursor
→ User shift+clicks canvas
→ ShapeRenderer.handleCreationClick()
→ jsonStore.addVertex(x, y) + creationModeHistory tracks
→ User finalizes (Escape/shift-click/sidebar navigation)
→ jsonStore.finalizeDrawing()
→ Converts absolute vertices to relative
→ Adds to shape.elements array
→ ShapeRenderer re-renders
```

**3. Undo in Creation Mode:**

```
User presses Ctrl+Z
→ ShapeRenderer.handleKeyDown()
→ Checks jsonStore.isCreationToolActive
→ If vertex: jsonStore.undoCreationStep() removes last vertex
→ If finalized shape: removes element + restores vertices
→ Auto-switches sidebar to shape's interaction
→ ShapeRenderer re-renders with restored drawing state
```

**4. Info Layer Editing:**

```
User clicks info layer in SideBar
→ jsonStore.setSelectedInfolayer(name)
→ transformStore.setGrayscale()
→ CanvasComponent applies filter to image
→ ShapeRenderer renders info layer canvas
→ User double-clicks text element
→ ShapeRenderer emits @openTextEditor
→ ViewContainer.openTextEditor()
→ InfoTextEditor modal opens
→ User edits and saves
→ ViewContainer.handleTextSave()
→ jsonStore updates element + historyStore tracks
→ ShapeRenderer re-renders info layer
```

**5. Action Editing:**

```
User double-clicks shape
→ ShapeRenderer.handleCanvasClick() detects double-click
→ actionStore.toggleActionContainerVisibility(id)
→ ActionContainer becomes visible
→ User clicks action key
→ handleEditorOpen() triggers
→ EditorComponent renders with JSON
→ User edits and saves
→ @save emits to handleEditorSave()
→ jsonStore.updateInteractionData()
→ Data persists in current state
```

## Development Workflow

### Running the Application

1. **Start Vite dev server:** `npm run dev` (localhost:5173)
2. **Launch Electron:** `npm run electron` (loads from dev server)

### Build Process

- **Vue SPA build:** `npm run build`
- **Note:** Electron packaging not yet configured

### File Loading

- JSON files loaded via Electron IPC (`window.api.loadJson()`)
- Images referenced relative to `public/data/images/`
- Bitmap fonts in `src/styles/bitmapfonts/`

## Key Features

### Polygon Creation Tool

- Shift-click to start drawing
- Click to add vertices
- Visual preview with rubber band line
- Multiple finalization triggers
- Undo/redo support with un-finalize capability
- Automatic coordinate conversion (absolute → relative)
- History tracking per interaction

### Multi-Select System

- Drag box selection for shapes and info elements
- Ctrl-click for multi-select
- Delete selected elements
- Move selected elements with arrow keys
- Visual feedback (selection box, highlights)

### Pan/Zoom System

- Space + drag to pan
- Ctrl + scroll to zoom
- Boundary clamping
- Progressive zoom freedom
- Center-on-cursor zooming

### Undo System

- Dual-mode undo (creation vs normal)
- Vertex-level undo in creation mode
- Un-finalize shapes to continue editing
- Deletion history with restoration
- Info layer change tracking



