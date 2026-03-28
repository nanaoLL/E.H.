document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('serverSelect');
  const goal10 = document.getElementById('goal10');
  const goal30 = document.getElementById('goal30');
  const goalNumber = document.getElementById('goalNumber');
  const goalLove = document.getElementById('goalLove'); // 애정망호 추가
  const newTicketAlert = document.getElementById('newTicketAlert');
  const fullBangAlert = document.getElementById('fullBangAlert');
  const autoCopyEnabled = document.getElementById('autoCopyEnabled');
  
  const checkUpdateBtn = document.getElementById('checkUpdateBtn');
  const repoLinkBtn = document.getElementById('repoLinkBtn');
  const updateMessage = document.getElementById('updateMessage');

  let messageTimeout; // 알림 메시지 타이머 변수

  // 기존에 저장된 설정 불러오기
  chrome.storage.local.get([
    'selectedServer', 'goal10', 'goal30', 'goalNumber', 'goalLove', 'enableNewTicket', 'enableFullBang', 'enableAutoCopy'
  ], (result) => {
    if (result.selectedServer) select.value = result.selectedServer;
    if (result.goal10 !== undefined) goal10.checked = result.goal10;
    if (result.goal30 !== undefined) goal30.checked = result.goal30;
    if (result.goalNumber !== undefined) goalNumber.checked = result.goalNumber;
    if (result.goalLove !== undefined) goalLove.checked = result.goalLove; // 애정망호 불러오기
    if (result.enableNewTicket !== undefined) newTicketAlert.checked = result.enableNewTicket;
    if (result.enableFullBang !== undefined) fullBangAlert.checked = result.enableFullBang;
    if (result.enableAutoCopy !== undefined) autoCopyEnabled.checked = result.enableAutoCopy;
  });

  // '설정 저장' 버튼 클릭 동작
  document.getElementById('saveBtn').addEventListener('click', () => {
    const settings = {
      selectedServer: select.value,
      goal10: goal10.checked,
      goal30: goal30.checked,
      goalNumber: goalNumber.checked,
      goalLove: goalLove.checked, // 애정망호 저장
      enableNewTicket: newTicketAlert.checked,
      enableFullBang: fullBangAlert.checked,
      enableAutoCopy: autoCopyEnabled.checked 
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

  // '레츠도로 이동' 버튼 클릭 동작
  document.getElementById('goSiteBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://letsdoro.com/' });
  });

  // 배포 사이트로 이동 (느낌표 버튼)
  repoLinkBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://github.com/nanaoLL/E.H.' });
  });

  // 업데이트 확인 (새로고침 버튼)
  checkUpdateBtn.addEventListener('click', async () => {
    checkUpdateBtn.style.opacity = '0.5';
    checkUpdateBtn.disabled = true;

    try {
      const currentVersion = chrome.runtime.getManifest().version;

      const response = await fetch('https://api.github.com/repos/nanaoLL/E.H./releases/latest');
      if (!response.ok) throw new Error('GitHub API 통신 실패');
      
      const data = await response.json();
      
      let latestVersion = data.tag_name;
      if (latestVersion.startsWith('v')) {
        latestVersion = latestVersion.substring(1);
      }

      // 두 버전을 비교
      const isOutdated = compareVersions(currentVersion, latestVersion) < 0;

      updateMessage.style.display = 'block';
      if (isOutdated) {
        updateMessage.className = 'update-message';
        updateMessage.innerHTML = '업데이트가 존재합니다.<br>필요 시 우측 상단의 (!) 버튼을 눌러서 새로운 버전으로 교체해주세요.';
      } else {
        updateMessage.className = 'update-message update-success';
        updateMessage.innerHTML = `현재 최신 버전(${currentVersion})을 사용 중입니다.`;
      }
    } catch (error) {
      updateMessage.style.display = 'block';
      updateMessage.className = 'update-message';
      updateMessage.innerHTML = '업데이트 확인에 실패했습니다. 잠시 후 다시 시도해주세요.';
      console.error('Update check error:', error);
    } finally {
      setTimeout(() => {
        checkUpdateBtn.style.opacity = '1';
        checkUpdateBtn.disabled = false;
      }, 500);

      // 5초 후 메시지 자동 숨김
      if (messageTimeout) clearTimeout(messageTimeout); 
      messageTimeout = setTimeout(() => {
        updateMessage.style.display = 'none';
      }, 5000);
    }
  });

  // 버전 비교
  function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    // 가장 긴 자릿수 기준으로 반복
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      // 자릿수가 부족하면 0으로 취급 (1.2 -> 1.2.0)
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;
      
      if (num1 < num2) return -1; // 내 버전이 더 낮음 (업데이트 필요)
      if (num1 > num2) return 1;  // 내 버전이 더 높음
    }
    return 0; // 버전이 완전히 같음
  }
});