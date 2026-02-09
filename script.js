/* script.js */
const DATA_URL = './data.json'; 

// データ取得
async function loadGlobalData() {
    try {
        const res = await fetch(`${DATA_URL}?t=${new Date().getTime()}`);
        return await res.json();
    } catch (e) {
        console.error("Data load failed", e);
        return { timeSettings: [], schedules: {}, tests: [] };
    }
}

// --- 生徒画面用ロジック ---
let fetchedData = null;
let currentClass = localStorage.getItem('userClass') || '21HR';

async function renderHome() {
    fetchedData = await loadGlobalData();
    const classDisplay = document.getElementById('userClassDisplay');
    if(classDisplay) {
        // 現在のクラスを表示
        classDisplay.innerHTML = `<i class="fas fa-users"></i> <span>${currentClass}</span>`;
    }
    renderSchedule();
    updateNextClass();
    updateTestCountdown();
    
    setInterval(() => {
        updateNextClass();
        updateTestCountdown();
        renderSchedule(); 
    }, 60000);
}

// 時計
function initClock() {
    const timeEl = document.getElementById('clockTime');
    const dateEl = document.getElementById('clockDate');
    const update = () => {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        dateEl.textContent = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    };
    setInterval(update, 1000);
    update();
}

// 時間割
function renderSchedule() {
    const list = document.getElementById('scheduleList');
    if(!list) return;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const dayKey = days[now.getDay()];
    const scheduleData = fetchedData.schedules[currentClass] || {};
    const todaySubjects = scheduleData[dayKey];
    
    document.getElementById('scheduleDay').textContent = now.toLocaleDateString('ja-JP', {weekday:'long'});
    list.innerHTML = '';
    
    if(!todaySubjects || todaySubjects.length === 0) {
        list.innerHTML = '<li style="padding:20px; text-align:center;">本日は授業がありません</li>';
        return;
    }

    const nowMin = now.getHours() * 60 + now.getMinutes();

    todaySubjects.forEach((sub, i) => {
        if(!sub) return;
        const periodSetting = fetchedData.timeSettings[i];
        if(!periodSetting) return;

        const li = document.createElement('li');
        li.className = 'schedule-item';
        
        const [sH, sM] = periodSetting.start.split(':').map(Number);
        const [eH, eM] = periodSetting.end.split(':').map(Number);
        const startMin = sH * 60 + sM;
        const endMin = eH * 60 + eM;

        if (nowMin >= startMin && nowMin <= endMin) {
            li.classList.add('current-class');
            li.innerHTML = `
                <div class="period-num">${i + 1}</div>
                <div class="subject-name" style="display:flex; align-items:center;">
                    ${sub} <span class="current-badge">NOW</span>
                </div>
                <div class="schedule-time">${periodSetting.start} - ${periodSetting.end}</div>
            `;
        } else {
            li.innerHTML = `
                <div class="period-num">${i + 1}</div>
                <div class="subject-name">${sub}</div>
                <div class="schedule-time">${periodSetting.start} - ${periodSetting.end}</div>
            `;
        }
        list.appendChild(li);
    });
}

// 次の授業
function updateNextClass() {
    const elSub = document.getElementById('nextClassSubject');
    const elTime = document.getElementById('nextClassTime');
    if(!elSub) return;

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayKey = days[now.getDay()];
    const scheduleData = fetchedData.schedules[currentClass] || {};
    const todaySubjects = scheduleData[dayKey];

    if(!todaySubjects) {
        elSub.textContent = "授業なし";
        elTime.textContent = "";
        return;
    }

    let found = false;
    for(let i=0; i<fetchedData.timeSettings.length; i++) {
        const time = fetchedData.timeSettings[i];
        const [sH, sM] = time.start.split(':').map(Number);
        const startTotal = sH * 60 + sM;

        if (startTotal > currentMins) {
            const subName = todaySubjects[i];
            if(subName) {
                elSub.textContent = subName;
                const diff = startTotal - currentMins;
                elTime.textContent = `${time.start}開始 (${diff}分後)`;
                found = true;
                break;
            }
        }
    }
    if(!found) {
        elSub.textContent = "放課後";
        elTime.textContent = "本日の授業は終了しました";
    }
}

// テストカウントダウン
function updateTestCountdown() {
    const elName = document.getElementById('testName');
    const elTimer = document.getElementById('testTimer');
    if(!elName) return;

    const now = new Date();
    const futureTests = fetchedData.tests
        .map(t => ({...t, dateObj: new Date(t.date)}))
        .filter(t => t.dateObj > now)
        .sort((a,b) => a.dateObj - b.dateObj);

    if(futureTests.length === 0) {
        elName.textContent = "予定なし";
        elTimer.textContent = "";
        return;
    }
    const target = futureTests[0];
    elName.textContent = target.name;
    const diff = target.dateObj - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    elTimer.textContent = `あと ${days + 1} 日`;
}

