chrome.action.onClicked.addListener(function() {
  var url = chrome.runtime.getURL('viewer/index.html')
  chrome.tabs.create({
    url: url,
    selected: true,
  })
});
