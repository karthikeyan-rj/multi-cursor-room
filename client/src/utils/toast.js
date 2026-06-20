let addToast;

export function showToast(message, type = 'info') {
  if (addToast) addToast(message, type);
}

export function setToastHandler(handler) {
  addToast = handler;
  return () => { addToast = null; };
}
