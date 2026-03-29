// ====== 1. 설정 및 공통 변수 ======
const TICKET_SELECTOR = '.ticket-container'; 
const seenTickets = new Set();
let targetServer = "전체"; 
let isReady = false; 

let enableNewTicket = true; 
let enableFullBang = true;
let goal10 = true;
let goal30 = true;
let goalNumber = true;
let goalLove = true; // 애정망호 변수
let enableAutoCopy = true; 

chrome.storage.local.get([
  'selectedServer', 'goal10', 'goal30', 'goalNumber', 'goalLove', 'enableNewTicket', 'enableFullBang', 'enableAutoCopy'
], (result) => {
  if (result.selectedServer) targetServer = result.selectedServer;
  if (result.goal10 !== undefined) goal10 = result.goal10;
  if (result.goal30 !== undefined) goal30 = result.goal30;
  if (result.goalNumber !== undefined) goalNumber = result.goalNumber;
  if (result.goalLove !== undefined) goalLove = result.goalLove; 
  if (result.enableNewTicket !== undefined) enableNewTicket = result.enableNewTicket;
  if (result.enableFullBang !== undefined) enableFullBang = result.enableFullBang;
  if (result.enableAutoCopy !== undefined) enableAutoCopy = result.enableAutoCopy;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.selectedServer) targetServer = changes.selectedServer.newValue;
  if (changes.goal10 !== undefined) goal10 = changes.goal10.newValue;
  if (changes.goal30 !== undefined) goal30 = changes.goal30.newValue;
  if (changes.goalNumber !== undefined) goalNumber = changes.goalNumber.newValue;
  if (changes.goalLove !== undefined) goalLove = changes.goalLove.newValue; 
  if (changes.enableNewTicket !== undefined) enableNewTicket = changes.enableNewTicket.newValue;
  if (changes.enableFullBang !== undefined) enableFullBang = changes.enableFullBang.newValue;
  if (changes.enableAutoCopy !== undefined) enableAutoCopy = changes.enableAutoCopy.newValue;
});

// ====== 2. 메인 페이지 (협동작전 목록) 새 티켓 감지 ======
function checkForNewTickets() {
  if (window.location.href.includes('/ticket/')) return;
  if (!enableNewTicket) return; 

  const tickets = document.querySelectorAll(TICKET_SELECTOR);
  
  tickets.forEach(ticket => {
    // 🔥 1단계: 티켓의 진짜 내용물(방장 + 제목)을 추출하여 고유 지문 생성
    const titleElement = ticket.querySelector('h3');
    let baseTitle = titleElement ? titleElement.innerText.trim() : "새로운 티켓";

    const hostElement = ticket.querySelector('.ticket-bottom .truncate.font-semibold');
    const hostName = hostElement ? hostElement.innerText.trim() : "알수없음";

    const realTicketData = `${hostName}_${baseTitle}`;

    // 🔥 2단계: DOM 재활용 방지 로직 (상자가 재활용되어 내용이 바뀌었는지 체크)
    let domTicketId = ticket.getAttribute('data-ext-ticket-id');
    let lastTicketData = ticket.getAttribute('data-ext-ticket-data');

    if (!domTicketId || lastTicketData !== realTicketData) {
      // 새로운 상자거나, 재활용되어서 안에 내용물(글씨)이 바뀐 상자라면 ID 리셋!
      domTicketId = 'ticket_' + Math.random().toString(36).substr(2, 9);
      ticket.setAttribute('data-ext-ticket-id', domTicketId);
      ticket.setAttribute('data-ext-ticket-data', realTicketData); // 현재 내용물 저장
    }

    // 🔥 3단계: 알림 중복 검사는 무작위 ID가 아닌 '진짜 내용물(realTicketData)' 기준으로 판단
    if (!seenTickets.has(realTicketData)) {
      seenTickets.add(realTicketData); 
      
      const fullText = ticket.innerText.replace(/\n/g, ' ').trim();

      let serverTag = "";
      let guildTag = "";
      let ticketGoal = ""; 
      
      const servers = ["한섭", "일섭", "글로벌", "북미"];
      const guilds = ["야생", "갤길", "라운지"];
      const goals = ["in 10%", "in 30%", "숫자단", "애정망호"]; 

      const allTextNodes = ticket.querySelectorAll('span, div');
      allTextNodes.forEach(node => {
        const text = node.innerText.trim();
        if (servers.includes(text)) serverTag = text;
        if (guilds.includes(text)) guildTag = text;
        if (goals.includes(text)) ticketGoal = text; 
      });

      let partyCombo = "";
      const usersIcon = ticket.querySelector('.lucide-users');
      if (usersIcon && usersIcon.parentElement) {
        partyCombo = usersIcon.parentElement.innerText.trim();
      }

      // 목표 필터링
      if (ticketGoal === "in 10%" && !goal10) return;
      if (ticketGoal === "in 30%" && !goal30) return;
      if (ticketGoal === "숫자단" && !goalNumber) return;
      if (ticketGoal === "애정망호" && !goalLove) return; 

      let prefix = "";
      if (serverTag && guildTag) {
        prefix = `[${serverTag}/${guildTag}] `;
      } else if (serverTag) {
        prefix = `[${serverTag}] `;
      } else if (guildTag) {
        prefix = `[${guildTag}] `;
      }

      const finalTitle = prefix + baseTitle;

      if (fullText.includes("이륙")) return;
      if (targetServer !== "전체" && !fullText.includes(targetServer)) return;

      if (isReady) {
        console.log(`[알리미] 🔔 새 티켓 감지됨!: ${finalTitle} (조합: ${partyCombo})`);
        chrome.runtime.sendMessage({
          type: "NEW_TICKET",
          ticketId: domTicketId, // 클릭 시 화면 이동을 위해 클릭용 ID 전달
          title: finalTitle,
          partyCombo: partyCombo 
        });
      }
    }
  });
}

