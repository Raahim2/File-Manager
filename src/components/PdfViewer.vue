

<template>
  <!-- The v-if/v-else structure is correct and stable -->
  <div class="h-full">
    <!-- 1. Vue controls this upload box -->
    <div v-if="!pdfArrayBuffer" class="flex justify-center items-center h-full">
      <label 
        class="flex flex-col items-center justify-center w-full max-w-lg p-8 md:p-12 bg-white border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
        @click="triggerFileInput"
      >
        <DocumentArrowUpIcon class="w-12 h-12 md:w-16 md:h-16 text-slate-400 mb-4" />
        <h3 class="text-lg md:text-xl font-semibold text-slate-700">Drop your PDF here</h3>
        <p class="text-sm text-slate-500 mt-1 text-center">or open a PDF from the left</p>
      </label>
      <input ref="fileInput" type="file" accept="application/pdf" class="hidden" @change="handleFileSelected" />
    </div>
    
    <!-- 2. The render container. We will NOT use touch-none, allowing for native scrolling. -->
    <div v-else ref="pdfRenderContainer" class="min-h-[300px] h-full overflow-auto">
      <!-- PDF pages will be rendered here -->
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineExpose, onMounted, onUnmounted, nextTick } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url';
import { DocumentArrowUpIcon } from '@heroicons/vue/24/outline';
import { useDrawing } from '@/composable/useDrawing';
import { useConvert } from '@/composable/useConvert';
import { useOrganise } from '@/composable/useOrganise';
import { useEdit } from '@/composable/useEdit'; 
import { useAdvance } from '@/composable/useAdvance';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const props = defineProps({
  pdfArrayBuffer: { type: [ArrayBuffer, Object], default: null },
  activePanel: { type: String, default: 'select' },
  drawingOptions: { type: Object, required: true },
  textOptions: { type: Object, required: true },
  signatureToPlace: { type: String, default: null },
});

const emit = defineEmits(['file-chosen', 'organize-requested', 'set-active-panel']);

const pdfRenderContainer = ref(null); 
const fileInput = ref(null);
const baseCanvases = ref([]);
const overlayCanvases = ref([]);
let pdfDoc = null;

// --- STATE for ZOOM ---
const zoomLevel = ref(1.5);
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 5.0;
let initialPinchDistance = null;
let startZoomLevel = 1.5;

// Composables are correctly initialized here
const { startDrawing, draw, stopDrawing } = useDrawing(props);
const { convertToImage, convertToText, convertToJson, convertToHtml, convertToWord } = useConvert({ pdfDoc: () => pdfDoc, baseCanvases, overlayCanvases });
const { mergePdfs, addBlankPage, deletePage, splitPdf, insertPdf } = useOrganise();
const { addWatermark } = useAdvance();
const { drawTextOnCanvas } = useEdit();

const triggerFileInput = () => { fileInput.value?.click(); };
const handleFileSelected = (event) => {
  const f = event.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = (e) => { emit('file-chosen', { arrayBuffer: e.target.result, name: f.name }); };
  reader.readAsArrayBuffer(f);
};

const createAddPageButton = (pageIndex) => {
  // This function is correct, no changes needed
  const wrapper = document.createElement('div');
  wrapper.className = 'relative flex justify-center items-center h-12 group my-2';
  const line = document.createElement('div');
  line.className = 'w-full border-t-2 border-dashed border-slate-300 group-hover:border-blue-400 transition-colors';
  wrapper.appendChild(line);
  const button = document.createElement('button');
  button.className = 'absolute z-10 w-8 h-8 flex items-center justify-center bg-white border-2 border-slate-300 rounded-full text-slate-400 transition-all group-hover:scale-110 group-hover:border-blue-500 group-hover:text-blue-500 shadow';
  button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`;
  wrapper.appendChild(button);
  const menu = document.createElement('div');
  const positionClasses = pageIndex === 0 ? 'top-full mt-2' : 'bottom-full mb-2';
  const baseClasses = 'absolute z-20 bg-white rounded-md shadow-lg border border-slate-200 w-48 overflow-hidden transition-all transform scale-95 opacity-0 pointer-events-none group-focus-within:scale-100 group-focus-within:opacity-100 group-focus-within:pointer-events-auto';
  menu.className = `${baseClasses} ${positionClasses}`;
  const addBlankBtn = document.createElement('button');
  addBlankBtn.className = 'w-full flex items-center space-x-3 px-3 py-2 text-sm text-left text-slate-700 hover:bg-slate-100';
  addBlankBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg> <span>Add Blank Page</span>`;
  addBlankBtn.onclick = () => { emit('organize-requested', { action: 'add-page', index: pageIndex }); };
  menu.appendChild(addBlankBtn);
  const mergeBtn = document.createElement('button');
  mergeBtn.className = 'w-full flex items-center space-x-3 px-3 py-2 text-sm text-left text-slate-700 hover:bg-slate-100';
  mergeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3" /></svg> <span>Merge/Insert PDF</span>`;
  mergeBtn.onclick = () => { emit('organize-requested', { action: 'merge', index: pageIndex }); };
  menu.appendChild(mergeBtn);
  button.addEventListener('click', () => { button.focus(); });
  wrapper.appendChild(menu);
  return wrapper;
};
const handleViewerClick = (e) => {
  if (props.activePanel === 'edit' && e.target.tagName === 'CANVAS') {
    addTextBox(e);
  }
  else if (props.activePanel === 'place-signature' && props.signatureToPlace) {
    placeSignature(e);
  }
};

