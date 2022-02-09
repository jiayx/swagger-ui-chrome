chrome.action.onClicked.addListener(async function() {
  var url = chrome.runtime.getURL('swagger/index.html')
  chrome.tabs.create({
    url: url,
    selected: true,
  })
})
