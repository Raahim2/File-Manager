<template>
  <header class="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white z-20 shrink-0">
    <div class="flex items-center space-x-3">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-7 h-7 text-blue-600">
        <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a.375.375 0 0 1-.375-.375V6.75A3.75 3.75 0 0 0 10.5 3H5.625Z" />
        <path d="M12.75 3.75a.375.375 0 0 0-.375-.375h-1.5a.375.375 0 0 0-.375.375v4.5c0 .207.168.375.375.375h1.5a.375.375 0 0 0 .375-.375v-4.5Z" />
      </svg>
      <h1 class="text-lg font-semibold text-slate-700">PDF Studio</h1>
    </div>

    <div class="flex-1 px-4 lg:px-8">
      <p class="text-sm text-center text-slate-500 truncate" :title="pdfName">{{ pdfName }}</p>
    </div>

    <div class="flex items-center space-x-1 sm:space-x-2">
      <button class="p-2 rounded-md hover:bg-slate-100 transition-colors" title="Download">
        <ArrowDownTrayIcon class="w-5 h-5 text-slate-600" />
      </button>
      <button class="p-2 rounded-md hover:bg-slate-100 transition-colors" title="Print">
        <PrinterIcon class="w-5 h-5 text-slate-600" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { defineProps } from 'vue';
import { ArrowDownTrayIcon, PrinterIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  pdfName: { type: String, default: 'No file selected' }
});
</script>
