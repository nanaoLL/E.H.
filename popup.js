document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('serverSelect');
  const goal10 = document.getElementById('goal10');
  const goal30 = document.getElementById('goal30');
  const goalNumber = document.getElementById('goalNumber');
  const newTicketAlert = document.getElementById('newTicketAlert');
  const fullBangAlert = document.getElementById('fullBangAlert');
  const autoCopyEnabled = document.getElementById('autoCopyEnabled'); // 🔥 새 옵션
  
  // 1. 기존에 저장된 설정 불러오기
  chrome.storage.local.get([
    'selectedServer', 'goal10', 'goal30', 'goalNumber', 'enableNewTicket', 'enableFullBang', 'enableAutoCopy'
  ], (result) => {
    if (result.selectedServer) select.value = result.selectedServer;
    if (result.goal10 !== undefined) goal10.checked = result.goal10;
    if (result.goal30 !== undefined) goal30.checked = result.goal30;
    if (result.goalNumber !== undefined) goalNumber.checked = result.goalNumber;
    if (result.enableNewTicket !== undefined) newTicketAlert.checked = result.enableNewTicket;
    if (result.enableFullBang !== undefined) fullBangAlert.checked = result.enableFullBang;
    if (result.enableAutoCopy !== undefined) autoCopyEnabled.checked = result.enableAutoCopy;
  });

  // 2. '설정 저장' 버튼 클릭 동작
  document.getElementById('saveBtn').addEventListener('click', () => {
    const settings = {
      selectedServer: select.value,
      goal10: goal10.checked,
      goal30: goal30.checked,
      goalNumber: goalNumber.checked,
      enableNewTicket: newTicketAlert.checked,
      enableFullBang: fullBangAlert.checked,
      enableAutoCopy: autoCopyEnabled.checked // 🔥 새 옵션 저장
    };

    chrome.storage.local.set(settings, () => {
      const btn = document.getElementById('saveBtn');
      btn.innerText = "저장 완료!";
      btn.style.backgroundColor = "#4CAF50"; 
      setTimeout(() => {
        btn.innerText = "설정 저장";
        btn.style.backgroundColor = "#2196F3"; 
      }, 1000);
    });
  });

  // 3. '레츠도로 이동' 버튼 클릭 동작
  document.getElementById('goSiteBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://letsdoro.com/' });
  });
});