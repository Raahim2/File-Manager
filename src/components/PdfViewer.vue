<template>
  <div ref="viewerContainer" class="min-h-[300px]">
    <!-- Show upload box if no PDF loaded -->
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
  </div>
</template>

<script setup>
import { ref, watch, onMounted, defineExpose } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { DocumentArrowUpIcon } from '@heroicons/vue/24/outline';
import JSZip from 'jszip';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const props = defineProps({
  pdfArrayBuffer: { type: [ArrayBuffer, Object], default: null },
  activePanel: { type: String, default: 'select' },
  drawingOptions: { type: Object, required: true },
  textOptions: { type: Object, required: true },
});
const emit = defineEmits(['file-chosen']);

const viewerContainer = ref(null);
const fileInput = ref(null);
const baseCanvases = ref([]);
const overlayCanvases = ref([]);
let pdfDoc = null; 

// Drawing state
let isDrawing = false;
let startX = 0, startY = 0;
let currentCanvasContext = null;
let canvasSnapshot = null;

const triggerFileInput = () => { fileInput.value?.click(); };

const handleFileSelected = (event) => {
  const f = event.target.files[0];
  if (!f || f.type !== 'application/pdf') { alert('Please select a valid PDF file.'); return; }
  const reader = new FileReader();
  reader.onload = (e) => { emit('file-chosen', { arrayBuffer: e.target.result, name: f.name }); };
  reader.readAsArrayBuffer(f);
};

const renderPdf = async (arrayBuffer) => {
  if (!viewerContainer.value || !arrayBuffer) return;
  viewerContainer.value.innerHTML = "";
  baseCanvases.value = [];
  overlayCanvases.value = [];
  pdfDoc = null;

  viewerContainer.value.style.display = 'flex';
  viewerContainer.value.style.flexDirection = 'column';
  viewerContainer.value.style.alignItems = 'center';

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  try {
    pdfDoc = await loadingTask.promise;

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const scale = window.devicePixelRatio > 1 ? 2.0 : 1.5;
      const viewport = page.getViewport({ scale });
      const pageWrapper = document.createElement('div');
      pageWrapper.className = "page-wrapper mb-4 shadow-lg rounded-md";
      pageWrapper.style.position = 'relative';

      const canvas = document.createElement('canvas');
      canvas.className = "bg-white rounded-md";
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.style.width = `${viewport.width / scale}px`;
      canvas.style.height = `${viewport.height / scale}px`;

      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.className = "absolute top-0 left-0";
      overlayCanvas.dataset.pageNumber = pageNum;
      overlayCanvas.height = viewport.height;
      overlayCanvas.width = viewport.width;
      overlayCanvas.style.width = `${viewport.width / scale}px`;
      overlayCanvas.style.height = `${viewport.height / scale}px`;
      const currentPointerEvents = (props.activePanel === 'draw' || props.activePanel === 'edit') ? 'auto' : 'none';
      overlayCanvas.style.pointerEvents = currentPointerEvents;
      overlayCanvas.style.cursor = (props.activePanel === 'draw') ? 'crosshair' : (props.activePanel === 'edit' ? 'text' : 'default');


      overlayCanvas.addEventListener('mousedown', startDrawing);
      overlayCanvas.addEventListener('mousemove', draw);
      overlayCanvas.addEventListener('mouseup', stopDrawing);
      overlayCanvas.addEventListener('mouseleave', stopDrawing);
      overlayCanvas.addEventListener('touchstart', startDrawing, { passive: false });
      overlayCanvas.addEventListener('touchmove', draw, { passive: false });
      overlayCanvas.addEventListener('touchend', stopDrawing);

      pageWrapper.appendChild(canvas);
      pageWrapper.appendChild(overlayCanvas);
      viewerContainer.value.appendChild(pageWrapper);

      baseCanvases.value.push(canvas);
      overlayCanvases.value.push(overlayCanvas);
      
      await page.render({ canvasContext: context, viewport }).promise;
    }
  } catch (err) {
    console.error('Error rendering PDF:', err);
    alert('Failed to render the PDF. The file might be corrupted.');
  }
};

// --- EVENT HANDLING ---
const handleViewerClick = (e) => {
  if (props.activePanel === 'edit' && e.target.tagName === 'CANVAS') {
    addTextBox(e);
  }
};

