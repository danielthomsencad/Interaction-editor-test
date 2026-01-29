# 🎯 Your Learning Path

## 📊 Phase 1: Data (COMPLETED) ✅

You successfully implemented:

- Store management for JSON data, states, and selections
- Canvas rendering with shapes, interactions, and infolayers
- Shape selection (single, double-click for elements, drag selection)
- Sidebar integration with dynamic lists
- Info layer with bitmap fonts and grayscale filters
- Performance optimizations for drag selection
- Action container with CodeMirror integration

---

## 🎨 Phase 2: Changing Data (CURRENT)

Now you'll learn how to **modify** the visual and data properties of your canvas elements. This phase focuses on user interactions that change the appearance and content of shapes, text, images, and code.

### **✅ Step 1: Color Picker for Shapes** (COMPLETED)

Implemented a color picker to change polygon fill and stroke colors:

- Added HTML5 `<input type="color">` to sidebar
- Created `updateShapeColor` store action to update both `interactionShapes` and `interactions.meta`
- Automatic canvas re-render through reactive watchers
- Two-way data binding between UI and canvas

#### Key Concepts Learned

- Reactive color updates with Pinia store mutations
- Canvas fill/stroke style management
- Event handling with `@change` on input elements
- Maintaining data consistency across multiple JSON structures

---

### **✅ Step 2: Drag-and-Drop Layer Ordering** (COMPLETED)

Implemented HTML5 Drag-and-Drop API to reorder interaction layers in the sidebar:

- Made all sidebar list items draggable with `draggable="true"`
- Implemented drag event handlers: `dragstart`, `dragover`, `dragleave`, `drop`
- Track dragged item by ID (not index) for flexibility
- Visual drop indicator line shows exactly where item will land
- Maintains separate sidebar display order and shapes array order
- Fixed index-shift bug when moving items forward in array
- Canvas automatically re-renders with new z-order

#### Key Concepts Learned

- **HTML5 Drag-and-Drop API**: `dragstart`, `dragover`, `drop` events
- **DataTransfer object**: Passing interaction ID between events
- **Array manipulation**: Using `splice()` with index adjustment for reordering
- **Z-order/layer stacking**: Array order determines canvas render order (last item = top layer)
- **Event.preventDefault()**: Required in `dragover` to enable drop zones
- **Visual feedback**: CSS borders for drop position indicators
- **Mouse position detection**: `getBoundingClientRect()` to determine drop position (before/after)
- **Reactive state management**: Separate `sidebarOrder` ref for display vs `currentInteractionShapes` for canvas
- **Edge case handling**: Works with interactions that don't have shapes

#### What Was Implemented

1. Local `sidebarOrder` ref to track sidebar display order independently
2. Watcher on `currentInteractionShapes` to initialize order from shapes array
3. Smart drag handlers that calculate adjusted insert index after removal
4. Drop position detection (top half = before, bottom half = after)
5. Blue line indicator showing precise drop location
6. Store action `reorderInteractionShapes` with index-shift correction
7. Dual reordering: sidebar list AND shapes array when both items have shapes
8. Container drop handler to catch drops in gaps between items
9. `dragend` event (instead of `dragleave`) to maintain stable drop indicators
10. Multi-level dragover handlers on `<aside>`, `<section>`, `<ul>`, and `<li>` elements
11. Flexbox `gap` instead of `margin-bottom` to prevent dead zones

#### Known Issues to Fix Later

**⚠️ Cursor Inconsistency During Drag**: When dragging over gaps between list items or certain edge positions, the browser sometimes shows the "no drop" cursor (🚫) even though dropping works correctly. The visual feedback is misleading but the functionality is intact. This appears to be a browser-level cursor rendering issue that persists despite:

- Setting `dropEffect = 'move'` in all dragover handlers
- CSS `cursor: move !important` rules
- Multiple layers of dragover event handlers (aside, section, ul, li)
- Using flexbox `gap` instead of margins to eliminate dead zones

Potential solutions to explore:

