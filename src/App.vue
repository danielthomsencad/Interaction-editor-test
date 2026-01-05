<script setup>
import Toolbar from './components/ToolBar.vue'
import SideBar from './components/SideBar.vue'
import CanvasComponent from './components/CanvasComponent.vue'
import ActionContainer from './components/ActionContainer.vue'




</script>
<template>
  <main>
    <Toolbar class="toolbar" />
    <CanvasComponent class="content" />
    <SideBar class="sidebar" />
    <ActionContainer class="action-container" />
  </main>
</template>

<style scoped>
main {
  position: relative;
  display: grid;
  height: 100vh; /* full viewport height */
  grid-template-areas:
    'toolbar toolbar'
    'content sidebar';
  grid-template-columns: 1fr 300px; /* adjustable sidebar width */
  grid-template-rows: auto 1fr; /* toolbar auto-height, content fills remaining */
}
.toolbar {
  grid-area: toolbar;
  background-color: grey;
  border: 2px dotted black;
}

.content {
  grid-area: content;
  background-color: grey;
  border: 2px dotted black;
}

.action-container {
position: absolute;
top: 0;
left: 0;
width: 100%;
height: 100%;
}

.sidebar {
  grid-area: sidebar;
  background-color: grey;
  border: 2px dotted black;
  overflow-y: auto;      /* Enable vertical scrolling */
  max-height: 100vh;     /* Prevent sidebar from growing beyond viewport */
}
</style>
