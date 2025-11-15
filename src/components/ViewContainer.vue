<script setup>
import { ref } from 'vue';

const viewContainer = ref(null);

const zoomLevel = ref(1.0)         // Start at 100%
const ZOOM_STEP = 0.1              // 10% increments
const MIN_ZOOM = 0.1               // 10% minimum
const MAX_ZOOM = 5.0               // 500% maximum
const DEFAULT_ZOOM = 1.0   


const panX = ref(0)  
const panY = ref(0)


const activateListener = () => {
  viewContainer.value?.addEventListener('keydown', handleKeyDown)
}

const deactivateListener = () => {
  viewContainer.value?.removeEventListener('keydown', handleKeyDown)
}
const handleKeyDown = (event) => {
  if (event.ctrlKey) {
    switch (event.key) {
      case '+':
      case '=': // Some keyboards use '=' for '+'
        zoomLevel.value = Math.min(zoomLevel.value + ZOOM_STEP, MAX_ZOOM);
        event.preventDefault();
        break;
      case '-':
        zoomLevel.value = Math.max(zoomLevel.value - ZOOM_STEP, MIN_ZOOM);
        event.preventDefault();
        break;
      case '0':
        zoomLevel.value = DEFAULT_ZOOM;
        event.preventDefault();
        break;
    }
  }
}
const onMouseEnter = () => {
  viewContainer.value?.focus();
}

const onMouseLeave = () => {
  viewContainer.value?.blur();
  }
</script>
<template>
    <div class="view-container" tabindex="0"  @focus="activateListener" @blur="deactivateListener" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave"  ref="viewContainer" :style="`transform: scale(${zoomLevel}) translate(${panX}px, ${panY}px)`">
        <slot />
    </div>
</template>
<style scoped>
.view-container {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>