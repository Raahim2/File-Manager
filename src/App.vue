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
        v-if="activePanel"
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
           @organize-requested="handleOrganization" 
        />
      </main>
    </div>

    <!-- Mobile Bottom Navigation Bar -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 flex justify-around items-center py-1">
      
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
import { ref  , nextTick} from 'vue';
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
const activePanel = ref('draw');
const isMobileOptionsOpen = ref(false);

const drawingOptions = ref({ tool: 'pen', shapeType: 'rectangle', color: '#EF4444', size: 5 });
const textOptions = ref({ 
  size: 16, 
  color: '#1F2937', 
  font: 'Helvetica', 
  isBold: false, 
  isItalic: false 
});

const pdfViewerRef = ref(null);
const mergeFileInput = ref(null);
let mergeTargetIndex = 0; 

const onFileChosen = ({ arrayBuffer, name }) => {
  pdfArrayBuffer.value = arrayBuffer;
  pdfName.value = name;
};

const setActivePanel = (panelName) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
 
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
      break;
  }
};

const downloadBuffer = (buffer, fileName) => {
  const blob = new Blob([buffer], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

const handleOrganization = async ({ action, index }) => {
  if (!pdfViewerRef.value || !pdfArrayBuffer.value) {
    alert('Please load a PDF file first.');
    return;
  }
  
  try {
    switch (action) {
      case 'merge':
        // Store the index where the user wants to insert the file
        mergeTargetIndex = index;
        mergeFileInput.value.click();
        break;

      case 'add-page': {
        // We no longer need to prompt the user! We already know the index.
        const newBuffer = await pdfViewerRef.value.addBlankPage(pdfArrayBuffer.value, index);
        if (newBuffer) {
          onFileChosen({ arrayBuffer: newBuffer, name: pdfName.value });
          alert('Blank page added successfully!');
        }
        break;
      }
      
      // These cases are kept in case you add other buttons later
      case 'delete-page': {
        const pdfDoc = pdfViewerRef.value.pdfDoc();
        if (!pdfDoc) return;
        const pageCount = pdfDoc.numPages;
        if (pageCount <= 1) return alert("Cannot delete the only page.");
        
        const pageNumStr = prompt(`Enter page number to delete (1-${pageCount}).`);
        if (!pageNumStr) return; // User cancelled
        const pageNum = parseInt(pageNumStr, 10);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > pageCount) return alert('Invalid page number.');

        const newBuffer = await pdfViewerRef.value.deletePage(pdfArrayBuffer.value, pageNum - 1);
        if (newBuffer) {
          onFileChosen({ arrayBuffer: newBuffer, name: pdfName.value });
          alert(`Page ${pageNum} deleted successfully!`);
        }
        break;
      }

      case 'split': {
        const pdfDoc = pdfViewerRef.value.pdfDoc();
        if (!pdfDoc) return;
        const pageCount = pdfDoc.numPages;
        if (pageCount < 2) return alert("Cannot split a document with less than 2 pages.");

        const pageNumStr = prompt(`Enter page number to split AFTER (1-${pageCount - 1}).`);
        if (!pageNumStr) return;
        const pageNum = parseInt(pageNumStr, 10);
        if (isNaN(pageNum) || pageNum < 1 || pageNum >= pageCount) return alert('Invalid page number.');
        
        const splitBuffers = await pdfViewerRef.value.splitPdf(pdfArrayBuffer.value, pageNum - 1);
        if (splitBuffers) {
          const baseFilename = pdfName.value.replace(/\.pdf$/i, '');
          downloadBuffer(splitBuffers[0], `${baseFilename}_part1.pdf`);
          downloadBuffer(splitBuffers[1], `${baseFilename}_part2.pdf`);
          alert('PDF split successfully! Check your downloads.');
        }
        break;
      }
    }
  } catch (error) {
    console.error(`Error during '${action}' operation:`, error);
    alert('An unexpected error occurred. Please check the console for details.');
  }
};

const handleMergeFilesSelected = async (event) => {
  const files = event.target.files;
  if (files.length === 0) return;

  const filesToMergeBuffers = [];
  for (const file of files) {
    filesToMergeBuffers.push(await file.arrayBuffer());
  }

  // First, merge the selected files into a single temporary PDF
  const mergedInsert = await pdfViewerRef.value.mergePdfs(filesToMergeBuffers);
  if (!mergedInsert) return;

  // Now, insert the temporary PDF into our main document at the correct index
  const finalMerged = await pdfViewerRef.value.insertPdf(pdfArrayBuffer.value, mergedInsert, mergeTargetIndex);

  if (finalMerged) {
    onFileChosen({ arrayBuffer: finalMerged, name: 'merged_document.pdf' });
    alert('PDFs merged successfully!');
  }
  event.target.value = ''; // Reset the file input
};


const getMobileToolButtonClass = (panelName) => {
  const baseClass = 'flex-1 p-3 flex justify-center items-center transition-colors';
  if (activePanel.value === panelName && isMobileOptionsOpen.value) {
    return `${baseClass} text-blue-600`;
  }
  return `${baseClass} text-slate-500 hover:bg-slate-100 active:bg-slate-200`;
};


</script>