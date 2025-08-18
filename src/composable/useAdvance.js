import { PDFDocument } from 'pdf-lib';

/**
 * Converts an image buffer to grayscale using an offscreen canvas.
 * @param {ArrayBuffer} imageBuffer The original image buffer.
 * @param {string} imageType The mime type of the image.
 * @returns {Promise<ArrayBuffer>} A new ArrayBuffer for the grayscale PNG image.
 */
const convertImageToGrayscale = (imageBuffer, imageType) => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([imageBuffer], { type: imageType });
    const imageUrl = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Use the luminosity formula for better visual results
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = gray;     // red
        data[i + 1] = gray; // green
        data[i + 2] = gray; // blue
      }

      ctx.putImageData(imageData, 0, 0);
      
      // Convert canvas to a PNG blob, then to an ArrayBuffer
      canvas.toBlob(async (pngBlob) => {
        const grayscaleBuffer = await pngBlob.arrayBuffer();
        resolve(grayscaleBuffer);
        URL.revokeObjectURL(imageUrl);
      }, 'image/png');
    };
    
    img.onerror = () => {
      reject(new Error('Could not load image for grayscale conversion.'));
      URL.revokeObjectURL(imageUrl);
    };

    img.src = imageUrl;
  });
};

export function useAdvance() {
  const addWatermark = async (
    pdfBuffer,
    imageBuffer,
    imageType,
    options = { opacity: 0.2, scale: 0.6 } // Reduced default opacity for B&W
  ) => {
    try {
      const grayscaleImageBuffer = await convertImageToGrayscale(imageBuffer, imageType);
      
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      
      // Always embed as PNG since our grayscale conversion outputs PNG
      const watermarkImage = await pdfDoc.embedPng(grayscaleImageBuffer);

      const pages = pdfDoc.getPages();
      
      for (const page of pages) {
        const { width, height } = page.getSize();
        const desiredWidth = width * options.scale;
        const scaleFactor = desiredWidth / watermarkImage.width;
        const imgDims = watermarkImage.scale(scaleFactor);
        const x = (width - imgDims.width) / 2;
        const y = (height - imgDims.height) / 2;

        page.drawImage(watermarkImage, {
          x, y,
          width: imgDims.width,
          height: imgDims.height,
          opacity: options.opacity,
        });
      }

      return await pdfDoc.save();

    } catch (error) {
      console.error('Error adding watermark:', error);
      alert('An error occurred while adding the watermark.');
      return null;
    }
  };

  return {
    addWatermark,
  };
}