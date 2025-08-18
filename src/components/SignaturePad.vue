<!-- src/components/SignaturePad.vue -->
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="$emit('close')">
    <div class="bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4">
      <div class="p-4 border-b border-slate-200">
        <h3 class="text-lg font-semibold text-slate-800">Create Signature</h3>
      </div>
      <div class="p-2">
        <canvas 
          ref="canvasRef" 
          class="w-full h-48 bg-slate-50 rounded-md cursor-crosshair"
          @mousedown="start" @mousemove="draw" @mouseup="stop" @mouseleave="stop"
          @touchstart.prevent="start" @touchmove.prevent="draw" @touchend="stop"
        ></canvas>
      </div>
      <div class="flex justify-end items-center p-4 bg-slate-50 rounded-b-lg space-x-3">
        <button @click="clear" class="px-4 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-200 transition-colors">
          Clear
        </button>
        <button @click="save" class="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
          Save Signature
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const emit = defineEmits(['save-signature', 'close']);

const canvasRef = ref(null);
let ctx = null;
let isDrawing = false;

const resizeCanvas = () => {
  if (!canvasRef.value) return;
  const canvas = canvasRef.value;
  // Set canvas resolution to match its display size for high-DPI screens
  canvas.width = canvas.offsetWidth * window.devicePixelRatio;
  canvas.height = canvas.offsetHeight * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  ctx.strokeStyle = '#1F2937';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
};

onMounted(() => {
  ctx = canvasRef.value.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas);
});

const getCoords = (event) => {
  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / (rect.width * window.devicePixelRatio);
  const scaleY = canvas.height / (rect.height * window.devicePixelRatio);

  const clientX = event.clientX || event.touches[0].clientX;
  const clientY = event.clientY || event.touches[0].clientY;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
};

const start = (event) => {
  isDrawing = true;
  const { x, y } = getCoords(event);
  ctx.beginPath();
  ctx.moveTo(x, y);
};

const draw = (event) => {
  if (!isDrawing) return;
  const { x, y } = getCoords(event);
  ctx.lineTo(x, y);
  ctx.stroke();
};

const stop = () => {
  if (isDrawing) {
    ctx.closePath();
    isDrawing = false;
  }
};

const clear = () => {
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
};

const save = () => {
  // Convert canvas to a transparent PNG data URL
  const dataUrl = canvasRef.value.toDataURL('image/png');
  emit('save-signature', dataUrl);
};
</script>