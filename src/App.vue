<template>
  <div class="h-screen flex flex-col font-sans bg-slate-50 text-slate-800 antialiased">
    <HeaderBar :pdfName="pdfName" />

    <div class="flex flex-1 overflow-hidden">
      <SidebarMain
        :activePanel="activePanel"
        @set-panel="setActivePanel"
        @file-chosen="onFileChosen"
      />

      <!-- Desktop Secondary Sidebar (Tool Options) -->
      <SidebarToolPanel
        v-if="activePanel && activePanel !== 'select'"
        :activePanel="activePanel"
        :drawingOptions="drawingOptions"
        :textOptions="textOptions"
        @update-drawing-options="updateDrawingOptions"
        @update-text-options="updateTextOptions"
        @convert-pdf="handleConversion"
        @organize-pdf="handleOrganization"
        class="hidden lg:block w-64"
      />

      <!-- PDF Viewer Area -->
      <main class="flex-1 bg-slate-200 overflow-auto p-4 lg:p-8">
        <PdfViewer 
          ref="pdfViewerRef"
          :pdfArrayBuffer="pdfArrayBuffer" 
          :activePanel="activePanel"
          :drawingOptions="drawingOptions"
          :textOptions="textOptions"
          @file-chosen="onFileChosen"
        />
      </main>
    </div>

    <!-- Mobile Bottom Navigation Bar -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 flex justify-around items-center py-1">
      <button @click="setActivePanel('select')" :class="getMobileToolButtonClass('select')" title="Select">
        <CursorArrowRaysIcon class="w-6 h-6" />
      </button>
      <button @click="setActivePanel('draw')" :class="getMobileToolButtonClass('draw')" title="Draw">
        <PaintBrushIcon class="w-6 h-6" />
      </button>
      <button @click="setActivePanel('edit')" :class="getMobileToolButtonClass('edit')" title="Edit PDF">
        <PencilSquareIcon class="w-6 h-6" />
      </button>
      <button @click="setActivePanel('convert')" :class="getMobileToolButtonClass('convert')" title="Convert PDF">
        <ArrowPathRoundedSquareIcon class="w-6 h-6" />
      </button>
      <button @click="setActivePanel('organize')" :class="getMobileToolButtonClass('organize')" title="Organize Pages">
        <RectangleStackIcon class="w-6 h-6" />
      </button>
      <button @click="setActivePanel('secure')" :class="getMobileToolButtonClass('secure')" title="Secure PDF">
        <LockClosedIcon class="w-6 h-6" />
      </button>
    </nav>

    <!-- Mobile Tool Options Panel (Bottom Sheet) -->
    <Transition
      enter-active-class="transition-opacity ease-out duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isMobileOptionsOpen" @click="closeMobileOptions" class="lg:hidden fixed inset-0 bg-black/40 z-40" aria-hidden="true"></div>
    </Transition>
    <Transition
      enter-active-class="transition-transform ease-out duration-300"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition-transform ease-in duration-200"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div v-if="isMobileOptionsOpen" class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto">
        <div class="flex justify-end p-2">
          <button @click="closeMobileOptions" class="p-2 rounded-full hover:bg-slate-100">
            <XMarkIcon class="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div class="flex-1 p-4 pt-0">
          <SidebarToolPanel 
            :activePanel="activePanel" 
            :drawingOptions="drawingOptions"
            :textOptions="textOptions"
            @update-drawing-options="updateDrawingOptions"
            @update-text-options="updateTextOptions"
            @convert-pdf="handleConversion"
            @organize-pdf="handleOrganization"
            isMobile 
          />
        </div>
      </div>
    </Transition>
    <!-- Hidden file input for merging -->
    <input type="file" ref="mergeFileInput" @change="handleMergeFilesSelected" multiple accept="application/pdf" class="hidden" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import HeaderBar from './components/HeaderBar.vue';
import SidebarMain from './components/SidebarMain.vue';
import SidebarToolPanel from './components/SidebarToolPanel.vue';
import PdfViewer from './components/PdfViewer.vue';
import {
  CursorArrowRaysIcon, PaintBrushIcon, PencilSquareIcon, ArrowPathRoundedSquareIcon,
  RectangleStackIcon, LockClosedIcon, XMarkIcon
} from '@heroicons/vue/24/outline';

