<script setup>
import { ref, onMounted, watchEffect } from 'vue'
import { useJsonStore, useTransformStore } from '@/stores/store'

const props = defineProps({
  canvasId: {
    type: String,
    required: true,
  },
})
const jsonStore = useJsonStore()
const transformStore = useTransformStore()

const canvas = ref(null)
let ctx = null

onMounted(() => {
  canvas.value = document.getElementById(props.canvasId)
  if (canvas.value) {
    ctx = canvas.value.getContext('2d')
    console.log('Canvas context initialized:', !!ctx)
    // Try to render if we already have shapes
    if (jsonStore.currentInteractionShapes?.length > 0) {
      console.log('Rendering existing shapes after canvas mount')
      renderShapes()
    }
  }
})

const drawPolygon = (shape) => {
  if (!ctx || !shape.elements) return

  shape.elements.forEach((element) => {
    if (element.type === 'Polygon' && element.vertices) {
      ctx.beginPath()
      // Move to first vertex
      const firstVertex = element.vertices[0]
      ctx.moveTo(element.x + firstVertex.x, element.y + firstVertex.y)

      // Draw lines to all other vertices
      for (let i = 1; i < element.vertices.length; i++) {
        const vertex = element.vertices[i]
        ctx.lineTo(element.x + vertex.x, element.y + vertex.y)
      }

      ctx.closePath()

      // Style the polygon
      ctx.fillStyle = shape.color + '40' // Add transparency
      ctx.strokeStyle = shape.color
      ctx.lineWidth = 2

      ctx.fill()
      ctx.stroke()
    }
  })
}
const renderShapes = () => {
  if (!ctx || !jsonStore.currentInteractionShapes) {
    console.log('Cannot render shapes:', {
      hasCtx: !!ctx,
      hasShapes: !!jsonStore.currentInteractionShapes,
      shapesLength: jsonStore.currentInteractionShapes?.length,
    })
    return
  }

  console.log('Rendering shapes:', jsonStore.currentInteractionShapes.length)

  // Clear canvas
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)

  // Draw all shapes
  jsonStore.currentInteractionShapes.forEach((shape, index) => {
    console.log(`Drawing shape ${index}:`, shape.name, shape.color)
    drawPolygon(shape)
  })
}

// Watch for changes and re-render
watchEffect(() => {
  console.log('watchEffect triggered:', {
    hasShapes: !!jsonStore.currentInteractionShapes,
    shapesLength: jsonStore.currentInteractionShapes?.length,
    hasCanvas: !!canvas.value,
    hasCtx: !!ctx,
  })

  if (jsonStore.currentInteractionShapes && ctx) {
    renderShapes()
  }
})

// Set canvas size when image loads
watchEffect(() => {
  if (canvas.value && transformStore.contentWidth && transformStore.contentHeight) {
    canvas.value.width = transformStore.contentWidth
    canvas.value.height = transformStore.contentHeight
    console.log('Canvas size set:', transformStore.contentWidth, 'x', transformStore.contentHeight)

    // Re-render shapes after size change
    if (jsonStore.currentInteractionShapes?.length > 0 && ctx) {
      console.log('Re-rendering shapes after canvas resize')
      renderShapes()
    }
  }
})
</script>
<template>
  <canvas
    :id="canvasId"
    style="position: absolute; top: 0; left: 0; pointer-events: auto; z-index: 10"
  />
</template>
<style scoped></style>
