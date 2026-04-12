let lastFullBangTime = 0;

// ====== 1. 풀방 알림 수신 및 생성 ======
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "FULL_BANG_ALERT") {
    const now = Date.now();
    
    // 도배 방지 쿨타임 (3초)
    if (now - lastFullBangTime > 3000) { 
      lastFullBangTime = now;

      // 고유 ID 생성 로직 (풀방 타임스탬프)
      const notiId = 'fullbang_' + now; 
      const fullBangMessage = "도령 내 수줍게 고백할게 있다네\n좀 일어나보게...";

      chrome.notifications.create(notiId, {
        type: "basic",
        iconUrl: "icons/bell_icon.png",
        title: "풀방!!",
        message: fullBangMessage,
        priority: 2,
        requireInteraction: true 
      }, (id) => {
        if (chrome.runtime.lastError) {
          console.error("풀방 알림 생성 실패:", chrome.runtime.lastError.message);
        }
      });

      // 알림 클릭 시 해당 탭으로 가기 위해 ID 저장
      if (sender.tab) {
        chrome.storage.local.set({ lastFullBangTabId: sender.tab.id });
      }
    }
  }
});

// ====== 2. 알림 클릭 시 방으로 순간이동 ======
chrome.notifications.onClicked.addListener((notificationId) => {
  // 생성된 모든 풀방 알림에 대응
  if (notificationId.startsWith('fullbang_')) {
    chrome.storage.local.get(['lastFullBangTabId'], (result) => {
      const tabId = result.lastFullBangTabId;
      if (tabId) {
        chrome.tabs.update(tabId, { active: true }, (tab) => {
          if (tab) {
            chrome.windows.update(tab.windowId, { focused: true });
          }
        });
      }
    });
    chrome.notifications.clear(notificationId);
  }
});