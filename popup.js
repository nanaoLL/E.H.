document.addEventListener('DOMContentLoaded', () => {
  // --- 1. 체크박스 설정 관리 ---
  const ui = {
    enableAutoCopy: document.getElementById('enableAutoCopy'),
    enableFullBang: document.getElementById('enableFullBang')
  };

  // 기존 설정값 불러오기
  chrome.storage.local.get(['enableAutoCopy', 'enableFullBang'], (result) => {
    ui.enableAutoCopy.checked = result.enableAutoCopy !== undefined ? result.enableAutoCopy : true;
    ui.enableFullBang.checked = result.enableFullBang !== undefined ? result.enableFullBang : true;
  });

  // 변경 시 즉시 저장
  Object.keys(ui).forEach(key => {
    ui[key].addEventListener('change', (event) => {
      chrome.storage.local.set({ [key]: event.target.checked });
    });
  });

  // --- 2. 버튼 클릭 이벤트 연결 ---
  const btnDevSite = document.getElementById('btnDevSite');
  const btnUpdate = document.getElementById('btnUpdate');
  const btnLetsdoro = document.getElementById('btnLetsdoro');
  const updateMessage = document.getElementById('updateMessage');

  // 레츠도로 메인으로 이동
  btnLetsdoro.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://letsdoro.com/' });
  });

  // 개발자 사이트(깃허브)로 이동
  btnDevSite.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://github.com/nanaoLL/E.H.' }); 
  });

  // --- 3. 버전 비교 ---
  function compareVersions(v1, v2) {
    const parts1 = v1.replace(/[^0-9.]/g, '').split('.').map(Number);
    const parts2 = v2.replace(/[^0-9.]/g, '').split('.').map(Number);
    const len = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < len; i++) {
      const num1 = parts1[i] || 0; 
      const num2 = parts2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0; // 동일한 버전
  }

  // 메시지를 띄우고 5초 뒤에 Hide
  let timeoutId;
  function showMessage(htmlText, isError = false) {
    updateMessage.innerHTML = htmlText;
    updateMessage.style.display = 'block';
    updateMessage.style.color = isError ? '#5f6368' : '#c2185b';
    updateMessage.style.backgroundColor = isError ? '#f1f3f4' : '#fce4ec';
    updateMessage.style.borderColor = isError ? '#dadce0' : '#f48fb1';

    // 기존에 돌고 있던 타이머가 있다면 초기화 후 5초 세팅
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      updateMessage.style.display = 'none';
    }, 5000);
  }

  // 업데이트 확인 버튼 로직
  btnUpdate.addEventListener('click', async () => {
    try {
      // 1. 현재 manifest.json에 적힌 버전을 가져옵니다.
      const currentVersion = chrome.runtime.getManifest().version;

      // 2. 깃허브 API를 통해 가장 최근의 Release 태그를 가져옵니다.
      const response = await fetch('https://api.github.com/repos/nanaoLL/E.H./releases/latest');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      const latestVersion = data.tag_name; // 예: "v1.0.2"

      // 3. 버전 비교 실행
      if (compareVersions(latestVersion, currentVersion) > 0) {
        showMessage(`업데이트가 존재합니다.<br>필요 시 우측 상단의 (!) 버튼을 눌러서 새로운 버전으로 교체해주세요.`);
      } else {
        // 더 최신 버전이 없을 때의 친절한 안내
        showMessage(`현재 최신 버전(v${currentVersion})을 사용 중입니다!`, true);
      }
    } catch (error) {
      console.error('업데이트 확인 실패:', error);
      showMessage(`업데이트 정보를 가져오지 못했습니다. 인터넷 연결을 확인해 주세요.`, true);
    }
  });
});