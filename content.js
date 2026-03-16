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
let enableAutoCopy = true; 

chrome.storage.local.get([
  'selectedServer', 'goal10', 'goal30', 'goalNumber', 'enableNewTicket', 'enableFullBang', 'enableAutoCopy'
], (result) => {
  if (result.selectedServer) targetServer = result.selectedServer;
  if (result.goal10 !== undefined) goal10 = result.goal10;
  if (result.goal30 !== undefined) goal30 = result.goal30;
  if (result.goalNumber !== undefined) goalNumber = result.goalNumber;
  if (result.enableNewTicket !== undefined) enableNewTicket = result.enableNewTicket;
  if (result.enableFullBang !== undefined) enableFullBang = result.enableFullBang;
  if (result.enableAutoCopy !== undefined) enableAutoCopy = result.enableAutoCopy;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.selectedServer) targetServer = changes.selectedServer.newValue;
  if (changes.goal10 !== undefined) goal10 = changes.goal10.newValue;
  if (changes.goal30 !== undefined) goal30 = changes.goal30.newValue;
  if (changes.goalNumber !== undefined) goalNumber = changes.goalNumber.newValue;
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
    let ticketId = ticket.getAttribute('data-ext-ticket-id');
    if (!ticketId) {
      ticketId = 'ticket_' + Math.random().toString(36).substr(2, 9);
      ticket.setAttribute('data-ext-ticket-id', ticketId);
    }

    if (!seenTickets.has(ticketId)) {
      seenTickets.add(ticketId); 
      
      const fullText = ticket.innerText.replace(/\n/g, ' ').trim();
      const titleElement = ticket.querySelector('h3');
      let baseTitle = titleElement ? titleElement.innerText.trim() : "새로운 티켓이 등록되었습니다.";

      let serverTag = "";
      let guildTag = "";
      let ticketGoal = ""; 
      
      const servers = ["한섭", "일섭", "글로벌", "북미"];
      const guilds = ["야생", "갤길", "라운지"];
      const goals = ["in 10%", "in 30%", "숫자단"]; 

      const allTextNodes = ticket.querySelectorAll('span, div');
      allTextNodes.forEach(node => {
        const text = node.innerText.trim();
        if (servers.includes(text)) serverTag = text;
        if (guilds.includes(text)) guildTag = text;
        if (goals.includes(text)) ticketGoal = text; 
      });

      // 🔥 [추가됨] 파티 조합 추출 로직
      let partyCombo = "";
      const usersIcon = ticket.querySelector('.lucide-users');
      if (usersIcon && usersIcon.parentElement) {
        // 아이콘 옆에 있는 텍스트만 깔끔하게 가져옵니다.
        partyCombo = usersIcon.parentElement.innerText.trim();
      }

      if (ticketGoal === "in 10%" && !goal10) return;
      if (ticketGoal === "in 30%" && !goal30) return;
      if (ticketGoal === "숫자단" && !goalNumber) return;

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
          ticketId: ticketId,
          title: finalTitle,
          partyCombo: partyCombo // 🔥 백그라운드로 파티 조합 전송
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

  const participantBlocks = document.querySelectorAll('.flex-1.overflow-y-auto .bg-\\[var\\(--color-surface\\)\\].rounded-lg');
  
  if (participantBlocks.length >= 5 && !isFullBangNotified) {
    isFullBangNotified = true;
    
    if (isReady) {
      console.log("[알리미] 🎉 5명 풀방 감지!");
      chrome.runtime.sendMessage({
        type: "FULL_BANG_ALERT"
      });
    }
  } else if (participantBlocks.length < 5) {
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
    subtree: true 
});

// ====== 5. 초기화 및 자동 복사 공통 함수 ======
function reInitializeScanner() {
  isReady = false; 
  
  setTimeout(() => {
    const initialTickets = document.querySelectorAll(TICKET_SELECTOR);
    initialTickets.forEach(ticket => {
      let ticketId = ticket.getAttribute('data-ext-ticket-id');
      if (!ticketId) {
        ticketId = 'ticket_' + Math.random().toString(36).substr(2, 9);
        ticket.setAttribute('data-ext-ticket-id', ticketId);
      }
      seenTickets.add(ticketId); 
    });

    if (window.location.href.includes('/ticket/')) {
        const participantBlocks = document.querySelectorAll('.flex-1.overflow-y-auto .bg-\\[var\\(--color-surface\\)\\].rounded-lg');
        if(participantBlocks.length >= 5) isFullBangNotified = true;
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