// ToDo
function initTodo() {
    const input = document.getElementById('newTodo');
    const btn = document.getElementById('addTodoBtn');
    const list = document.getElementById('todoList');
    const countEl = document.getElementById('todoCount');
    const progressEl = document.getElementById('todoProgressBar');
    
    if(!list) return;

    const render = () => {
        const todos = JSON.parse(localStorage.getItem('todos') || '[]');
        list.innerHTML = '';
        
        let doneCount = 0;
        todos.forEach((todo, i) => {
            if(todo.done) doneCount++;
            const li = document.createElement('li');
            li.className = `todo-item ${todo.done ? 'done' : ''}`;
            li.innerHTML = `
                <input type="checkbox" ${todo.done ? 'checked' : ''} onchange="toggleTodo(${i})">
                <span>${todo.text}</span>
                <button onclick="removeTodo(${i})" style="margin-left:auto; border:none; background:none; color:#ccc; cursor:pointer;">×</button>
            `;
            list.appendChild(li);
        });

        const total = todos.length;
        const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);
        countEl.textContent = `${doneCount}/${total} 完了`;
        progressEl.style.width = `${percent}%`;
    };

    btn.onclick = () => {
        if(!input.value) return;
        const todos = JSON.parse(localStorage.getItem('todos') || '[]');
        todos.push({text: input.value, done: false});
        localStorage.setItem('todos', JSON.stringify(todos));
        input.value = '';
        render();
    };

    window.toggleTodo = (i) => {
        const todos = JSON.parse(localStorage.getItem('todos') || '[]');
        todos[i].done = !todos[i].done;
        localStorage.setItem('todos', JSON.stringify(todos));
        render();
    };
    window.removeTodo = (i) => {
        const todos = JSON.parse(localStorage.getItem('todos') || '[]');
        todos.splice(i, 1);
        localStorage.setItem('todos', JSON.stringify(todos));
        render();
    };
    render();
}

// カレンダー (CSSで高さ制御するため、iframeは100%)
function renderCalendar() {
    const area = document.getElementById('calendarArea');
    if(!area) return;
    
    const url = localStorage.getItem('calEmbedUrl');
    if(url) {
        area.innerHTML = `<iframe src="${url}" style="border:0" width="100%" height="100%" frameborder="0" scrolling="no"></iframe>`;
    }
}

// ポモドーロ
let pomoInterval;
let pomoDuration = 25; 
let timeLeft = 25 * 60;
let isRunning = false;

function initPomodoro() {
    const saved = localStorage.getItem('pomoDuration');
    if(saved) pomoDuration = parseInt(saved);

    const timerDisplay = document.getElementById('pomoTimer');
    const btn = document.getElementById('pomoBtn');
    if(!timerDisplay) return;

    timeLeft = pomoDuration * 60;
    updatePomoDisplay(timerDisplay);

    btn.onclick = () => {
        if(isRunning) {
            clearInterval(pomoInterval);
            isRunning = false;
            btn.innerHTML = '<i class="fas fa-play"></i> 再開';
        } else {
            isRunning = true;
            btn.innerHTML = '<i class="fas fa-pause"></i> 一時停止';
            pomoInterval = setInterval(() => {
                if(timeLeft > 0) {
                    timeLeft--;
                    updatePomoDisplay(timerDisplay);
                } else {
                    clearInterval(pomoInterval);
                    alert('集中時間終了！');
                    resetPomo();
                }
            }, 1000);
        }
    };
}

function updatePomoDisplay(el) {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    el.textContent = `${m}:${s}`;
}

function resetPomo() {
    const btn = document.getElementById('pomoBtn');
    timeLeft = pomoDuration * 60;
    isRunning = false;
    btn.innerHTML = '<i class="fas fa-play"></i> 開始';
    updatePomoDisplay(document.getElementById('pomoTimer'));
}

window.openPomoModal = () => {
    document.getElementById('pomoDurationInput').value = pomoDuration;
    document.getElementById('pomoModal').classList.add('active');
};
window.closePomoModal = () => {
    document.getElementById('pomoModal').classList.remove('active');
};
window.savePomoSetting = () => {
    const val = document.getElementById('pomoDurationInput').value;
    if(val > 0) {
        pomoDuration = parseInt(val);
        localStorage.setItem('pomoDuration', pomoDuration);
        clearInterval(pomoInterval);
        resetPomo();
        closePomoModal();
    }
};