// --- ADD TEXT LOGIC ---
const addTextBox = (e) => {
  const pageWrapper = e.target.closest('.page-wrapper');
  if (!pageWrapper) return;
  
  const rect = pageWrapper.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const textarea = document.createElement('textarea');
  textarea.style.position = 'absolute';
  textarea.style.left = `${x}px`;
  textarea.style.top = `${y}px`;
  textarea.style.border = '1px dashed #3B82F6';
  textarea.style.outline = 'none';
  textarea.style.padding = '2px';
  textarea.style.backgroundColor = 'rgba(191, 219, 254, 0.7)';
  textarea.style.resize = 'none';
  textarea.style.overflow = 'hidden';
  textarea.style.fontFamily = props.textOptions.font || 'Helvetica';
  textarea.style.fontSize = `${props.textOptions.size || 16}px`;
  textarea.style.color = props.textOptions.color || '#000000';
  textarea.rows = 1;
  textarea.wrap = "off";

  pageWrapper.appendChild(textarea);
  textarea.focus();

  const autoResize = () => {
    textarea.style.height = 'auto';
    textarea.style.width = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    textarea.style.width = `${textarea.scrollWidth}px`;
  };
  textarea.addEventListener('input', autoResize);
  
  textarea.addEventListener('blur', () => {
    drawTextOnCanvas(e.target, textarea.value, x, y);
    pageWrapper.removeChild(textarea);
  });
};

const drawTextOnCanvas = (canvas, text, x, y) => {
    if (!text.trim()) return;

    const ctx = canvas.getContext('2d');
    const scale = canvas.width / canvas.getBoundingClientRect().width;
    
    ctx.font = `${props.textOptions.size * scale}px ${props.textOptions.font || 'Helvetica'}`;
    ctx.fillStyle = props.textOptions.color;
    const scaledY = y * scale + props.textOptions.size * scale;
    ctx.fillText(text, x * scale, scaledY);
};

// --- DRAWING LOGIC ---
const getCoords = (e) => {
  const event = e.touches ? e.touches[0] : e;
  const rect = event.target.getBoundingClientRect();
  const scaleX = event.target.width / rect.width;
  const scaleY = event.target.height / rect.height;
  return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
};

const startDrawing = (e) => {
  if (props.activePanel !== 'draw' || !e.target) return;
  e.preventDefault();
  isDrawing = true;
  currentCanvasContext = e.target.getContext('2d');
  const { x, y } = getCoords(e);
  startX = x;
  startY = y;
  
  currentCanvasContext.lineWidth = props.drawingOptions.size;
  currentCanvasContext.lineCap = 'round';
  currentCanvasContext.lineJoin = 'round';
  
  const tool = props.drawingOptions.tool;

  if (tool === 'pen' || tool === 'highlighter') {
    currentCanvasContext.globalCompositeOperation = 'source-over';
    currentCanvasContext.strokeStyle = props.drawingOptions.color;
    currentCanvasContext.globalAlpha = tool === 'highlighter' ? 0.4 : 1.0;
    currentCanvasContext.beginPath();
    currentCanvasContext.moveTo(startX, startY);
  } else if (tool === 'eraser') {
    currentCanvasContext.globalCompositeOperation = 'destination-out';
    currentCanvasContext.beginPath();
    currentCanvasContext.moveTo(startX, startY);
  } else if (tool === 'shape') {
    canvasSnapshot = currentCanvasContext.getImageData(0, 0, e.target.width, e.target.height);
  }
};

const draw = (e) => {
  if (!isDrawing || props.activePanel !== 'draw') return;
  e.preventDefault();
  const { x, y } = getCoords(e);
  const tool = props.drawingOptions.tool;

  if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
    currentCanvasContext.lineTo(x, y);
    currentCanvasContext.stroke();
  } else if (tool === 'shape') {
    currentCanvasContext.putImageData(canvasSnapshot, 0, 0);
    drawShape(currentCanvasContext, x, y);
  }
};

const stopDrawing = (e) => {
  if (!isDrawing) return;
  isDrawing = false;
  const tool = props.drawingOptions.tool;
  
  if (tool === 'shape' && e) {
    const { x, y } = getCoords(e);
    drawShape(currentCanvasContext, x, y);
    canvasSnapshot = null;
  } else {
    currentCanvasContext?.closePath();
  }
  currentCanvasContext = null;
};

const drawShape = (ctx, endX, endY) => {
    ctx.strokeStyle = props.drawingOptions.color;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    
    const width = endX - startX;
    const height = endY - startY;

    switch(props.drawingOptions.shapeType) {
        case 'rectangle': ctx.strokeRect(startX, startY, width, height); break;
        case 'ellipse': ctx.ellipse(startX + width / 2, startY + height / 2, Math.abs(width / 2), Math.abs(height / 2), 0, 0, 2 * Math.PI); break;
        case 'line': ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); break;
    }
    ctx.stroke();
};

// --- CONVERSION & ORGANIZATION LOGIC ---
const downloadFile = (blob, filename) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

