// src/composables/useConvert.js
import JSZip from 'jszip';

export function useConvert({ pdfDoc, baseCanvases, overlayCanvases }) {

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

  const convertToImage = async ({ format = 'jpeg', baseFilename = 'document' }) => {
    if (!pdfDoc || baseCanvases.value.length === 0) return;
    const fileExtension = format === 'jpeg' ? 'jpg' : 'png';

    if (pdfDoc.numPages === 1) {
      const mergedCanvas = mergeCanvasLayers(0);
      const dataUrl = mergedCanvas.toDataURL(`image/${format}`, 0.9);
      const blob = await (await fetch(dataUrl)).blob();
      downloadFile(blob, `${baseFilename}.${fileExtension}`);
      return;
    }

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

  /** Convert PDF to plain .txt */
  const convertToText = async ({ baseFilename = 'document' }) => {
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

  /** Convert PDF to JSON */
  const convertToJson = async ({ baseFilename = 'document' }) => {
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
    const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadFile(jsonBlob, `${baseFilename}.json`);
  };

  /** Convert PDF to HTML */
  const convertToHtml = async ({ baseFilename = 'document' }) => {
    if (!pdfDoc) return;
    let htmlString = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${baseFilename}</title><style>body{font-family:sans-serif;padding:2em;}.page{border:1px solid #ccc;padding:1.5em;margin-bottom:2em;}h2{border-bottom:2px solid #eee;padding-bottom:.5em;}p{white-space:pre-wrap;}</style></head><body>`;
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      htmlString += `<div class="page"><h2>Page ${i}</h2><p>${pageText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</p></div>`;
    }
    htmlString += `</body></html>`;
    const htmlBlob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
    downloadFile(htmlBlob, `${baseFilename}.html`);
  };

  /** Convert PDF to DOCX (basic text only) */
  const convertToWord = async ({ baseFilename = 'document' }) => {
    if (!pdfDoc) return;

    let wordText = '';
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      wordText += `PAGE ${i}\n${pageText}\n\n`;
    }

    // Basic DOCX creation with a Blob (not styled, plain text)
    const docxHeader = `
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body><w:p><w:r><w:t>`;
    const docxFooter = `</w:t></w:r></w:p></w:body></w:document>`;
    const xmlContent = docxHeader + wordText.replace(/&/g, '&amp;') + docxFooter;
    const blob = new Blob([xmlContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    downloadFile(blob, `${baseFilename}.docx`);
  };

  return {
    convertToImage,
    convertToText,
    convertToJson,
    convertToHtml,
    convertToWord
  };
}
