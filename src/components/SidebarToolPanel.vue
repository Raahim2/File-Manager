<template>
  <aside :class="['bg-white flex-col border-r border-slate-200 shrink-0', className]" v-if="activePanel">
    <div class="flex-1 p-4">
      
<div v-if="activePanel === 'draw'" class="space-y-6">
        <h3 class="text-sm font-semibold text-slate-800">Drawing Tools</h3>
        
        <!-- Tool Type (Pen, Highlighter, Eraser) -->
        <div>
          <label class="text-xs font-medium text-slate-500">Freehand Tools</label>
          <div class="grid grid-cols-3 gap-2 mt-2">
            <button @click="emit('update-drawing-options', { tool: 'pen' })" :class="getToolButtonClass('pen')" title="Pen"><PaintBrushIcon class="w-5 h-5"/></button>
            <button @click="emit('update-drawing-options', { tool: 'highlighter' })" :class="getToolButtonClass('highlighter')" title="Highlighter"><PencilIcon class="w-5 h-5"/></button>
            <button @click="emit('update-drawing-options', { tool: 'eraser' })" :class="getToolButtonClass('eraser')" title="Eraser"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 7.76l-4.5-4.5a2 2 0 0 0-2.83 0L6 10.17l-4 4L2 22l7.83-7.83 6.91-6.91a2 2 0 0 0 0-2.83zM15 8l-4 4"/><path d="m21.5 6.5-5 5"/></svg></button>
          </div>
        </div>

        <!-- Shapes (Always Visible) -->
        <div>
          <label class="text-xs font-medium text-slate-500">Shapes</label>
          <div class="grid grid-cols-3 gap-2 mt-2">
              <button @click="emit('update-drawing-options', { tool: 'shape', shapeType: 'rectangle' })" :class="getShapeButtonClass('rectangle')" title="Rectangle"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg></button>
              <button @click="emit('update-drawing-options', { tool: 'shape', shapeType: 'ellipse' })" :class="getShapeButtonClass('ellipse')" title="Ellipse"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg></button>
              <button @click="emit('update-drawing-options', { tool: 'shape', shapeType: 'line' })" :class="getShapeButtonClass('line')" title="Line"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"></line></svg></button>
          </div>
          <!-- Fill / Stroke Options for Shapes -->
          <div v-if="drawingOptions.tool === 'shape' && drawingOptions.shapeType !== 'line'" class="mt-3">
             <label class="text-xs font-medium text-slate-500">Style</label>
             <div class="grid grid-cols-2 gap-2 mt-1">
                <button @click="emit('update-drawing-options', { isFilled: true })" :class="getStyleButtonClass(true)">Fill</button>
                <button @click="emit('update-drawing-options', { isFilled: false })" :class="getStyleButtonClass(false)">Stroke</button>
             </div>
          </div>
        </div>

        <!-- Color Selection -->
        <div v-if="drawingOptions.tool !== 'eraser'">
          <label class="text-xs font-medium text-slate-500">Color</label>
          <div class="flex items-center space-x-2 mt-2">
            <button
              v-for="color in drawingColors" :key="color" :style="{ backgroundColor: color }"
              :class="['w-6 h-6 rounded-full border-2 transition', drawingOptions.color === color ? 'ring-2 ring-offset-1 ring-blue-500 border-white' : 'border-slate-200 hover:border-slate-400']"
              @click="emit('update-drawing-options', { color: color })"
            ></button>
            <!-- Custom Color Picker -->
            <div class="relative w-6 h-6">
              <input 
                type="color" 
                :value="drawingOptions.color"
                @input="emit('update-drawing-options', { color: $event.target.value })"
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div 
                class="w-full h-full rounded-full border-2 border-slate-200 bg-cover"
              ></div>
            </div>
          </div>
        </div>
        
        <div>
          <label for="brush-size" class="text-xs font-medium text-slate-500 flex justify-between items-center">
            <span>{{ getSizeLabel() }}</span>
            <span class="text-slate-800 font-mono text-right w-6">{{ drawingOptions.size }}</span>
          </label>
          <input 
            type="range" id="brush-size" min="1" :max="drawingOptions.tool === 'highlighter' ? 50 : 30" :value="drawingOptions.size"
            @input="emit('update-drawing-options', { size: Number($event.target.value) })"
            class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-2"
          />
        </div>
      </div>
      
       <div v-else-if="activePanel === 'edit'" class="space-y-6">
        <h3 class="text-sm font-semibold text-slate-800">Edit Content</h3>
        <p class="text-xs text-slate-500">Click on the page to add a text box.</p>
        <div>
          <label for="font-family" class="text-xs font-medium text-slate-500">Font Family</label>
          <select 
            id="font-family" :value="textOptions.font"
            @change="emit('update-text-options', { font: $event.target.value })"
            class="mt-1 w-full p-2 rounded-md border border-slate-300 text-sm focus:ring-blue-500 focus:border-blue-500">
            <option>Helvetica</option><option>Times</option><option>Courier</option><option>Verdana</option><option>Georgia</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-xs font-medium text-slate-500">Font Size</label>
            <input type="number" :value="textOptions.size" @input="emit('update-text-options', { size: Number($event.target.value) })" class="mt-1 w-full p-2 rounded-md border border-slate-300 text-sm"/>
          </div>
          <div>
            <label class="text-xs font-medium text-slate-500">Style</label>
            <div class="mt-1 flex space-x-1">
              <button @click="emit('update-text-options', { isBold: !textOptions.isBold })" :class="getStyleButtonClass(textOptions.isBold, 'B', 'font-semibold')">B</button>
              <button @click="emit('update-text-options', { isItalic: !textOptions.isItalic })" :class="getStyleButtonClass(textOptions.isItalic, 'I', 'italic')">I</button>
            </div>
          </div>
        </div>
        <div>
          <label class="text-xs font-medium text-slate-500">Color</label>
          <div class="flex items-center space-x-2 mt-2">
            <button
              v-for="color in textColors" :key="color" :style="{ backgroundColor: color }"
              :class="['w-6 h-6 rounded-full border-2 transition', textOptions.color === color ? 'ring-2 ring-offset-1 ring-blue-500 border-white' : 'border-slate-200 hover:border-slate-400']"
              @click="emit('update-text-options', { color: color })"
            ></button>
            <!-- Custom Color Picker -->
            <div class="relative w-6 h-6">
              <input 
                type="color" 
                :value="textOptions.color"
                @input="emit('update-text-options', { color: $event.target.value })"
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div 
                class="w-full h-full rounded-full border-2 border-slate-200 bg-cover"
              ></div>
            </div>
          </div>
        </div>
      </div>


      <div v-else-if="activePanel === 'convert'" class="space-y-4">
        <h3 class="text-sm font-semibold text-slate-800">Convert PDF</h3>
        <button @click="emit('convert-pdf', 'jpg')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-slate-600 hover:bg-slate-100"><PhotoIcon class="w-5 h-5"/><span>To JPG</span></button>
        <button @click="emit('convert-pdf', 'word-basic')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-slate-600 hover:bg-slate-100"><DocumentDuplicateIcon class="w-5 h-5"/><span>To Word</span></button>
         <button @click="emit('convert-pdf', 'text')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-slate-600 hover:bg-slate-100"><DocumentTextIcon class="w-5 h-5"/><span>To Plain Text</span></button>
         <button @click="emit('convert-pdf', 'html')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-slate-600 hover:bg-slate-100"><CodeBracketIcon class="w-5 h-5"/><span>To HTML</span></button>
        <button @click="emit('convert-pdf', 'json')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-slate-600 hover:bg-slate-100"><CodeBracketIcon class="w-5 h-5"/><span>To JSON</span></button>
      </div>

      <div v-else-if="activePanel === 'advance'" class="space-y-4">
        <h3 class="text-sm font-semibold text-slate-800">Advance Options</h3>
        <div class="grid grid-cols-2 gap-2 mt-2">
            <!-- 1. Watermark (Functional) -->
            <button @click="emit('advance-pdf', 'watermark')" :class="getAdvanceButtonClass()">
              <SwatchIcon class="w-6 h-6 mb-1"/>
              <span class="text-xs">Watermark</span>
            </button>

            <!-- 2. Password (Dummy) -->
            <button :class="getAdvanceButtonClass(true)">
              <LockClosedIcon class="w-6 h-6 mb-1"/>
              <span class="text-xs">Password</span>
            </button>

            <!-- 3. Redact (Dummy) -->
             <button :class="getAdvanceButtonClass(true)">
              <EyeSlashIcon class="w-6 h-6 mb-1"/>
              <span class="text-xs">Redact</span>
            </button>

            <!-- 4. Sign (Dummy) -->
           <button @click="emit('advance-pdf', 'signature')" :class="getAdvanceButtonClass()">
              <PencilSquareIcon class="w-6 h-6 mb-1"/>
              <span class="text-xs">Sign</span>
          </button>

            <!-- 5. Metadata (Dummy) -->
            <button :class="getAdvanceButtonClass(true)">
              <InformationCircleIcon class="w-6 h-6 mb-1"/>
              <span class="text-xs">Metadata</span>
            </button>

            <!-- 6. Compress (Dummy) -->
            <button :class="getAdvanceButtonClass(true)">
              <DocumentMinusIcon class="w-6 h-6 mb-1"/>
              <span class="text-xs">Compress</span>
            </button>
            
            <!-- 7. OCR (Dummy) -->
            <button :class="getAdvanceButtonClass(true)">
              <DocumentMagnifyingGlassIcon class="w-6 h-6 mb-1"/>
              <span class="text-xs">OCR</span>
            </button>
            
            <!-- 8. Repair (Dummy) -->
            <button :class="getAdvanceButtonClass(true)">
              <WrenchScrewdriverIcon class="w-6 h-6 mb-1"/>
              <span class="text-xs">Repair</span>
            </button>

            <!-- 9. Bates (Dummy) -->
            <button :class="getAdvanceButtonClass(true)">
              <HashtagIcon class="w-6 h-6 mb-1"/>
              <span class="text-xs">Bates No.</span>
            </button>
            
            <!-- 10. Flatten (Dummy) -->
            <button :class="getAdvanceButtonClass(true)">
              <Square3Stack3DIcon class="w-6 h-6 mb-1"/>
              <span class="text-xs">Flatten</span>
            </button>
        </div>
      </div>

      <div v-else class="text-xs text-slate-500">
        <p>Selection mode active. Click an object to see options.</p>
      </div>
    </div>
  </aside>
