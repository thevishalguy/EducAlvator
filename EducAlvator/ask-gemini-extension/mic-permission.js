// Opened by the side panel, which cannot show Chrome's permission prompt itself.
// Granting here allows the microphone for the whole extension, side panel included.
const title = document.getElementById('permissionTitle');
const body = document.getElementById('permissionBody');
const retry = document.getElementById('permissionRetry');

async function closeWindow() {
  const { id } = await chrome.windows.getCurrent();
  chrome.windows.remove(id);
}

async function requestMicrophone() {
  retry.hidden = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    title.textContent = 'Microphone allowed';
    body.textContent = 'EduPanel is listening now. This window closes by itself.';
    setTimeout(closeWindow, 1200);
  } catch (error) {
    title.textContent = 'Microphone not allowed';
    body.textContent = error.name === 'NotFoundError'
      ? 'No microphone was found. Connect one and try again.'
      : 'Chrome did not allow the microphone. If you blocked it, click the icon to the left of this window\'s address, allow the microphone, then try again.';
    retry.hidden = false;
  }
}

retry.addEventListener('click', requestMicrophone);
requestMicrophone();