// State
const pdfArrayBuffer = ref(null);
const pdfName = ref('No file selected');
const activePanel = ref('select');
const isMobileOptionsOpen = ref(false);

const drawingOptions = ref({ tool: 'pen', shapeType: 'rectangle', color: '#EF4444', size: 5 });
const textOptions = ref({ size: 16, color: '#1F2937', font: 'Helvetica' });

const pdfViewerRef = ref(null);
const mergeFileInput = ref(null);

const onFileChosen = ({ arrayBuffer, name }) => {
  pdfArrayBuffer.value = arrayBuffer;
  pdfName.value = name;
};

const setActivePanel = (panelName) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  if (panelName === 'select') {
    activePanel.value = 'select';
    isMobileOptionsOpen.value = false;
    return;
  }
  if (isMobile && activePanel.value === panelName) {
    isMobileOptionsOpen.value = !isMobileOptionsOpen.value;
    return;
  }
  activePanel.value = panelName;
  if (isMobile) isMobileOptionsOpen.value = true;
};

const closeMobileOptions = () => {
  isMobileOptionsOpen.value = false;
};

const updateDrawingOptions = (newOptions) => {
  if (newOptions.shapeType && drawingOptions.value.tool !== 'shape') {
    newOptions.tool = 'shape';
  }
  drawingOptions.value = { ...drawingOptions.value, ...newOptions };
};

const updateTextOptions = (newOptions) => {
  textOptions.value = { ...textOptions.value, ...newOptions };
};

const handleConversion = (format) => {
  if (!pdfViewerRef.value || !pdfArrayBuffer.value) {
    alert('Please load a PDF file first.');
    return;
  }
  const baseFilename = pdfName.value.replace(/\.pdf$/i, '');
  switch (format) {
    case 'jpg':
      pdfViewerRef.value.convertToImage({ format: 'jpeg', baseFilename });
      break;
    case 'text':
      pdfViewerRef.value.convertToText({ baseFilename });
      break;
    case 'json':
      pdfViewerRef.value.convertToJson({ baseFilename });
      break;
    case 'html':
      pdfViewerRef.value.convertToHtml({ baseFilename });
      break;
    case 'word-basic':
      pdfViewerRef.value.convertToHtml({ baseFilename, fileExtension: 'doc', mimeType: 'application/msword' });
      break;
    case 'excel':
      alert(`Converting to Excel is a complex operation that typically requires a server-side process and is not available in this client-side demo.`);
      break;
  }
};

const handleOrganization = async (action) => {
  if (!pdfViewerRef.value || !pdfArrayBuffer.value) {
    alert('Please load a PDF file first.');
    return;
  }
  
  if (action === 'rotate') {
    const newBuffer = await pdfViewerRef.value.rotatePdf();
    if (newBuffer) {
      onFileChosen({ arrayBuffer: newBuffer, name: pdfName.value });
      alert('PDF rotated successfully!');
    }
  } else if (action === 'merge') {
    mergeFileInput.value.click();
  }
};

const handleMergeFilesSelected = async (event) => {
  const files = event.target.files;
  if (files.length === 0) return;

  alert(`Merging current PDF with ${files.length} other file(s)...`);
  const filesAsArrayBuffers = [pdfArrayBuffer.value];
  for (const file of files) {
    filesAsArrayBuffers.push(await file.arrayBuffer());
  }

  const mergedBuffer = await pdfViewerRef.value.mergePdfs(filesAsArrayBuffers);
  if (mergedBuffer) {
    onFileChosen({ arrayBuffer: mergedBuffer, name: 'merged.pdf' });
    alert('PDFs merged successfully!');
  }
  event.target.value = '';
};

const getMobileToolButtonClass = (panelName) => {
  const baseClass = 'flex-1 p-3 flex justify-center items-center transition-colors';
  if (activePanel.value === panelName && isMobileOptionsOpen.value) {
    return `${baseClass} text-blue-600`;
  }
  return `${baseClass} text-slate-500 hover:bg-slate-100 active:bg-slate-200`;
};
</script>