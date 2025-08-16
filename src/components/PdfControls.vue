<!-- src/components/PdfControls.vue -->
<template>
  <div class="sticky top-2 z-20 flex justify-center mb-4">
    <div class="flex items-center space-x-2 bg-slate-800/80 backdrop-blur-sm text-white rounded-full shadow-lg px-3 py-1.5">
      <button @click="$emit('zoom-out')" class="p-1.5 rounded-full hover:bg-white/20 transition-colors" title="Zoom Out">
        <MagnifyingGlassMinusIcon class="w-5 h-5" />
      </button>
      <span class="text-sm font-mono w-12 text-center">{{ zoomPercentage }}%</span>
      <button @click="$emit('zoom-in')" class="p-1.5 rounded-full hover:bg-white/20 transition-colors" title="Zoom In">
        <MagnifyingGlassPlusIcon class="w-5 h-5" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  zoomLevel: {
    type: Number,
    required: true,
  }
});

defineEmits(['zoom-in', 'zoom-out']);

const zoomPercentage = computed(() => Math.round(props.zoomLevel / 1.5 * 100));
</script>