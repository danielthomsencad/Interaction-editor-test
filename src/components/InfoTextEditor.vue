<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  textElement: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'save'])

const editedText = ref('')

// Watch for when the editor opens and populate the textarea
watch(
  () => props.textElement,
  (element) => {
    if (element && props.isOpen) {
      editedText.value = element.text || ''
    }
  },
  { immediate: true },
)

// Watch for when modal closes to reset the text
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen && props.textElement) {
      // Re-populate when opening
      editedText.value = props.textElement.text || ''
    } else if (!isOpen) {
      // Clear when closing
      editedText.value = ''
    }
  },
)
const onCancel = () => {
  emit('close')
}

const onSave = () => {
  emit('save', editedText.value)
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="onCancel">
    <div class="modal-content">
      <h3>Edit Text</h3>
      <textarea v-model="editedText" />
      <div class="button-group">
        <button @click="onCancel">Cancel</button>
        <button @click="onSave">Save</button>
      </div>
    </div>
  </div>
</template>
<style scoped>
.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  min-width: 400px;
}

textarea {
  width: 100%;
  min-height: 100px;
  margin: 10px 0;
  padding: 8px;
  font-family: monospace;
  resize: none;
}

.button-group {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

button {
  padding: 8px 16px;
  cursor: pointer;
}
</style>
