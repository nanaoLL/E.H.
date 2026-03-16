chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. 새 티켓 알림
  if (request.type === "NEW_TICKET") {
    chrome.notifications.create(request.ticketId, {
      type: "basic",
      iconUrl: "icons/icon.png", // 🔥 경로 수정
      title: "새로운 티켓 발견!",
      message: request.title,
      priority: 2
    }, (notificationId) => {
      if (chrome.runtime.lastError) console.error("새 티켓 알림 생성 실패:", chrome.runtime.lastError.message);
    });

    if (sender.tab) {
      chrome.storage.session.set({ [request.ticketId]: sender.tab.id });
    }
  }

  // 2. 🚀 풀방 알림
  if (request.type === "FULL_BANG_ALERT") {
    const notiId = 'fullbang_' + Date.now(); 
    
    // 🔥 메시지에 빈 줄(\n)을 추가하여 간격을 넓히고 문구 수정
    const fullBangMessage = "도령 내 수줍게 고백할게 있다네\n좀 일어나보게...";

    chrome.notifications.create(notiId, {
      type: "basic",
      iconUrl: "icons/icon.png", // 🔥 경로 수정
      title: "풀방!!",
      message: fullBangMessage,
      priority: 2
    }, (id) => {
       if (chrome.runtime.lastError) console.error("풀방 알림 생성 실패:", chrome.runtime.lastError.message);
    });

    if (sender.tab) {
      chrome.storage.session.set({ [notiId]: sender.tab.id });
    }
  }
});

// 알림 클릭 시 동작
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.notifications.clear(notificationId);

  chrome.storage.session.get([notificationId], (result) => {
    const tabId = result[notificationId];
    if (tabId) {
      chrome.tabs.update(tabId, { active: true });
      chrome.tabs.get(tabId, (tab) => {
        chrome.windows.update(tab.windowId, { focused: true });
      });

      if (!notificationId.startsWith('fullbang_')) {
        chrome.tabs.sendMessage(tabId, { type: "CLICK_TICKET", ticketId: notificationId });
      }
    }
  });
});