<script setup>
import useToolBar from '@/composables/toolBarComposable'

const { openFile } = useToolBar()
</script>

<template>
  <nav>
    <button @click="openFile">Open file</button>
  </nav>
</template>

<style scoped>
nav {
  background-color: #f0f0f0;
  padding: 10px;
}
</style>
