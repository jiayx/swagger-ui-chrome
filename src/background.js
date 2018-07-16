chrome.browserAction.onClicked.addListener(function() {
    var url = chrome.extension.getURL('swagger/index.html')
    chrome.tabs.create({
        url: url,
        selected: true,
    })
})
