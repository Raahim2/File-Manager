<template>
  <aside class="hidden lg:flex w-20 bg-white flex-col items-center border-r border-slate-200 z-10 shrink-0 py-4">
    <div class="flex flex-col space-y-2">

      <!-- File Upload Button -->
      <label
        for="fileInput"
        class="flex flex-col items-center p-2 w-16 rounded-lg transition-colors text-slate-600 hover:bg-slate-100 cursor-pointer"
      >
        <ArrowUpTrayIcon class="w-6 h-6" />
        <span class="text-xs mt-1">Open</span>
      </label>
      <input
        id="fileInput"
        type="file"
        accept="application/pdf"
        class="hidden"
        @change="onFileChosen"
      />

 
      <button @click="setPanel('draw')" :class="getToolButtonClass('draw')" title="Draw">
        <PaintBrushIcon class="w-6 h-6" />
        <span class="text-xs mt-1">Draw</span>
      </button>

      <button @click="setPanel('edit')" :class="getToolButtonClass('edit')" title="Edit PDF">
        <PencilSquareIcon class="w-6 h-6" />
        <span class="text-xs mt-1">Edit</span>
      </button>

      <button @click="setPanel('convert')" :class="getToolButtonClass('convert')" title="Convert PDF">
        <ArrowPathRoundedSquareIcon class="w-6 h-6" />
        <span class="text-xs mt-1">Convert</span>
      </button>


      <button @click="setPanel('advance')" :class="getToolButtonClass('advance')" title="Advance Options">
        <LockClosedIcon class="w-6 h-6" />
        <span class="text-xs mt-1">Advance</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import {
  ArrowUpTrayIcon,
  CursorArrowRaysIcon,
  PaintBrushIcon,
  PencilSquareIcon,
  ArrowPathRoundedSquareIcon,
  RectangleStackIcon,
  LockClosedIcon
} from '@heroicons/vue/24/outline';

const props = defineProps({
  activePanel: { type: String, default: 'select' }
});
const emit = defineEmits(['set-panel', 'file-chosen']);


const setPanel = (name) => {
  emit('set-panel', name);
};

const onFileChosen = (event) => {
  const f = event.target.files[0];
  if (!f || f.type !== 'application/pdf') {
    alert('Please select a valid PDF file.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    emit('file-chosen', { arrayBuffer: e.target.result, name: f.name });
  };
  reader.readAsArrayBuffer(f);
};

const getToolButtonClass = (panelName) => {
  const baseClass = 'flex flex-col items-center p-2 w-16 rounded-lg transition-colors';
  if (props.activePanel === panelName) {
    return `${baseClass} bg-blue-100 text-blue-700`;
  }
  return `${baseClass} text-slate-600 hover:bg-slate-100`;
};
</script>
