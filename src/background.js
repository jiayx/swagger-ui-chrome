chrome.action.onClicked.addListener(function() {
  var url = chrome.runtime.getURL('swagger-ui/index.html')
  chrome.tabs.create({
    url: url,
    selected: true,
  })
});
