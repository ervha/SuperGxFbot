<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>処理・保持部屋管理</title>
    <link rel="stylesheet" href="style.css?v=<?php echo time(); ?>">
    <link rel="icon" href="favicon.png?v=<?php echo time(); ?>" type="image/png">
</head>
<body>

<div class="menu-wrapper">
    <button class="btn-menu" id="menuBtn" title="メニュー">☰</button>
    <div class="dropdown-menu" id="dropdownMenu">
        <a href="index.php" class="dropdown-item">部屋保持管理</a>
        <a href="log.php" class="dropdown-item">変更履歴ログ</a>
    </div>
</div>

<div class="settings-wrapper">
    <button class="btn-settings" id="settingsBtn" title="音量・通知設定">⚙️</button>
    <div class="settings-menu" id="settingsMenu">
        <div class="settings-item">
            <label class="mute-label">
                <input type="checkbox" id="muteCheckbox" class="mute-checkbox" checked>
                通知音をミュート
            </label>
        </div>
        <div class="settings-item">
            <label for="volumeSlider">通知音量</label>
            <div class="volume-row">
                <input type="range" id="volumeSlider" class="volume-slider" min="0" max="100" value="50">
                <span class="volume-value" id="volumeVal">50%</span>
            </div>
        </div>
        <div class="settings-item" id="desktopNotifyContainer" class="desktop-notify-container">
            <button id="notifyAuthBtn" class="btn-notify-auth">
                デスクトップ通知を許可する
            </button>
        </div>
    </div>
</div>

<div class="container">
    <h1>部屋保持管理</h1>
    
    <div id="status-container" style="display:none; margin-bottom: 20px; padding: 15px; background: #161b22; border: 1px solid #30363d; border-radius: 6px;">
        <div id="status-display"></div>
    </div>
    
    <button class="btn-refresh" onclick="forceRefresh()">手動で更新</button>
    
    <div id="dynamicContent">
        <div class="no-rooms"><p>読み込み中...</p></div>
    </div>
</div>

<script>
let lastJson = "";
let lastVersion = ""; // サーバー側のデータバージョンを管理する変数
let isFirstLoad = true; // 初回読み込み時の通知・音鳴りを防止するフラグ

// 🔊 音量設定とミュートの初期化ロジック
let isMute = localStorage.getItem('sound_mute') !== null ? (localStorage.getItem('sound_mute') === 'true') : true;
let currentVolume = localStorage.getItem('sound_volume') !== null ? parseInt(localStorage.getItem('sound_volume'), 10) : 50;

const settingsBtn = document.getElementById('settingsBtn');
const settingsMenu = document.getElementById('settingsMenu');
const muteCheckbox = document.getElementById('muteCheckbox');
const volumeSlider = document.getElementById('volumeSlider');
const volumeVal = document.getElementById('volumeVal');
const notifyAuthBtn = document.getElementById('notifyAuthBtn');
const desktopNotifyContainer = document.getElementById('desktopNotifyContainer');

// 🍔 ハンバーガーメニュー用の要素
const menuBtn = document.getElementById('menuBtn');
const dropdownMenu = document.getElementById('dropdownMenu');

muteCheckbox.checked = isMute;
volumeSlider.value = currentVolume;
volumeVal.innerText = currentVolume + "%";

// 📱 スマホ・タブレット判定ロジック
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

if (isMobile) {
    // スマホからのアクセスの場合は通知ブロックごと綺麗に非表示にする
    desktopNotifyContainer.style.display = 'none';
} else {
    // PC環境の場合のみ、ページ読み込み時に通知権限の状態を確認して同期
    if (Notification.permission === "granted") {
        notifyAuthBtn.innerText = "デスクトップ通知：許可済み";
        notifyAuthBtn.style.color = "#58a6ff";
        notifyAuthBtn.disabled = true;
    }
}

// 🍔 ハンバーガーメニューの開閉イベント
menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
    settingsMenu.classList.remove('show'); // ⚙️側が開いていたら閉じる
});

// ⚙️ 歯車メニューの開閉イベント
settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsMenu.classList.toggle('show');
    dropdownMenu.classList.remove('show'); // 🍔側が開いていたら閉じる
});

