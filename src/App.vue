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
      <!-- FIX: Removed the incorrect @organize-pdf listener -->
      <SidebarToolPanel
        v-if="activePanel"
        :activePanel="activePanel"
        :drawingOptions="drawingOptions"
        :textOptions="textOptions"
        @update-drawing-options="updateDrawingOptions"
        @update-text-options="updateTextOptions"
        @convert-pdf="handleConversion"
        @advance-pdf="handleAdvanceOptions"
        class="hidden lg:block w-64"
      />

      <!-- PDF Viewer Area -->
      <!-- FIX: Added all necessary props and event listeners HERE -->
      <main class="flex-1 bg-slate-200 overflow-auto p-4 lg:p-8">
        <PdfViewer 
          ref="pdfViewerRef"
          :pdfArrayBuffer="pdfArrayBuffer" 
          :activePanel="activePanel"
          :drawingOptions="drawingOptions"
          :textOptions="textOptions"
          :signatureToPlace="savedSignature"       
          @file-chosen="onFileChosen"
          @organize-requested="handleOrganization" 
          @set-active-panel="setActivePanel"       
        />
      </main>
    </div>

    <!-- Mobile Bottom Navigation Bar -->
    <!-- FIX: Removed the 'organize' button as it's now handled by '+' icons -->
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
      <button @click="setActivePanel('advance')" :class="getMobileToolButtonClass('advance')" title="Advance Options">
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
          <!-- FIX: Added the missing @advance-pdf listener and cleaned up others -->
          <SidebarToolPanel 
            :activePanel="activePanel" 
            :drawingOptions="drawingOptions"
            :textOptions="textOptions"
            @update-drawing-options="updateDrawingOptions"
            @update-text-options="updateTextOptions"
            @convert-pdf="handleConversion"
            @advance-pdf="handleAdvanceOptions" 
            isMobile 
          />
        </div>
      </div>
    </Transition>
    
    <!-- Hidden file inputs -->
     <input type="file" ref="watermarkFileInput" @change="handleWatermarkFileSelected" accept="image/png, image/jpeg" class="hidden" />
    <input type="file" ref="mergeFileInput" @change="handleMergeFilesSelected" multiple accept="application/pdf" class="hidden" />
    
    <!-- Signature Pad Modal -->
    <SignaturePad 
      v-if="isSignaturePadOpen" 
      @close="isSignaturePadOpen = false"
      @save-signature="handleSignatureSaved"
    />
  </div>
</template>

<script setup>
import { ref  ,  defineAsyncComponent} from 'vue';
import HeaderBar from './components/HeaderBar.vue';
import SidebarMain from './components/SidebarMain.vue';
// import SidebarToolPanel from './components/SidebarToolPanel.vue';
import SignaturePad from './components/SignaturePad.vue';
import PdfViewer from './components/PdfViewer.vue';
import {
  PaintBrushIcon, PencilSquareIcon, ArrowPathRoundedSquareIcon, LockClosedIcon, XMarkIcon
} from '@heroicons/vue/24/outline';

const SidebarToolPanel = defineAsyncComponent(() => 
  import('./components/SidebarToolPanel.vue')
);



// State
const pdfArrayBuffer = ref(null);
const pdfName = ref('No file selected');
const activePanel = ref(null);
const isMobileOptionsOpen = ref(false);
const isSignaturePadOpen = ref(false);
const savedSignature = ref(null);

const drawingOptions = ref(
  { tool: 'pen', shapeType: 'rectangle', color: '#EF4444', size: 5, isFilled: false }
);

const textOptions = ref({ 
  size: 16, 
  color: '#1F2937', 
  font: 'Helvetica', 
  isBold: false, 
  isItalic: false 
});

const pdfViewerRef = ref(null);
const mergeFileInput = ref(null);
const watermarkFileInput = ref(null);
let mergeTargetIndex = 0; 

const onFileChosen = ({ arrayBuffer, name }) => {
  pdfArrayBuffer.value = arrayBuffer;
  pdfName.value = name;
};

const setActivePanel = (panelName) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
 
  if (isMobile && activePanel.value === panelName && panelName !== 'place-signature') {
    isMobileOptionsOpen.value = !isMobileOptionsOpen.value;
    return;
  }
  
  activePanel.value = panelName;
  
  if (isMobile && !isMobileOptionsOpen.value && panelName !== 'place-signature') {
    isMobileOptionsOpen.value = true;
  }
};

const closeMobileOptions = () => {
  isMobileOptionsOpen.value = false;
};

const updateDrawingOptions = (newOptions) => {
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
  }
};

const handleOrganization = async ({ action, index }) => {
  if (!pdfViewerRef.value || !pdfArrayBuffer.value) {
    alert('Please load a PDF file first.');
    return;
  }
  
  try {
    switch (action) {
      case 'merge':
        mergeTargetIndex = index;
        mergeFileInput.value.click();
        break;
      case 'add-page': {
        const newBuffer = await pdfViewerRef.value.addBlankPage(pdfArrayBuffer.value, index);
        if (newBuffer) {
          onFileChosen({ arrayBuffer: newBuffer, name: pdfName.value });
        }
        break;
      }
    }
  } catch (error) {
    console.error(`Error during '${action}' operation:`, error);
    alert('An unexpected error occurred.');
  }
};

const handleMergeFilesSelected = async (event) => {
  const files = event.target.files;
  if (files.length === 0) return;

  const filesToMergeBuffers = [];
  for (const file of files) {
    filesToMergeBuffers.push(await file.arrayBuffer());
  }
  const mergedInsert = await pdfViewerRef.value.mergePdfs(filesToMergeBuffers);
  if (!mergedInsert) return;

  const finalMerged = await pdfViewerRef.value.insertPdf(pdfArrayBuffer.value, mergedInsert, mergeTargetIndex);
  if (finalMerged) {
    onFileChosen({ arrayBuffer: finalMerged, name: 'merged_document.pdf' });
  }
  event.target.value = '';
};

const handleSignatureSaved = (dataUrl) => {
  savedSignature.value = dataUrl;
  isSignaturePadOpen.value = false;
  activePanel.value = 'place-signature'; 
};

const handleAdvanceOptions = (action) => {
  if (!pdfViewerRef.value || !pdfArrayBuffer.value) {
    alert('Please load a PDF file first.');
    return;
  }
  if (action === 'watermark') {
    watermarkFileInput.value.click();
  } else if (action === 'signature') {
    // This ensures the mobile panel closes before the signature pad opens
    isMobileOptionsOpen.value = false;
    isSignaturePadOpen.value = true;
  } else {
    alert(`Feature "${action}" is coming soon!`);
  }
};

const handleWatermarkFileSelected = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const imageBuffer = await file.arrayBuffer();
    const imageType = file.type;
    const watermarkedBuffer = await pdfViewerRef.value.addWatermark(pdfArrayBuffer.value, imageBuffer, imageType);
    if (watermarkedBuffer) {
      onFileChosen({ arrayBuffer: watermarkedBuffer, name: 'watermarked.pdf' });
    }
  } catch (error) {
    console.error("Failed to process watermark file:", error);
    alert("Could not process the selected image file.");
  } finally {
    event.target.value = '';
  }
};

const getMobileToolButtonClass = (panelName) => {
  const baseClass = 'flex-1 p-3 flex justify-center items-center transition-colors';
  if (activePanel.value === panelName && isMobileOptionsOpen.value) {
    return `${baseClass} text-blue-600`;
  }
  return `${baseClass} text-slate-500 hover:bg-slate-100 active:bg-slate-200`;
};
</script>