</template>

<script setup>
import {
  DocumentTextIcon, DocumentDuplicateIcon, PhotoIcon, CodeBracketIcon,
  PencilIcon, PaintBrushIcon,
  SwatchIcon, LockClosedIcon, EyeSlashIcon, PencilSquareIcon, InformationCircleIcon,
  DocumentMinusIcon, DocumentMagnifyingGlassIcon, WrenchScrewdriverIcon, HashtagIcon,
  Square3Stack3DIcon
} from '@heroicons/vue/24/outline';

const props = defineProps({
  activePanel: { type: String, default: 'draw' },
  className: { type: String, default: '' },
  isMobile: { type: Boolean, default: false },
  drawingOptions: { type: Object, required: true },
  textOptions: { type: Object, required: true },
});

const emit = defineEmits([
  'update-drawing-options', 
  'update-text-options',
  'convert-pdf', 
  'organize-pdf',
  'advance-pdf'
]);



const drawingColors = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#1F2937' , '#ffffff'];
const textColors = ['#1F2937', '#EF4444', '#3B82F6', '#22C55E', '#8B5CF6'];

const getAdvanceButtonClass = (isDisabled = false) => {
  const baseClass = 'flex flex-col items-center justify-center p-2 rounded-md border transition-colors h-20';
  if (isDisabled) {
    return `${baseClass} bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed`;
  }
  return `${baseClass} bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300 active:bg-blue-50 active:border-blue-300`;
};

const getToolButtonClass = (toolName) => {
  const baseClass = 'flex flex-col items-center justify-center p-2 rounded-md border transition-colors h-14';
  if (props.drawingOptions.tool === toolName) {
    return `${baseClass} bg-blue-100 border-blue-500 text-blue-600`;
  }
  return `${baseClass} bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300`;
};

const getStyleButtonClass = (isActive, text = null, customClass = '') => {
  const baseClass = 'flex-1 p-2 rounded-md border text-sm transition-colors';
  if (isActive) {
    return `${baseClass} bg-blue-100 border-blue-500 text-blue-600 ${customClass}`;
  }
  return `${baseClass} bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 ${customClass}`;
}

const getShapeButtonClass = (shapeName) => {
  const baseClass = 'flex items-center justify-center p-2 rounded-md border transition-colors';
  if (props.drawingOptions.tool === 'shape' && props.drawingOptions.shapeType === shapeName) {
    return `${baseClass} bg-blue-100 border-blue-500 text-blue-600`;
  }
  return `${baseClass} bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300`;
};

const getSizeLabel = () => {
  switch (props.drawingOptions.tool) {
    case 'shape': return 'Stroke';
    case 'eraser': return 'Eraser Size';
    default: return 'Brush Size';
  }
};
</script>