chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    
    // 디버깅용 로그
    console.log("★★★ background: URL 변경 감지! content.js로 메시지 전송 시도:", tab.url);

    chrome.tabs.sendMessage(tabId, { type: 'URL_CHANGED' }, (response) => {
      if (chrome.runtime.lastError) {
        // content.js가 없는 페이지일 경우의 오류는 무시
      }
    });
  }
});