// ====== 3. 티켓 상세 페이지 (풀방 감지) ======
let isFullBangNotified = false;

function checkForFullBang() {
  if (!window.location.href.includes('/ticket/')) return;
  if (!enableFullBang) return;

  // 컨테이너를 찾지 않고, 명함 박스 자체를 찾아서 개수 체크
  const participantBoxes = document.querySelectorAll('.flex-1.overflow-y-auto .bg-\\[var\\(--color-surface\\)\\].rounded-lg');
  const participantCount = participantBoxes.length;

  if (participantCount >= 5 && !isFullBangNotified) {
    isFullBangNotified = true;
    
    if (isReady) {
      console.log("[알리미] 🎉 5명 풀방 감지!");
      chrome.runtime.sendMessage({
        type: "FULL_BANG_ALERT"
      });
    }
  } else if (participantCount < 5) {
    isFullBangNotified = false;
  }
}

// ====== 4. 화면 변화 및 URL 변경 감지 ======
let lastUrl = location.href; 
let debounceTimer = null; 

const observer = new MutationObserver((mutations) => {
  const currentUrl = location.href;
  
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    console.log(`[알리미] 🔄 페이지 이동 감지 (${currentUrl}). 알림 일시 정지...`);
    
    // 🔥 로비나 다른 방으로 이동할 때 무조건 풀방 알림 상태 초기화
    isFullBangNotified = false; 
    
    reInitializeScanner();

    if (enableAutoCopy && currentUrl.includes('/ticket/')) {
      autoCopyTicketCode();
    }
    return; 
  }

  let hasNewTicketNode = false;

  for (let mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      for (let node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          if (node.classList.contains('ticket-wrapper') || 
              node.classList.contains('ticket-container') || 
              node.querySelector('.ticket-container')) {
            hasNewTicketNode = true;
            break; 
          }
        }
      }
    }
    // Svelte 노드 텍스트 변경 감지 (재활용 대응)
    if (mutation.type === 'characterData') {
       hasNewTicketNode = true;
    }
    if (hasNewTicketNode) break;
  }

  if (!hasNewTicketNode) return;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(() => {
    checkForNewTickets();
    checkForFullBang();
  }, 500); 
});

observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    characterData: true // 🔥 텍스트 내용 변경도 감지하도록 추가
});

// ====== 5. 초기화 및 자동 복사 공통 함수 ======
function reInitializeScanner() {
  isReady = false; 
  
  setTimeout(() => {
    // 🔥 초기화할 때도 진짜 내용물(방장+제목)로 저장하도록 변경
    const initialTickets = document.querySelectorAll(TICKET_SELECTOR);
    initialTickets.forEach(ticket => {
      const titleElement = ticket.querySelector('h3');
      const baseTitle = titleElement ? titleElement.innerText.trim() : "새로운 티켓";
      const hostElement = ticket.querySelector('.ticket-bottom .truncate.font-semibold');
      const hostName = hostElement ? hostElement.innerText.trim() : "알수없음";
      
      const realTicketData = `${hostName}_${baseTitle}`;
      
      let domTicketId = ticket.getAttribute('data-ext-ticket-id');
      if (!domTicketId) {
        domTicketId = 'ticket_' + Math.random().toString(36).substr(2, 9);
        ticket.setAttribute('data-ext-ticket-id', domTicketId);
        ticket.setAttribute('data-ext-ticket-data', realTicketData);
      }
      seenTickets.add(realTicketData); 
    });

    if (window.location.href.includes('/ticket/')) {
        const listContainer = document.querySelector('.flex-1.overflow-y-auto.space-y-2');
        if (listContainer && listContainer.children.length >= 5) {
          isFullBangNotified = true;
        }
    }
    
    setTimeout(() => {
      isReady = true;
      console.log(`[알리미] ✔️ 준비 완료! 다시 새 알림을 감지합니다.`);
    }, 1000);

  }, 1000);
}

function autoCopyTicketCode() {
  let attempts = 0;
  const copyInterval = setInterval(() => {
    attempts++;
    const copyBtn = document.querySelector('button[title="클릭하여 복사"]');

    if (copyBtn) {
      copyBtn.click();
      console.log("✅ 입장 코드 자동 복사 완료!");
      clearInterval(copyInterval);
    } else if (attempts >= 20) { 
      clearInterval(copyInterval);
    }
  }, 500);
}

window.onload = () => {
  console.log("🚀 레츠도로 알리미 로딩 중...");
  reInitializeScanner();
};

// ====== 6. 알림 클릭 시 화면 스크롤 & 클릭 처리 ======
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CLICK_TICKET") {
    const ticketToClick = document.querySelector(`[data-ext-ticket-id="${request.ticketId}"]`);
    if (ticketToClick) {
      ticketToClick.scrollIntoView({ behavior: "smooth", block: "center" });
      const originalBg = ticketToClick.style.backgroundColor;
      ticketToClick.style.backgroundColor = "#ffeb3b";
      setTimeout(() => { ticketToClick.style.backgroundColor = originalBg || ''; }, 1500);

      ticketToClick.click();
    }
  }
});