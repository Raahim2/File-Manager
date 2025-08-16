// src/composable/useOrganise.js

import { PDFDocument } from 'pdf-lib';

export function useOrganise() {

  /**
   * Merges multiple PDF ArrayBuffers into a single PDF.
   * @param {Array<ArrayBuffer>} pdfBuffers - An array of ArrayBuffers for the PDFs to merge.
   * @returns {Promise<ArrayBuffer|null>} The ArrayBuffer of the merged PDF, or null on error.
   */
  const mergePdfs = async (pdfBuffers) => {
    if (!pdfBuffers || pdfBuffers.length === 0) {
      console.error("No PDF buffers provided for merging.");
      return null;
    }
    try {
      const mergedPdf = await PDFDocument.create();
      for (const pdfBuffer of pdfBuffers) {
        const pdf = await PDFDocument.load(pdfBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }
      return await mergedPdf.save();
    } catch (error) {
      console.error('Error merging PDFs:', error);
      alert('An error occurred while merging the PDFs. Please check the console.');
      return null;
    }
  };

  /**
   * Adds a blank page to a PDF document.
   * @param {ArrayBuffer} pdfBuffer - The source PDF ArrayBuffer.
   * @param {number} insertAtIndex - The 0-based index where the new page should be inserted.
   * @returns {Promise<ArrayBuffer|null>} The modified PDF as an ArrayBuffer, or null on error.
   */
  const addBlankPage = async (pdfBuffer, insertAtIndex) => {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();

      if (insertAtIndex < 0 || insertAtIndex > pageCount) {
        alert(`Invalid page number. Please enter a number between 1 and ${pageCount + 1}.`);
        return null;
      }
      
      // Use the dimensions of the first page as a default for the new page
      const firstPage = pdfDoc.getPage(0);
      const { width, height } = firstPage.getSize();

      pdfDoc.insertPage(insertAtIndex, [width, height]);
      
      return await pdfDoc.save();
    } catch (error) {
      console.error('Error adding blank page:', error);
      alert('An error occurred while adding a blank page.');
      return null;
    }
  };

  /**
   * Deletes a specific page from a PDF document.
   * @param {ArrayBuffer} pdfBuffer - The source PDF ArrayBuffer.
   * @param {number} pageIndexToDelete - The 0-based index of the page to delete.
   * @returns {Promise<ArrayBuffer|null>} The modified PDF as an ArrayBuffer, or null on error.
   */
  const deletePage = async (pdfBuffer, pageIndexToDelete) => {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();

      if (pageCount <= 1) {
        alert("Cannot delete the only page in the document.");
        return null;
      }
      if (pageIndexToDelete < 0 || pageIndexToDelete >= pageCount) {
         alert(`Invalid page number. Please enter a number between 1 and ${pageCount}.`);
        return null;
      }
      
      pdfDoc.removePage(pageIndexToDelete);
      
      return await pdfDoc.save();
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('An error occurred while deleting the page.');
      return null;
    }
  };

  /**
   * Splits a PDF into two separate documents at a specified page.
   * @param {ArrayBuffer} pdfBuffer - The source PDF ArrayBuffer.
   * @param {number} splitAfterPageIndex - The 0-based index of the page to split after.
   * @returns {Promise<Array<ArrayBuffer>|null>} An array containing two ArrayBuffers, or null on error.
   */
  const splitPdf = async (pdfBuffer, splitAfterPageIndex) => {
    try {
        const sourceDoc = await PDFDocument.load(pdfBuffer);
        const pageCount = sourceDoc.getPageCount();

        if (splitAfterPageIndex < 0 || splitAfterPageIndex >= pageCount - 1) {
            alert(`Invalid split point. Please choose a page between 1 and ${pageCount - 1}.`);
            return null;
        }

        const doc1 = await PDFDocument.create();
        const doc2 = await PDFDocument.create();
        
        const pageIndices1 = Array.from({ length: splitAfterPageIndex + 1 }, (_, i) => i);
        const pageIndices2 = Array.from({ length: pageCount - (splitAfterPageIndex + 1) }, (_, i) => i + splitAfterPageIndex + 1);

        const copiedPages1 = await doc1.copyPages(sourceDoc, pageIndices1);
        copiedPages1.forEach(page => doc1.addPage(page));

        const copiedPages2 = await doc2.copyPages(sourceDoc, pageIndices2);
        copiedPages2.forEach(page => doc2.addPage(page));

        const buffer1 = await doc1.save();
        const buffer2 = await doc2.save();

        return [buffer1, buffer2];
    } catch (error) {
        console.error('Error splitting PDF:', error);
        alert('An error occurred while splitting the PDF.');
        return null;
    }
  };

  const insertPdf = async (targetPdfBuffer, insertPdfBuffer, atIndex) => {
    try {
      const targetDoc = await PDFDocument.load(targetPdfBuffer);
      const insertDoc = await PDFDocument.load(insertPdfBuffer);

      const pagesToInsert = await targetDoc.copyPages(insertDoc, insertDoc.getPageIndices());

      for (let i = 0; i < pagesToInsert.length; i++) {
        targetDoc.insertPage(atIndex + i, pagesToInsert[i]);
      }

      return await targetDoc.save();
    } catch (error) {
      console.error('Error inserting PDF:', error);
      alert('An error occurred while inserting the PDF.');
      return null;
    }
  };


  return {
    mergePdfs,
    addBlankPage,
    deletePage,
    splitPdf,
    insertPdf
  };
}