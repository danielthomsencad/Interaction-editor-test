<script setup>
import Toolbar from './components/ToolBar.vue'
import SideBar from './components/SideBar.vue'
import CanvasComponent from './components/CanvasComponent.vue'
</script>

<template>
  <main>
    <Toolbar class="toolbar" />
    <CanvasComponent class="content" />

    <SideBar class="sidebar" />
  </main>
</template>

<style scoped>
main {
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

.sidebar {
  grid-area: sidebar;
  background-color: grey;
  border: 2px dotted black;
}
</style>