// 🗺️ 画面のどこかをクリックしたときにメニューを自動で閉じる
document.addEventListener('click', (e) => {
    if (!dropdownMenu.contains(e.target) && e.target !== menuBtn) {
        dropdownMenu.classList.remove('show');
    }
    if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) {
        settingsMenu.classList.remove('show');
    }
});

// 🔇 ミュート変更
muteCheckbox.addEventListener('change', (e) => {
    isMute = e.target.checked;
    localStorage.setItem('sound_mute', isMute);
});

// 🎚️ スライダー変更
volumeSlider.addEventListener('input', (e) => {
    currentVolume = parseInt(e.target.value, 10);
    volumeVal.innerText = currentVolume + "%";
    localStorage.setItem('sound_volume', currentVolume);
});

// 🔔 デスクトップ通知の許可を求めるイベント (PC環境のみ動作)
notifyAuthBtn.addEventListener('click', () => {
    if (isMobile) return;
    
    if (!("Notification" in window)) {
        alert("お使いのブラウザはデスクトップ通知に対応していません。");
        return;
    }
    
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            notifyAuthBtn.innerText = "デスクトップ通知：許可済み";
            notifyAuthBtn.style.color = "#58a6ff";
            notifyAuthBtn.disabled = true;
            new Notification("部屋保持管理", {
                body: "デスクトップ通知が有効になりました！",
                icon: "favicon.png"
            });
        } else {
            alert("通知が拒否されました。ブラウザのアドレスバーの鍵マークから許可してください。");
        }
    });
});

// 🖥️ Windowsデスクトップポップアップ通知を飛ばす関数
function sendDesktopNotification(title, message) {
    if (isMobile) return;

    if (Notification.permission === "granted") {
        new Notification(title, {
            body: message,
            icon: "favicon.png",
            tag: "room-update",  
            renotify: true       
        });
    }
}

// 🎵 短い通知音（電子音）を再生する関数
function playNotificationSound() {
    if (isMute) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const targetGain = (currentVolume / 100) * 0.1;
        if (targetGain <= 0) return;

        // 1回目の音
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, ctx.currentTime);
        gain1.gain.setValueAtTime(targetGain, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.08);

        // 2回目の音
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        gain2.gain.setValueAtTime(targetGain, ctx.currentTime + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.1);
        osc2.stop(ctx.currentTime + 0.18);
    } catch (e) {
        console.error("オーディオ再生エラー:", e);
    }
}

// 🔄 ロングポーリング通信ループ関数
function listenForUpdates() {
    fetch(`get_rooms.php?v=${lastVersion}&t=${new Date().getTime()}`)
        .then(response => {
            if (!response.ok) throw new Error("ネットワークエラー");
            return response.json();
        })
        .then(data => {
            if (data.status === "success") {
                const currentJson = JSON.stringify(data.rooms);
                
                // ⚡ データに変更があった場合の最速通知処理
                if (!isFirstLoad && currentJson !== lastJson && data.status === "success") {
                    playNotificationSound();
                    
                    const mainItem = data.rooms.find(r => r.room_number.toString() === "0");
                    if (mainItem && mainItem.display_text) {
                        const cleanText = mainItem.display_text.replace(/[\*_]/g, "");
                        sendDesktopNotification("部屋情報が更新されました", cleanText);
                    } else {
                        sendDesktopNotification("部屋情報が更新されました", "処理待ちの部屋はありません");
                    }
                }
                
                lastJson = currentJson;
                lastVersion = data.version;
                isFirstLoad = false;

                // HTML画面更新処理へデータを引き渡す
                renderDOM(data.rooms);
            }
            // 通信が完了したら、即座に次の待機リクエストを開始
            setTimeout(listenForUpdates, 10);
        })
        .catch(error => {
            console.error('同期エラー。5秒後に再試行します:', error);
            setTimeout(listenForUpdates, 5000);
        });
}

