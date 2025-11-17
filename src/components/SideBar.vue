<script setup>
import { useJsonStore } from '@/stores/store'

const jsonStore = useJsonStore()
</script>

<template>
  <aside>
    <section class="states">
      <p>States</p>
      <ul>
        <li
          v-for="(state, index) in jsonStore.states"
          :key="state.name"
          :class="{ active: index === jsonStore.currentStateIndex }"
          @click="jsonStore.setCurrentState(index)"
        >
          {{ state.name }}
        </li>
      </ul>
    </section>
    <section class="interactions">
      <p>Interactions</p>
      <ul>
        <li
          v-for="(interaction, index) in jsonStore.currentInteractionShapes"
          :key="interaction.name"
          :class="{ active: index === jsonStore.currentInteractionIndex }"
          @click="jsonStore.setCurrentInteraction(index)"
        >
          {{ interaction.name }}
        </li>
      </ul>
    </section>
  </aside>
</template>

<style scoped>
aside {
  width: 300px;
  height: 100%;
  background-color: #e0e0e0;
  padding: 10px;
}

p {
  background-color: #ccc;
  text-align: center;
  border-radius: 4px;
}
li {
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 2px;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #d0d0d0;
  }

  /* Active state styling */
  &.active {
    background-color: #007acc;
    color: white;
    font-weight: bold;
  }

  &.active:hover {
    background-color: #005999;
  }
}
</style>