- Custom drag image with `dataTransfer.setDragImage()`
- CSS `cursor` on body during drag using a global class
- Platform-specific cursor handling differences (Electron vs browser)

---

### **➡️ Step 3: Delete Layer/Shape with Soft Delete & Undo** (Complete)

Implement a professional deletion system with undo capability before permanent save:

**Phase A: UI Implementation** (Current)

- Wire up delete icon click handler in sidebar
- Add visual feedback on delete action
- Plan trash/history icon placement in UI
- Design deleted items panel component structure

**Phase B: Soft Delete Logic** (Next)

- Implement "soft delete" pattern - mark for deletion without removing data
- Track deleted items in store with metadata (timestamp, original data)
- Filter deleted items from sidebar display
- Filter deleted shapes from canvas rendering
- Clear selection if deleted item was selected

**Phase C: Trash Panel & Restore** (After)

- Create DeletedItemsPanel component
- Display list of soft-deleted items with timestamps
- Implement restore/undo functionality
- Add "empty trash" option (future - happens on save in Phase 3)

#### Key Concepts to Learn

**Soft Delete Pattern:**

- Marking items as deleted vs hard deletion
- Maintaining deleted items in separate array with metadata
- Filtering deleted IDs from active display using computed properties
- Preserving original data for undo functionality

**Event Handling:**

- Event bubbling and `.stop` modifier (prevent selecting item when clicking delete)
- Click handlers on icons within list items
- Conditional rendering based on deletion state

**State Management:**

- Session-level state (deleted items) vs persistent state (JSON data)
- Computed property filtering patterns
- Store actions for delete, restore, and cleanup operations

**UI/UX Patterns:**

- Trash/recycle bin metaphor for deleted items
- Timestamp display and formatting (`Date` object, `toISOString()`)
- Badge/counter for deleted items count
- Confirmation patterns (optional: "Are you sure?")

#### Implementation Approach

1. **UI First** - Add click handlers and visual structure
2. **Store Logic** - Implement soft delete in Pinia store
3. **Filtering** - Update computed properties to hide deleted items
4. **Trash Panel** - Create component for viewing/restoring deleted items

---

### Step 4: Keyboard-Based Shape Movement (Complete)

Move selected shapes using keyboard shortcuts with incremental precision:

- **Arrow keys**: Move shape by 1px in the arrow direction
- **Ctrl + Arrow keys**: Move shape by 10px in the arrow direction
- **Shift + Arrow keys**: Move shape by 100px in the arrow direction
- Update vertex coordinates in the JSON data structure
- Automatic canvas re-render after movement

#### Key Concepts to Learn

