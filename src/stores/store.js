import { defineStore } from 'pinia'

const useJsonStore = defineStore('jsonStore', {
  state: () => ({
    jsonData: null,
    states: [],
    currentImg: null,
  }),
})

const useTransformStore = defineStore('transformStore', {
  state: () => ({
    panX: 0,
    panY: 0,
    zoomLevel: 1,
    contentWidth: 0,
    contentHeight: 0,
    initialCenterX: 0,
    initialCenterY: 0,
  }),
})

export { useJsonStore, useTransformStore }
