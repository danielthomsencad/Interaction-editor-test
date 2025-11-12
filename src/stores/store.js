import { defineStore } from 'pinia'

const useJsonStore = defineStore('jsonStore', {
    state: () => ({
        jsonData: null,
        states: [],
        currentImg: null,
    }),
})

export default useJsonStore