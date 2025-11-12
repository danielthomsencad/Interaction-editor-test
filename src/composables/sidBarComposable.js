import useJsonStore from "@/stores/store"



const useSideBar = () => {
    const jsonStore = useJsonStore();

    const changeState = (state) => {
        const newState = jsonStore.states.find(s => s.name === state);
        jsonStore.currentImg = `data/${newState.img}`;
        console.log('Current Image changed to:', jsonStore.currentImg);
    }

    return {
        changeState
    }
}

export default useSideBar