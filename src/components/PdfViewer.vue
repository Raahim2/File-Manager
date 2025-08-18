<template>
  <!-- This is now just a wrapper. Vue controls the v-if/v-else. -->
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
    
    <!-- 2. Your manual DOM code will ONLY touch this container -->
    <div v-else ref="pdfRenderContainer" class="min-h-[300px] h-full overflow-auto">
      <!-- PDF pages will be rendered here by renderPdf() -->
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineExpose, onMounted , nextTick } from 'vue';
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

// FIX: New ref for the container we will manually manipulats
const pdfRenderContainer = ref(null); 
const fileInput = ref(null);
const baseCanvases = ref([]);
const overlayCanvases = ref([]);
let pdfDoc = null;

const PDF_SCALE = 1.5;

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

const renderPdf = async (arrayBuffer) => {
  // FIX: Target the new pdfRenderContainer ref
  if (!pdfRenderContainer.value || !arrayBuffer) return; 
  const container = pdfRenderContainer.value;
  const scrollTop = container.scrollTop;

  // This is now safe because we are not destroying any of Vue's VDOM nodes
  container.innerHTML = ""; 
  baseCanvases.value = [];
  overlayCanvases.value = [];
  pdfDoc = null;

  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'center';

  // ... The rest of the renderPdf function is correct. We just change where it appends children.
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
  try {
    const loadedPdfDoc = await loadingTask.promise;
    pdfDoc = loadedPdfDoc;

    container.appendChild(createAddPageButton(0)); // <-- Use the local 'container' variable

    for (let pageNum = 1; pageNum <= loadedPdfDoc.numPages; pageNum++) {
      const page = await loadedPdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: PDF_SCALE });
      
      const pageWrapper = document.createElement('div');
      pageWrapper.className = "page-wrapper mb-4 shadow-lg rounded-md";
      pageWrapper.style.position = 'relative';

      const addButtonWrapper = createAddPageButton(pageNum);
      addButtonWrapper.style.maxWidth = `${viewport.width / PDF_SCALE}px`;

      const canvas = document.createElement('canvas');
      canvas.className = "bg-white rounded-md";
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.style.width = `${viewport.width / PDF_SCALE}px`;
      canvas.style.height = `${viewport.height / PDF_SCALE}px`;

      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.className = "absolute top-0 left-0";
      overlayCanvas.dataset.pageNumber = pageNum;
      overlayCanvas.height = viewport.height;
      overlayCanvas.width = viewport.width;
      overlayCanvas.style.width = `${viewport.width / PDF_SCALE}px`;
      overlayCanvas.style.height = `${viewport.height / PDF_SCALE}px`;
      
      pageWrapper.appendChild(canvas);
      pageWrapper.appendChild(overlayCanvas);
      container.appendChild(pageWrapper); // <-- Use the local 'container' variable

      baseCanvases.value.push(canvas);
      overlayCanvases.value.push(overlayCanvas);
      
      await page.render({ canvasContext: context, viewport }).promise;

      container.appendChild(addButtonWrapper); // <-- Use the local 'container' variable
    }
    
    const firstAddButton = container.querySelector('.group');
    if (firstAddButton) {
        const firstPageWrapper = container.querySelector('.page-wrapper');
        if (firstPageWrapper) {
            firstAddButton.style.maxWidth = firstPageWrapper.style.width;
        }
    }
    container.scrollTop = scrollTop;
  } catch (err) {
    console.error('Error rendering PDF:', err);
    alert('Failed to render the PDF. The file might be corrupted.');
  }
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

// watch(() => props.pdfArrayBuffer, (newBuffer) => { 
//   if (newBuffer) {
//     // Wait for the DOM to update (for v-else to create the pdfRenderContainer)
//     // before trying to render into it.
//     watch(pdfRenderContainer, (newEl) => {
//       if (newEl) renderPdf(newBuffer);
//     }, { once: true });
//   }
// }, { immediate: true });

watch(() => props.pdfArrayBuffer, async (newBuffer) => {
  if (newBuffer) {
    await nextTick(); 
    renderPdf(newBuffer);
  }
}, { immediate: true });

watch(() => props.activePanel, (newVal) => {
  overlayCanvases.value.forEach(c => {
    const isInteractive = ['draw', 'edit', 'place-signature'].includes(newVal);
    c.style.pointerEvents = isInteractive ? 'auto' : 'none';
    
    let cursorStyle = 'default';
    if (newVal === 'draw') cursorStyle = 'crosshair';
    else if (newVal === 'edit') cursorStyle = 'text';
    else if (newVal === 'place-signature') cursorStyle = 'copy';
    c.style.cursor = cursorStyle;

    if (isInteractive) {
        c.removeEventListener('mousedown', startDrawing);
        c.addEventListener('mousedown', startDrawing);
        c.removeEventListener('mousemove', draw);
        c.addEventListener('mousemove', draw);
        c.removeEventListener('mouseup', stopDrawing);
        c.addEventListener('mouseup', stopDrawing);
        c.removeEventListener('mouseleave', stopDrawing);
        c.addEventListener('mouseleave', stopDrawing);
        c.removeEventListener('touchstart', startDrawing);
        c.addEventListener('touchstart', startDrawing, { passive: false });
        c.removeEventListener('touchmove', draw);
        c.addEventListener('touchmove', draw, { passive: false });
        c.removeEventListener('touchend', stopDrawing);
        c.addEventListener('touchend', stopDrawing);
    }
  });
});

// FIX: Attach the click listener to the render container, not the wrapper.
watch(pdfRenderContainer, (newEl, oldEl) => {
  if (oldEl) oldEl.removeEventListener('click', handleViewerClick);
  if (newEl) newEl.addEventListener('click', handleViewerClick);
}, { immediate: true });

defineExpose({
  convertToImage, convertToText, convertToJson, convertToHtml, convertToWord,
  mergePdfs, addBlankPage, deletePage, splitPdf, insertPdf, addWatermark,
  pdfDoc: () => pdfDoc,
});
</script>
