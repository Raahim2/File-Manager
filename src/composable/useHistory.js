// src/composable/useHistory.js

import { ref, computed } from 'vue';

export function useHistory() {
  // A stack of saved states. Each state is an array of ImageData objects.
  const history = ref([]); 
  // A pointer to the current position in the history stack.
  const currentIndex = ref(-1);

  const canUndo = computed(() => currentIndex.value > 0);
  const canRedo = computed(() => currentIndex.value < history.value.length - 1);

  /**
   * Pushes a new state to the history stack.
   * This erases any "redo" history.
   * @param {Array<ImageData>} state - The canvas state to save.
   */
  function pushState(state) {
    history.value.splice(currentIndex.value + 1);
    history.value.push(state);
    currentIndex.value = history.value.length - 1;
  }

  /**
   * Moves back one step in history and returns the state.
   * @returns {Array<ImageData> | null} The previous state or null.
   */
  function undo() {
    if (canUndo.value) {
      currentIndex.value--;
      return history.value[currentIndex.value];
    }
    return null;
  }

  /**
   * Moves forward one step in history and returns the state.
   * @returns {Array<ImageData> | null} The next state or null.
   */
  function redo() {
    if (canRedo.value) {
      currentIndex.value++;
      return history.value[currentIndex.value];
    }
    return null;
  }

  /**
   * Clears the entire history stack.
   */
  function clear() {
    history.value = [];
    currentIndex.value = -1;
  }

  return {
    pushState,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
  };
}