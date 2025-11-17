# 🎯 Your Learning Path

## ✅ STEP 1: Store Enhancement (COMPLETED)

Add currentStateIndex, currentInteractionShapes, selectedShapeId and understand how state management works

## ✅ Step 2: State Switching Logic (COMPLETED)

Implement the action to switch between states and see how data flows

## ✅ Step 3: Shape Data Loading (COMPLETED)

Extract interactionShapes from JSON states and understand the data structure

## ✅ STEP 4: Basic Shape Rendering (COMPLETED)

Create a simple canvas overlay and draw your first polygon

## **➡️ STEP 5: Shape Selection** (CURRENT)

Add click detection and see how point-in-polygon algorithms work

## Step 6: Sidebar Integration

Connect the sidebar to show current shapes and handle selection

---

# Step 5: Shape Selection

## Goal

Add click detection to your canvas so users can select shapes by clicking on them.

## What to implement

### 1. Add Click Handler to ShapeRenderer

Add this to your ShapeRenderer.vue:

```javascript
const handleCanvasClick = (event) => {
  if (!ctx || !jsonStore.currentInteractionShapes) return

  const rect = canvas.value.getBoundingClientRect()
  const scaleX = canvas.value.width / rect.width
  const scaleY = canvas.value.height / rect.height

  const x = (event.clientX - rect.left) * scaleX
  const y = (event.clientY - rect.top) * scaleY

  // Check shapes from top to bottom (reverse order)
  for (let i = jsonStore.currentInteractionShapes.length - 1; i >= 0; i--) {
    const shape = jsonStore.currentInteractionShapes[i]

    if (isPointInShape(x, y, shape)) {
      jsonStore.setCurrentInteraction(i)
      return
    }
  }

  // No shape clicked, clear selection
  jsonStore.selectedShapeId = null
}
```

### 2. Point-in-Polygon Detection

Add these helper functions:

```javascript
const isPointInShape = (x, y, shape) => {
  if (!shape.elements) return false

  return shape.elements.some((element) => {
    if (element.type === 'Polygon' && element.vertices) {
      return isPointInPolygon(x, y, element)
    }
    return false
  })
}

const isPointInPolygon = (x, y, element) => {
  const vertices = element.vertices.map((v) => ({
    x: element.x + v.x,
    y: element.y + v.y,
  }))

  let inside = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    if (
      vertices[i].y > y !== vertices[j].y > y &&
      x <
        ((vertices[j].x - vertices[i].x) * (y - vertices[i].y)) / (vertices[j].y - vertices[i].y) +
          vertices[i].x
    ) {
      inside = !inside
    }
  }
  return inside
}
```

### 3. Visual Selection Feedback

Update your `drawPolygon` function:

```javascript
const drawPolygon = (shape, isSelected = false) => {
  if (!ctx || !shape.elements) return

  shape.elements.forEach((element) => {
    if (element.type === 'Polygon' && element.vertices) {
      ctx.beginPath()
      // ... drawing code ...

      // Style based on selection state
      if (isSelected) {
        ctx.fillStyle = shape.color + '80' // More opacity when selected
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3
      } else {
        ctx.fillStyle = shape.color + '40' // Less opacity when not selected
        ctx.strokeStyle = shape.color
        ctx.lineWidth = 2
      }

      ctx.fill()
      ctx.stroke()
    }
  })
}
```

### 4. Update Template

Add click handler to canvas:

```vue
<template>
  <canvas
    :id="canvasId"
    @click="handleCanvasClick"
    style="position: absolute; top: 0; left: 0; pointer-events: auto; z-index: 10; cursor: pointer;"
  />
</template>
```

## Key Concepts to Understand

### 🎯 **Click Detection**

- **Coordinate conversion**: Converting mouse clicks to canvas coordinates
- **Layer priority**: Top shapes (last in array) get click priority
- **Boundary calculations**: Account for canvas scaling and positioning

### 📐 **Point-in-Polygon Algorithm**

- **Ray casting**: Mathematical test to see if point is inside polygon
- **Edge crossing**: Count how many polygon edges a horizontal ray crosses
- **Odd = inside**: If ray crosses odd number of edges, point is inside

### 🎨 **Visual Feedback**

- **Selection highlighting**: Different colors/opacity for selected shapes
- **Cursor changes**: Pointer cursor to indicate clickable areas
- **State synchronization**: Selection updates both canvas and sidebar

Try implementing this and you should be able to click on shapes to select them!
