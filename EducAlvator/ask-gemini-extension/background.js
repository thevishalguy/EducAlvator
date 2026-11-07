// Clicking the toolbar icon opens the side panel. Chrome persists this setting,
// but it is set again on startup so a cleared profile state cannot break the icon.
function enablePanelOnActionClick() {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Could not set side panel behaviour:', error));
}

chrome.runtime.onInstalled.addListener(() => {
  enablePanelOnActionClick();
  // Earlier versions saved these from a settings form that no longer exists.
  chrome.storage.local.remove(['apiKey', 'model']);
});
chrome.runtime.onStartup.addListener(enablePanelOnActionClick);
