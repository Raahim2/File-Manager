// src/composable/useEdit.js

export function useEdit() {

  /**
   * Draws styled text onto a canvas context.
   * @param {CanvasRenderingContext2D} ctx - The 2D context of the canvas to draw on.
   * @param {string} text - The text content to draw.
   * @param {number} x - The x-coordinate to start drawing.
   * @param {number} y - The y-coordinate to start drawing.
   * @param {number} scale - The canvas scaling factor to correctly size the font.
   * @param {object} options - The text styling options.
   * @param {number} options.size - The font size.
   * @param {string} options.color - The font color.
   * @param {string} options.font - The font family (e.g., 'Helvetica', 'Times').
   * @param {boolean} options.isBold - Whether the text is bold.
   * @param {boolean} options.isItalic - Whether the text is italic.
   */
  const drawTextOnCanvas = (ctx, text, x, y, scale, options) => {
    if (!text || !text.trim()) return;

    // 1. Construct the font style string for the canvas context
    let fontStyle = '';
    if (options.isItalic) fontStyle += 'italic ';
    if (options.isBold) fontStyle += 'bold ';

    ctx.font = `${fontStyle} ${options.size * scale}px ${options.font}`;
    
    ctx.fillStyle = options.color;

    const scaledY = y * scale + options.size * scale;
    ctx.fillText(text, x * scale, scaledY);
  };

  return {
    drawTextOnCanvas,
  };
}