const mergeCanvasLayers = (pageIndex) => {
  const baseCanvas = baseCanvases.value[pageIndex];
  const overlayCanvas = overlayCanvases.value[pageIndex];
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = baseCanvas.width;
  tempCanvas.height = baseCanvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(baseCanvas, 0, 0);
  tempCtx.drawImage(overlayCanvas, 0, 0);
  return tempCanvas;
};

const convertToImage = async ({ format, baseFilename }) => {
  if (!pdfDoc || baseCanvases.value.length === 0) return;
  const fileExtension = format === 'jpeg' ? 'jpg' : 'png';

  if (pdfDoc.numPages === 1) {
    const mergedCanvas = mergeCanvasLayers(0);
    const dataUrl = mergedCanvas.toDataURL(`image/${format}`, 0.9);
    const blob = await (await fetch(dataUrl)).blob();
    downloadFile(blob, `${baseFilename}.${fileExtension}`);
    return;
  }

  alert('Preparing your download... This may take a moment for multiple pages.');
  const zip = new JSZip();
  for (let i = 0; i < pdfDoc.numPages; i++) {
    const mergedCanvas = mergeCanvasLayers(i);
    const dataUrl = mergedCanvas.toDataURL(`image/${format}`, 0.9);
    const blob = await (await fetch(dataUrl)).blob();
    zip.file(`${baseFilename}_page_${i + 1}.${fileExtension}`, blob);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadFile(zipBlob, `${baseFilename}_${fileExtension}.zip`);
};

const convertToText = async ({ baseFilename }) => {
  if (!pdfDoc) return;
  let fullText = '';
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += `--- PAGE ${i} ---\n\n${pageText}\n\n`;
  }
  const textBlob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
  downloadFile(textBlob, `${baseFilename}.txt`);
};

const convertToJson = async ({ baseFilename }) => {
  if (!pdfDoc) return;
  const jsonData = {
    filename: baseFilename + '.pdf',
    numPages: pdfDoc.numPages,
    pages: []
  };
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    jsonData.pages.push({ page: i, content: pageText });
  }
  const jsonString = JSON.stringify(jsonData, null, 2);
  const jsonBlob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  downloadFile(jsonBlob, `${baseFilename}.json`);
};

const convertToHtml = async ({ baseFilename, fileExtension = 'html', mimeType = 'text/html' }) => {
  if (!pdfDoc) return;
  let htmlString = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${baseFilename}</title><style>body{font-family:sans-serif;padding:2em;}.page{border:1px solid #ccc;padding:1.5em;margin-bottom:2em;}h2{border-bottom:2px solid #eee;padding-bottom:.5em;}p{white-space:pre-wrap;}</style></head><body>`;
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    htmlString += `<div class="page"><h2>Page ${i}</h2><p>${pageText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p></div>`;
  }
  htmlString += `</body></html>`;
  const htmlBlob = new Blob([htmlString], { type: `${mimeType};charset=utf-8` });
  downloadFile(htmlBlob, `${baseFilename}.${fileExtension}`);
};

const rotatePdf = async () => {
  try {
    const pdf = await PDFDocument.load(props.pdfArrayBuffer);
    const pages = pdf.getPages();
    pages.forEach(page => {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + 90));
    });
    return await pdf.save();
  } catch (error) {
    console.error('Failed to rotate PDF:', error);
    alert('An error occurred while rotating the PDF.');
    return null;
  }
};

const mergePdfs = async (pdfBuffers) => {
  try {
    const mergedPdf = await PDFDocument.create();
    for (const pdfBuffer of pdfBuffers) {
      const pdfToMerge = await PDFDocument.load(pdfBuffer);
      const pages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }
    return await mergedPdf.save();
  } catch (error) {
    console.error('Failed to merge PDFs:', error);
    alert('An error occurred while merging the PDFs. Ensure all files are valid.');
    return null;
  }
};

defineExpose({
  convertToImage,
  convertToText,
  convertToJson,
  convertToHtml,
  rotatePdf,
  mergePdfs
});

// --- WATCHERS and LIFECYCLE ---
watch(() => props.pdfArrayBuffer, (v) => { if (v) renderPdf(v); }, { immediate: true });

watch(() => props.activePanel, (newVal) => {
  overlayCanvases.value.forEach(c => {
    const pointerEvents = (newVal === 'draw' || newVal === 'edit') ? 'auto' : 'none';
    c.style.pointerEvents = pointerEvents;
    c.style.cursor = (newVal === 'draw') ? 'crosshair' : (newVal === 'edit' ? 'text' : 'default');
  });
});

onMounted(() => {
  if (props.pdfArrayBuffer) {
    renderPdf(props.pdfArrayBuffer);
  }
  viewerContainer.value.addEventListener('click', handleViewerClick);
});

</script>