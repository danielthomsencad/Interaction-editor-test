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

---

### **➡️ Step 3: Keyboard-Based Shape Movement & Layer Management** (Current)

Move selected shapes using keyboard shortcuts with incremental precision:

- **Arrow keys**: Move shape by 1px in the arrow direction
- **Ctrl + Arrow keys**: Move shape by 10px in the arrow direction
- **Shift + Arrow keys**: Move shape by 100px in the arrow direction
- Update vertex coordinates in the JSON data structure
- Automatic canvas re-render after movement

Manage layers/shapes from the sidebar:

- **Delete layer/shape**: Remove selected interaction from sidebar list
- **Add layer/shape**: Add new empty interaction to sidebar (sidebar-only for now)
- **Rename layer**: Double-click layer name to enable inline editing

#### Key Concepts to Learn

- Keyboard event handling (`keydown`, `keyup`)
- Event modifier detection (`event.ctrlKey`, `event.shiftKey`)
- Arrow key codes (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`)
- Vector-based coordinate transformation (adding offsets to all vertices)
- Real-time data mutation with canvas synchronization
- Preventing default browser scroll behavior during arrow key presses
- Array mutations: `splice()` for deletion, `push()` for addition
- Double-click event handling (`@dblclick`) for inline editing
- Conditional rendering: showing input field vs display text
- Managing focus state for edit mode
- Validating and updating layer names in the store

---

### Step 4: Text Editing in Infolayers

Enable editing of text elements in infolayers:

- Click text to enter edit mode
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

### Step 5: Add/Remove Images

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

### Step 6: Code Editor Integration for Actions

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

### Step 7: Shape Creation Tools

Add new shapes to the canvas:

- Click to add polygon vertices
- Close polygon on double-click or Enter key
- Preview shape while drawing
- Add new shape to interactionShapes array

#### Key Concepts to Learn

- Interactive drawing state machines (idle → drawing → complete)
- Path preview rendering (dashed lines, temporary shapes)
- Coordinate capture and storage
- Shape validation (minimum vertices, self-intersection check)
- Store mutation for adding new objects to arrays

---

## 📝 Phase 3: Saving Data (UPCOMING)

Future focus: Persisting all changes back to the correct JSON structure and file system.