const addTextBox = (e) => {
  const pageWrapper = e.target.closest('.page-wrapper');
  if (!pageWrapper) return;
  
  const rect = pageWrapper.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const editableDiv = document.createElement('div');
  editableDiv.contentEditable = true;
  editableDiv.setAttribute('role', 'textbox');
  editableDiv.style.position = 'absolute';
  editableDiv.style.left = `${x}px`;
  editableDiv.style.top = `${y}px`;
  editableDiv.style.border = '1px dashed #3B82F6';
  editableDiv.style.outline = 'none';
  editableDiv.style.padding = '2px';
  editableDiv.style.minWidth = '20px';
  editableDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
  editableDiv.style.lineHeight = '1.2';
  editableDiv.style.fontFamily = props.textOptions.font;
  editableDiv.style.fontSize = `${props.textOptions.size}px`;
  editableDiv.style.color = props.textOptions.color;
  editableDiv.style.fontWeight = props.textOptions.isBold ? 'bold' : 'normal';
  editableDiv.style.fontStyle = props.textOptions.isItalic ? 'italic' : 'normal';

  pageWrapper.appendChild(editableDiv);
  editableDiv.focus();

  editableDiv.addEventListener('blur', () => {
    const canvas = e.target;
    const ctx = canvas.getContext('2d');
    const scale = canvas.width / canvas.getBoundingClientRect().width;
    
    drawTextOnCanvas(ctx, editableDiv.innerText, x, y, scale, props.textOptions);
    pageWrapper.removeChild(editableDiv);
  }, { once: true });
};

const placeSignature = (e) => {
  const canvas = e.target;
  const ctx = canvas.getContext('2d');
  const scale = canvas.width / canvas.getBoundingClientRect().width;
  const rect = canvas.getBoundingClientRect();

  const x = (e.clientX - rect.left) * scale;
  const y = (e.clientY - rect.top) * scale;

  const signatureImage = new Image();
  signatureImage.onload = () => {
    const sigWidth = 150 * scale;
    const sigHeight = (signatureImage.height / signatureImage.width) * sigWidth;
    ctx.drawImage(signatureImage, x - sigWidth / 2, y - sigHeight / 2, sigWidth, sigHeight);
    emit('set-active-panel', 'draw');
  };
  signatureImage.src = props.signatureToPlace;
};

const renderPdf = async (arrayBuffer) => {
  if (!pdfRenderContainer.value || !arrayBuffer) return; 
  const container = pdfRenderContainer.value;
  const scrollTop = container.scrollTop;
  const scrollLeft = container.scrollLeft;
  container.innerHTML = ""; 
  baseCanvases.value = [];
  overlayCanvases.value = [];
  pdfDoc = null;
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'center';

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
  try {
    const loadedPdfDoc = await loadingTask.promise;
    pdfDoc = loadedPdfDoc;

    if (props.activePanel === 'organize') container.appendChild(createAddPageButton(0));

    for (let pageNum = 1; pageNum <= loadedPdfDoc.numPages; pageNum++) {
      const page = await loadedPdfDoc.getPage(pageNum);
      // MODIFIED: Use the reactive zoomLevel ref for scaling
      const viewport = page.getViewport({ scale: zoomLevel.value });
      
      const pageWrapper = document.createElement('div');
      pageWrapper.className = "page-wrapper mb-4 shadow-lg rounded-md";
      pageWrapper.style.position = 'relative';
      const addButtonWrapper = createAddPageButton(pageNum);
      addButtonWrapper.style.maxWidth = `${viewport.width / zoomLevel.value}px`;
      const canvas = document.createElement('canvas');
      canvas.className = "bg-white rounded-md";
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.style.width = `${viewport.width / zoomLevel.value}px`;
      canvas.style.height = `${viewport.height / zoomLevel.value}px`;
      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.className = "absolute top-0 left-0";
      overlayCanvas.dataset.pageNumber = pageNum;
      overlayCanvas.height = viewport.height;
      overlayCanvas.width = viewport.width;
      overlayCanvas.style.width = `${viewport.width / zoomLevel.value}px`;
      overlayCanvas.style.height = `${viewport.height / zoomLevel.value}px`;
      
      overlayCanvas.addEventListener('mousedown', startDrawing);
      overlayCanvas.addEventListener('mousemove', draw);
      overlayCanvas.addEventListener('mouseup', stopDrawing);
      overlayCanvas.addEventListener('mouseleave', stopDrawing);
      overlayCanvas.addEventListener('touchstart', startDrawing, { passive: false });
      overlayCanvas.addEventListener('touchmove', draw, { passive: false });
      overlayCanvas.addEventListener('touchend', stopDrawing);

      pageWrapper.appendChild(canvas);
      pageWrapper.appendChild(overlayCanvas);
      container.appendChild(pageWrapper);
      baseCanvases.value.push(canvas);
      overlayCanvases.value.push(overlayCanvas);
      await page.render({ canvasContext: context, viewport }).promise;

      if (props.activePanel === 'organize') container.appendChild(addButtonWrapper);
    }
    
    if (props.activePanel === 'organize') {
        const firstAddButton = container.querySelector('.group');
        if (firstAddButton) {
            const firstPageWrapper = container.querySelector('.page-wrapper');
            if (firstPageWrapper) firstAddButton.style.maxWidth = firstPageWrapper.style.width;
        }
    }
    container.scrollTop = scrollTop;
    container.scrollLeft = scrollLeft;
  } catch (err) { console.error('Error rendering PDF:', err); }
};

