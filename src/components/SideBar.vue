<script setup>
import useJsonStore from '@/stores/store';
import useSideBar from '@/composables/sidBarComposable';

const jsonStore = useJsonStore();
const { changeState } = useSideBar()

</script>

<template>
    <aside>
        <ul v-for="state in jsonStore.states" :key="state.name">
            <li @click="changeState(state.name)">{{ state.name }}</li>
        </ul>
    </aside>
</template>

<style scoped> 
aside{
    width: 300px;
    height: 100%;
    background-color: #e0e0e0;
    padding: 10px;
}
</style>