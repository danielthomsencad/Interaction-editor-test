<script setup>
// import { Canvas } from '@avolutions/canvas-painter';
import ViewContainer from './ViewContainer.vue'
import { useJsonStore, useTransformStore } from '@/stores/store'
import { watchEffect, ref, watch } from 'vue'
import ShapeRenderer from './ShapeRenderer.vue'


const img = new Image()
const jsonStore = useJsonStore()
const transformStore = useTransformStore()
const viewContainerRef = ref(null)
img.src = jsonStore.currentImg

watchEffect(() => {
  if (jsonStore.currentImg) {
    img.src = jsonStore.currentImg

    img.onload = () => {
      // Get container dimensions to center the image properly
      const container = document.querySelector('.view-container')
      if (container) {
        const containerWidth = container.offsetWidth
        const containerHeight = container.offsetHeight
        const imageWidth = img.naturalWidth
        const imageHeight = img.naturalHeight

        // Center the image in the viewport
        const centerX = (containerWidth - imageWidth) / 2
        const centerY = (containerHeight - imageHeight) / 2

        // Store content dimensions and initial center position
        transformStore.contentWidth = imageWidth
        transformStore.contentHeight = imageHeight
        transformStore.initialCenterX = centerX
        transformStore.initialCenterY = centerY

        transformStore.panX = centerX
        transformStore.panY = centerY
        transformStore.zoomLevel = 1.0
      }
    }
  }
})

watch(() => jsonStore.selectedInfolayerId, (infolayer) => {
  console.log('Detected change in selectedInfolayer:', infolayer);
  if (infolayer) {
    console.log('Applying grayscale for infolayer:', infolayer);
    transformStore.setGrayscale();
  } else {
    console.log('Clearing grayscale');
    transformStore.clearGrayscale();
  }
});
</script>
<template>
  <ViewContainer :ref="viewContainerRef">
    <div
      class="canvas-wrapper"
      :style="`transform: translate(${transformStore.panX}px, ${transformStore.panY}px) scale(${transformStore.zoomLevel})`"
    >
      <img :src="jsonStore.currentImg" :style="transformStore.grayscale ? 'filter: grayscale(100%) brightness(50%)' : ''" style="user-select: none;" />
      <ShapeRenderer :canvasId="'myCanvas'" />
    </div>
  </ViewContainer>
</template>
<style scoped>
.canvas-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  display: inline-block;
  transform-origin: 0 0; /* Set origin to top-left for accurate coordinate math */
}
img {
  display: block;
}
canvas {
  position: absolute; /* Overlay positioning */
  top: 0;
  left: 0; /* Align to container */
  width: 100%; /* Fill container width */
  height: 100%;
}
</style>