// --- NEW/MODIFIED: ZOOM EVENT HANDLERS ---
const handleWheel = (e) => {
  // Only zoom if the Ctrl key (or Cmd on Mac) is pressed.
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault(); // Prevent the browser from zooming the whole page
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    zoomLevel.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel.value * zoomFactor));
  }
  // If Ctrl is NOT pressed, we do NOTHING, allowing the browser's default scroll behavior.
};

const getPinchDistance = (touches) => {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
};

const handleTouchStart = (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();
    initialPinchDistance = getPinchDistance(e.touches);
    startZoomLevel = zoomLevel.value;
  }
};

const handleTouchMove = (e) => {
  if (e.touches.length === 2 && initialPinchDistance !== null) {
    e.preventDefault();
    const currentDistance = getPinchDistance(e.touches);
    const zoomFactor = currentDistance / initialPinchDistance;
    zoomLevel.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, startZoomLevel * zoomFactor));
  }
};

const handleTouchEnd = () => {
  initialPinchDistance = null;
};

// --- WATCHERS ---
watch(() => props.pdfArrayBuffer, async (newBuffer) => {
  if (newBuffer) {
    zoomLevel.value = 1.5; // Reset zoom for new file
    await nextTick(); 
    renderPdf(newBuffer);
  }
}, { immediate: true });

// NEW: This watcher re-renders the PDF when zoom level changes.
watch(zoomLevel, () => {
  if (props.pdfArrayBuffer) {
    renderPdf(props.pdfArrayBuffer);
  }
});

watch(() => props.activePanel, (newVal, oldVal) => {
  // Correctly show/hide '+' buttons
  if ((newVal === 'organize' || oldVal === 'organize') && props.pdfArrayBuffer) {
    renderPdf(props.pdfArrayBuffer);
  }
  
  // Correctly update cursors and pointer events
  overlayCanvases.value.forEach(c => {
    const isInteractive = ['draw', 'edit', 'place-signature'].includes(newVal);
    c.style.pointerEvents = isInteractive ? 'auto' : 'none';
    let cursorStyle = 'default';
    if (newVal === 'draw') cursorStyle = 'crosshair';
    else if (newVal === 'edit') cursorStyle = 'text';
    else if (newVal === 'place-signature') cursorStyle = 'copy';
    c.style.cursor = cursorStyle;
  });
});

// MODIFIED: Manage all listeners for the render container here.
watch(pdfRenderContainer, (newEl, oldEl) => {
  if (oldEl) {
    oldEl.removeEventListener('click', handleViewerClick);
    oldEl.removeEventListener('wheel', handleWheel);
    oldEl.removeEventListener('touchstart', handleTouchStart);
    oldEl.removeEventListener('touchmove', handleTouchMove);
    oldEl.removeEventListener('touchend', handleTouchEnd);
  }
  if (newEl) {
    newEl.addEventListener('click', handleViewerClick);
    // Add all our listeners for zoom and interaction
    newEl.addEventListener('wheel', handleWheel, { passive: false });
    newEl.addEventListener('touchstart', handleTouchStart, { passive: false });
    newEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    newEl.addEventListener('touchend', handleTouchEnd);
  }
}, { immediate: true });

defineExpose({
  convertToImage, convertToText, convertToJson, convertToHtml, convertToWord,
  mergePdfs, addBlankPage, deletePage, splitPdf, insertPdf, addWatermark,
  pdfDoc: () => pdfDoc,
});
</script>