- Keyboard event handling (`keydown`, `keyup`)
- Event modifier detection (`event.ctrlKey`, `event.shiftKey`)
- Arrow key codes (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`)
- Vector-based coordinate transformation (adding offsets to all vertices)
- Real-time data mutation with canvas synchronization
- Preventing default browser scroll behavior during arrow key presses

---

### Step 5: Text Editing in Infolayers (Complete)

Enable editing of text elements in infolayers:

- Show text input field with current content
- Update text in store and re-render with bitmap font
- Handle multi-line text and line breaks

#### Key Concepts to Learn

- Inline editing patterns (contenteditable, input overlays)
- Text cursor positioning on canvas
- String manipulation and validation
- Textarea auto-sizing to match canvas text bounds
- Focus management and keyboard event handling

---

### Step 6: Add/Remove Images (Complete)

Add new images to infolayers and manage image elements:

- File picker to select images from filesystem
- Upload and cache images in the application
- Position new images on canvas with drag-and-drop
- Delete selected images

#### Key Concepts to Learn

- File API for image uploads
- Image validation (format, size, dimensions)
- Drag-and-drop file handling
- Image caching strategies (URL.createObjectURL vs base64)
- Electron IPC for file system access (if needed)

---

### Step 6: Code Editor Integration for Actions (Complete)

Edit action code in the CodeMirror editor:

- Parse action arrays from JSON
- Allow editing individual action objects
- Validate JSON structure on change
- Save edited actions back to the interaction object

#### Key Concepts to Learn

- CodeMirror change event handling
- JSON validation and error display
- Bi-directional data sync (editor ↔ store)
- Debouncing editor changes to avoid excessive updates
- Syntax highlighting for action-specific fields

---

### **✅ Step 7: Shape Creation Tools** (COMPLETED)

Implemented a polygon creation tool for drawing new shapes on the canvas:

- **Creation Tool Button** in toolbar (disabled when no interaction selected)
- **Shift+click** to start first vertex (prevents accidental creation)
- **Regular clicks** to add subsequent vertices
- **Visual Preview** with cyan connecting lines, vertex dots, and rubber band to cursor
- **Multiple Finalization Triggers**:
  - Click another interaction in sidebar
  - Click infolayer to switch modes
  - Change state
  - Shift+click to start new shape
  - Disable creation tool button
  - Press Escape key (finalizes if >= 3 vertices)
- **Smart Coordinate Conversion**: Absolute coordinates while drawing → relative vertices on finalization
- **Cursor Management**: Crosshair cursor during creation mode
- **Undo System for Creation**:
  - **In Creation Mode**: Ctrl+Z undos last vertex OR last finalized shape
  - **Out of Creation Mode**: Ctrl+Z only undos deletions (vertex history cleared on exit)
  - Can undo finalized shapes immediately after creating them
- **Simplified Creation Workflow**:
  - No shape selection/deletion while in creation mode
  - Focus on vertex placement and shape finalization
  - Clean separation between creation and editing workflows
- **Tool Persistence**: Stays active after finalization until manually disabled

#### Key Concepts Learned

**State Machine Pattern:**

- Tool states: Inactive → Active/Not Drawing → Drawing → Finalized
- Clean state transitions with multiple exit paths
- Separate undo histories for different modes

**Undo History Architecture:**

- `creationModeHistory`: Tracks vertices + finalized shapes during creation (cleared on exit)
- `deletionHistory`: Persistent deletion tracking (survives mode changes)
- Context-aware undo: Different behavior based on `isCreationToolActive`
- History step types: `addVertex`, `finalizeShape`

**Canvas Drawing Workflow:**

- Capturing click coordinates in canvas space
- Converting absolute coordinates to relative vertex format
- Bounding box calculation (minX, minY as element position)
- Real-time preview rendering with dashed rubber band

**Event Handler Priority:**

- Ctrl+Z intercepts before other handlers
- Creation mode focused on vertex placement only
- Shift key determines finalization vs new shape
- No selection/deletion during creation

**Visual Feedback:**

- Preview lines connecting placed vertices
- Vertex markers (dots with outlines)
- Rubber band line following mouse cursor
- Crosshair cursor indicating active tool

**Data Structure Integration:**

- Adding elements to existing shape's elements array
- Maintaining consistency between shapes and interactions
- Automatic re-rendering on state changes
- History tracking for vertices and finalized shapes

#### What Was Implemented

1. Store actions: `toggleCreationTool()`, `finalizeDrawing(targetId)`, `addVertex(x, y)`, `undoCreationStep()`, `undoRegularDeletion()`
2. Store state: `creationModeHistory[]`, `deletionHistory[]`
3. Toolbar: Creation tool button with active/disabled states
4. ShapeRenderer:
   - Click handler for vertex placement
   - Preview rendering with rubber band effect
   - Ctrl+Z undo handler (mode-aware, undos vertices and shapes)
   - No shape selection in creation mode
5. Sidebar: Auto-finalize on interaction/state/infolayer changes
6. Keyboard:
   - Escape to finalize/cancel drawing
   - Ctrl+Z for undo (vertices and finalized shapes in creation mode)
7. Coordinate conversion: Absolute → relative with bounding box
8. Visual preview: Lines, dots, rubber band with dashed style
9. Mode-aware undo system: Creation mode vs regular mode

---

## 📝 Phase 3: Saving Data (UPCOMING)

Future focus: Persisting all changes back to the correct JSON structure and file system.