// 🔄 HTML描画ロジック
function renderDOM(roomsData) {
    const container = document.getElementById('dynamicContent');
    container.innerHTML = ""; 

    const actualRooms = roomsData.filter(r => r.room_number.toString() !== "0");

    if (actualRooms.length > 0 || roomsData.some(r => r.room_number.toString() === "0")) {
        
        const mainItem = roomsData.find(r => r.room_number.toString() === "0") || roomsData[0]; 

        const mainPanel = document.createElement('div');
        mainPanel.className = 'main-status-panel';

        let formattedMainText = "";
        if (mainItem && mainItem.display_text) {
            formattedMainText = escapeHtml(mainItem.display_text)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/_(.*?)_/g, '<em>$1</em>');
        } else {
            formattedMainText = "<span class='no-status-data'>待機ステータスデータがありません。</span>";
        }

        mainPanel.innerHTML = `
            <div class="main-status-title">ステータス</div>
            <div class="main-status-details">${formattedMainText}</div>
        `;
        container.appendChild(mainPanel);

        if (actualRooms.length > 0) {
            const gridTitle = document.createElement('div');
            gridTitle.className = 'rooms-grid-title';
            gridTitle.innerHTML = '部屋・保持状況 一覧';
            container.appendChild(gridTitle);

            const roomsGrid = document.createElement('div');
            roomsGrid.className = 'rooms-grid';

            let activeRoomNum = null; 
            const holderMap = {};     
            const orderedRoomNumbers = []; 

            if (mainItem && mainItem.display_text) {
                const textLines = mainItem.display_text.split('\n');
                textLines.forEach(line => {
                    const activeMatch = line.match(/次に処理する部屋：[\s\*_]*(\d+)/);
                    if (activeMatch) {
                        activeRoomNum = activeMatch[1];
                        orderedRoomNumbers.push(activeRoomNum); 
                    }

                    const holderMatch = line.match(/保持する部屋：[\s\*_]*(\d+)[\s\*_]*（保持者：[\s\*_]*(.*?)[\s\*_]*）/);
                    if (holderMatch) {
                        const roomNum = holderMatch[1];
                        const holderName = holderMatch[2].trim(); 
                        holderMap[roomNum] = holderName;
                        if (!orderedRoomNumbers.includes(roomNum)) {
                            orderedRoomNumbers.push(roomNum); 
                        }
                    }
                });
            }

            actualRooms.forEach(item => {
                const rNum = item.room_number.toString();
                if (!orderedRoomNumbers.includes(rNum)) {
                    orderedRoomNumbers.push(rNum);
                }
            });

            orderedRoomNumbers.forEach(roomNum => {
                if (roomNum === "0") return;

                const existsInDb = actualRooms.some(item => item.room_number.toString() === roomNum);
                if (!existsInDb) return;

                const card = document.createElement('div');
                card.className = 'room-column-card';

                let holderInfo = "保持者: <span>なし</span>";
                
                if (holderMap[roomNum]) {
                    holderInfo = `保持者: <span>${escapeHtml(holderMap[roomNum])}</span>`;
                }
                
                if (roomNum === activeRoomNum) {
                    holderInfo = `<strong>現在処理中</strong>`;
                }

                card.innerHTML = `
                    <div class="card-room-number">No. ${escapeHtml(roomNum)}</div>
                    <div class="card-room-holder">${holderInfo}</div>
                `;
                roomsGrid.appendChild(card);
            });

            container.appendChild(roomsGrid);
        }

    } else {
        container.innerHTML = `
            <div class="no-rooms">
                <p class="no-rooms-title">処理待ちの部屋はありません</p>
                <p class="no-rooms-desc">Discordの \`/tr\` コマンドで部屋を登録すると、自動的にここに反映されます。</p>
            </div>`;
    }
}

// 🔄 手動更新ボタン用関数
function forceRefresh() {
    lastVersion = ""; 
    fetch(`get_rooms.php?v=&t=${new Date().getTime()}`)
        .then(response => response.json())
        .then(data => {
            lastJson = JSON.stringify(data.rooms);
            lastVersion = data.version;
            renderDOM(data.rooms);
        });
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

// 最初の一回を起動
listenForUpdates();
</script>
</body>
</html>