// ====== 1. 설정 및 공통 변수 ======
let isReady = false; 

// 핵심 기능 ON/OFF 상태만 관리합니다.
let enableNewTicket = false; // 사이트 순정 알림을 쓰신다면 기본적으로 꺼두셔도 됩니다.
let enableFullBang = true;
let enableAutoCopy = true; 

// 저장된 설정 불러오기 (필요한 옵션만 유지)
chrome.storage.local.get([
  'enableNewTicket', 'enableFullBang', 'enableAutoCopy'
], (result) => {
  if (result.enableNewTicket !== undefined) enableNewTicket = result.enableNewTicket;
  if (result.enableFullBang !== undefined) enableFullBang = result.enableFullBang;
  if (result.enableAutoCopy !== undefined) enableAutoCopy = result.enableAutoCopy;
});

// 설정 변경 실시간 감지
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enableNewTicket !== undefined) enableNewTicket = changes.enableNewTicket.newValue;
  if (changes.enableFullBang !== undefined) enableFullBang = changes.enableFullBang.newValue;
  if (changes.enableAutoCopy !== undefined) enableAutoCopy = changes.enableAutoCopy.newValue;
});

// ====== 2. 티켓 상세 페이지 (풀방 감지) ======
let isFullBangNotified = false;

function checkForFullBang() {
  if (!window.location.href.includes('/ticket/')) return;
  if (!enableFullBang) return;

  // 명함 박스 자체를 찾아서 개수 체크 (가장 견고한 방식)
  const participantBoxes = document.querySelectorAll('.flex-1.overflow-y-auto .bg-\\[var\\(--color-surface\\)\\].rounded-lg');
  const participantCount = participantBoxes.length;

  if (participantCount >= 5 && !isFullBangNotified) {
    isFullBangNotified = true;
    
    if (isReady) {
      console.log("[알리미] 🎉 5명 풀방 감지!");
      chrome.runtime.sendMessage({ type: "FULL_BANG_ALERT" });
    }
  } else if (participantCount < 5) {
    isFullBangNotified = false;
  }
}

// ====== 3. 화면 변화 및 URL 변경 감지 ======
let lastUrl = location.href; 
let debounceTimer = null; 

const observer = new MutationObserver((mutations) => {
  const currentUrl = location.href;
  
  // URL이 변경되었을 때 (페이지 이동)
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    isFullBangNotified = false; // 풀방 알림 상태 초기화
    
    // 티켓 방에 진입했을 때만 자동 복사 실행
    if (enableAutoCopy && currentUrl.includes('/ticket/')) {
      autoCopyTicketCode();
    }
    return; 
  }

  // 화면 변화 시 감지 로직
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    checkForFullBang();
  }, 500); 
});

observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    characterData: true 
});

// ====== 4. 입장 코드 자동 복사 로직 (포커스 감지 포함) ======
function autoCopyTicketCode() {
  let attempts = 0;
  const maxAttempts = 60; // 30초 대기

  const copyInterval = setInterval(() => {
    attempts++;
    const copyBtn = document.querySelector('button[title="클릭하여 복사"]');

    if (copyBtn) {
      // 사이트 순정 알림을 클릭해서 창이 떴을 때, 
      // 사용자가 해당 탭을 진짜로 보고 있을 때(포커스 되었을 때)만 복사 실행
      if (document.hasFocus()) {
        copyBtn.click();
        console.log("✅ 입장 코드 자동 복사 완료!");
        clearInterval(copyInterval);
      }
    } else if (attempts >= maxAttempts) { 
      console.log("❌ 시간 초과로 자동 복사 중단");
      clearInterval(copyInterval);
    }
  }, 500);
}

// 초기화
window.onload = () => {
  console.log("🚀 레츠도로 알리미 (경량화 버전) 로딩 완료");
  setTimeout(() => {
    isReady = true;
    // 시작하자마자 티켓 방이라면 자동 복사 시도
    if (enableAutoCopy && window.location.href.includes('/ticket/')) {
        autoCopyTicketCode();
    }
  }, 1000);
};