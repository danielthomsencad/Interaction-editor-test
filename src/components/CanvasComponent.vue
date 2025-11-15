<script setup>
// import { Canvas } from '@avolutions/canvas-painter';
import ViewContainer from "./ViewContainer.vue";
import useJsonStore from "@/stores/store";
import { onMounted, watchEffect } from 'vue';



const img = new Image();
const jsonStore = useJsonStore();
img.src = jsonStore.currentImg;
// let canvas = null;

onMounted(() => {
// canvas = Canvas.init('myCanvas');
});


const renderCanvas = () => {
};



watchEffect(() => {   if (jsonStore.currentImg) {
    img.src = jsonStore.currentImg
    renderCanvas()
  } })


</script>
<template>
<ViewContainer>
<div class="canvas-wrapper">
<canvas id="myCanvas" :width="width" :height="height"></canvas>
<img :src="jsonStore.currentImg" />
</div>
</ViewContainer>
</template>
<style scoped>

.canvas-wrapper{
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  display: inline-block;
}
img {
display: block;
}
canvas {
  position: absolute;    /* Overlay positioning */
  top: 0;
  left: 0;      /* Align to container */
  width: 100%;          /* Fill container width */
  height: 100%;  
}
</style>