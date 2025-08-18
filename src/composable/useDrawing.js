
// composables/useDrawing.js
import { ref } from 'vue';

export function useDrawing(props) {
  const isDrawing = ref(false);
  let startX = 0, startY = 0;
  let currentCanvasContext = null;
  let canvasSnapshot = null;
  let hasDrawn = false; // Flag to check if mouse moved after mousedown

const getCoords = (e) => {
    const event = e.touches ? e.touches[0] : e;
    const rect = event.target.getBoundingClientRect();
    const scaleX = event.target.width / rect.width;
    const scaleY = event.target.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (props.activePanel !== 'draw' || !e.target) return;
    e.preventDefault();
    isDrawing.value = true;
    hasDrawn = false; // Reset on new drawing action
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
    if (!isDrawing.value || props.activePanel !== 'draw') return;
    e.preventDefault();
    hasDrawn = true; // Mark that a drawing motion occurred
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

  // +++ UPDATED stopDrawing to accept a callback +++
  const stopDrawing = (onDrawEndCallback, e) => {
    if (!isDrawing.value) return;
    
    const wasDrawing = isDrawing.value;
    isDrawing.value = false;

    if (wasDrawing && hasDrawn) {
        const tool = props.drawingOptions.tool;
        if (tool === 'shape' && e) {
            const { x, y } = getCoords(e);
            drawShape(currentCanvasContext, x, y);
        } else {
            currentCanvasContext?.closePath();
        }
        
        // Trigger the callback to save history state
        if (typeof onDrawEndCallback === 'function') {
            onDrawEndCallback();
        }
    }

    canvasSnapshot = null;
    currentCanvasContext = null;
  };

  const drawShape = (ctx, endX, endY) => {
    // Set common properties
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.beginPath();

    const width = endX - startX;
    const height = endY - startY;

    // Check if the shape should be filled or stroked
    if (props.drawingOptions.isFilled) {
      ctx.fillStyle = props.drawingOptions.color;
    } else {
      ctx.strokeStyle = props.drawingOptions.color;
      ctx.lineWidth = props.drawingOptions.size;
    }
    
    switch (props.drawingOptions.shapeType) {
      case 'rectangle':
        // Use fillRect for filled, strokeRect for outlined
        props.drawingOptions.isFilled
          ? ctx.fillRect(startX, startY, width, height)
          : ctx.strokeRect(startX, startY, width, height);
        break;
      case 'ellipse':
        ctx.ellipse(
          startX + width / 2,
          startY + height / 2,
          Math.abs(width / 2),
          Math.abs(height / 2),
          0,
          0,
          2 * Math.PI
        );
        // Use fill() for filled, stroke() for outlined
        props.drawingOptions.isFilled ? ctx.fill() : ctx.stroke();
        break;
      case 'line':
        // Line can only be stroked, so we always stroke it
        ctx.strokeStyle = props.drawingOptions.color;
        ctx.lineWidth = props.drawingOptions.size;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke(); // Always stroke for a line
        break;
    }
    // No need for a final ctx.stroke() here as it's handled inside the cases
  };

  return {
    startDrawing,
    draw,
    stopDrawing
  };
}