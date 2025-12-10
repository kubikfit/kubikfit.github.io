// MATRIX FPS TEST - Ultra Clean Version
// Save as: js/matrix-fps.js

// ===== CONFIGURATION =====
const CONFIG = {
    // Символы как в cmatrix
    chars: "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ012345789Z:.\"=*+-<>¦｜╌ç",
    
    desktop: {
        fontSize: 18,
        spawnRate: 30, // Ещё быстрее
        speedMultiplier: 1.5
    },
    
    mobile: {
        fontSize: 16,
        spawnRate: 20,
        speedMultiplier: 1.2
    },
    
    colors: ['#0F0', '#0F6', '#0C0', '#3F3']
};

// ===== GLOBAL VARIABLES =====
let canvas, ctx;
let matrixChars = [];
let fps = 0;
let frameCount = 0;
let fpsUpdateTime = 0;
let isPaused = false;
let holdInterval = null;
let testStartTime = Date.now();
let deviceType = 'desktop';
let currentConfig = CONFIG.desktop;
let currentThemeIndex = 0;

// ===== ТЕМЫ =====
const THEMES = [
    { bg: '#000000', color: '#0F0', name: 'MATRIX' },
    { bg: '#0a0a2a', color: '#00ffff', name: 'CYBER' },
    { bg: '#1a001a', color: '#ff00ff', name: 'NEON' },
    { bg: '#002a00', color: '#00ff00', name: 'GREEN' },
    { bg: '#2a0000', color: '#ff4444', name: 'RED' },
    { bg: '#00002a', color: '#4444ff', name: 'BLUE' }
];

// ===== УСТАНОВКА УСТРОЙСТВА =====
function setDeviceType(type) {
    deviceType = type;
    currentConfig = type === 'mobile' ? CONFIG.mobile : CONFIG.desktop;
    
    document.getElementById('testMode').textContent = 
        deviceType === 'mobile' ? 'CPU' : 'GPU';
}

// ===== КЛАСС СИМВОЛА (АБСОЛЮТНО БЕЗ ШЛЕЙФА) =====
class MatrixChar {
    constructor(x, y) {
        this.x = x || Math.random() * canvas.width;
        this.y = y || -20;
        this.char = CONFIG.chars[Math.floor(Math.random() * CONFIG.chars.length)];
        this.speed = (1.0 + Math.random() * 0.5) * currentConfig.speedMultiplier;
        this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
        this.size = currentConfig.fontSize;
        this.createdTime = Date.now();
        this.brightness = 0.9 + Math.random() * 0.1; // Всегда яркие
    }
    
    update() {
        // НИКАКОЙ АВТООЧИСТКИ - символы остаются навсегда
        // ПРЯМОЕ ПАДЕНИЕ ВНИЗ
        this.y += this.speed;
        
        // Если ушёл за нижнюю границу - возвращаем наверх
        if (this.y > canvas.height + 50) {
            this.y = -20;
            this.x = Math.random() * canvas.width;
            this.char = CONFIG.chars[Math.floor(Math.random() * CONFIG.chars.length)];
            this.speed = (1.0 + Math.random() * 0.5) * currentConfig.speedMultiplier;
        }
        
        return true; // ВСЕГДА true - никогда не удаляем
    }
    
    draw() {
        // АБСОЛЮТНО ЧЁТКИЙ СИМВОЛ - никакого размытия, никакого шлейфа
        ctx.save();
        ctx.globalAlpha = 1.0; // Полная непрозрачность
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size}px 'Courier New', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // ЧЁТКИЙ контур для видимости
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText(this.char, this.x, this.y);
        
        // Основной символ
        ctx.fillText(this.char, this.x, this.y);
        ctx.restore();
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
function initMatrix() {
    canvas = document.getElementById('matrixCanvas');
    ctx = canvas.getContext('2d', { alpha: true }); // Включаем альфа для чёткости
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    setupEventListeners();
    applyTheme(THEMES[currentThemeIndex]);
    requestAnimationFrame(animate);
    
    console.log('Matrix Test - ULTRA CLEAN (no trails, no limits)');
}

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
}

function setupEventListeners() {
    // Клик
    canvas.addEventListener('click', (e) => {
        if (!isPaused) addMatrixChar(e);
    });
    
    // Удержание - СУПЕР АГРЕССИВНО
    canvas.addEventListener('mousedown', () => {
        if (!isPaused) startRapidAddition();
    });
    
    canvas.addEventListener('mouseup', stopRapidAddition);
    canvas.addEventListener('mouseleave', stopRapidAddition);
    
    // Тач
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!isPaused) {
            startRapidAddition();
            if (e.touches[0]) {
                addMatrixChar({clientX: e.touches[0].clientX, clientY: e.touches[0].clientY});
            }
        }
    }, { passive: false });
    
    canvas.addEventListener('touchend', stopRapidAddition);
    canvas.addEventListener('touchcancel', stopRapidAddition);
    
    // Клавиши
    document.addEventListener('keydown', (e) => {
        switch(e.code) {
            case 'Space': togglePause(); break;
            case 'KeyR': resetTest(); break;
            case 'KeyA': addMultipleChars(100); break;
            case 'KeyQ': addMultipleChars(500); break;
            case 'KeyW': addMultipleChars(1000); break;
            case 'Escape': stopRapidAddition(); break;
        }
    });
}

// ===== УПРАВЛЕНИЕ СИМВОЛАМИ (БЕЗ ВСЯКИХ ОГРАНИЧЕНИЙ) =====
function addMatrixChar(event = null) {
    if (isPaused) return;
    
    let x, y;
    if (event) {
        x = event.clientX || event.pageX;
        y = event.clientY || event.pageY;
    } else {
        x = Math.random() * canvas.width;
        y = -20;
    }
    
    // НИКАКИХ ПРОВЕРОК НА ЛИМИТ - добавляем всегда
    matrixChars.push(new MatrixChar(x, y));
    
    updateInfoPanel();
}

function addMultipleChars(count) {
    if (isPaused) return;
    
    // Добавляем ВСЕ СРАЗУ без задержек
    for (let i = 0; i < count; i++) {
        addMatrixChar();
    }
}

function startRapidAddition() {
    if (holdInterval || isPaused) return;
    
    // МАКСИМАЛЬНО АГРЕССИВНО
    const addSpeed = deviceType === 'mobile' ? 120 : 200; // символов в секунду
    
    holdInterval = setInterval(() => {
        const batch = deviceType === 'mobile' ? 12 : 20;
        addMultipleChars(batch);
    }, 1000 / addSpeed);
}

function stopRapidAddition() {
    if (holdInterval) {
        clearInterval(holdInterval);
        holdInterval = null;
    }
}

// ===== УПРАВЛЕНИЕ ТЕСТОМ =====
function resetTest() {
    matrixChars = [];
    testStartTime = Date.now();
    updateInfoPanel();
    
    // Добавить для демо
    setTimeout(() => {
        addMultipleChars(5);
    }, 300);
}

function togglePause() {
    isPaused = !isPaused;
    const btn = document.querySelectorAll('.control-btn')[1];
    btn.textContent = isPaused ? 'RESUME' : 'PAUSE';
}

// ===== СМЕНА ТЕМЫ =====
function changeTheme() {
    currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
    applyTheme(THEMES[currentThemeIndex]);
}

function applyTheme(theme) {
    document.body.style.backgroundColor = theme.bg;
    document.body.style.color = theme.color;
    
    const elements = ['#infoPanel', '#deviceBadge', '#controls', '#instructions'];
    elements.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
            el.style.borderColor = theme.color;
            if (selector !== '#infoPanel' && selector !== '#deviceBadge') {
                el.style.background = theme.bg.replace(')', ', 0.9)').replace('rgb', 'rgba');
            }
        }
    });
    
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.style.borderColor = theme.color;
        btn.style.color = theme.color;
        btn.style.background = theme.bg.replace(')', ', 0.8)').replace('rgb', 'rgba');
    });
    
    // Обновляем цвета символов
    const hex = theme.color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Создаём 4 оттенка основного цвета
    CONFIG.colors = [
        theme.color,
        `rgb(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)})`,
        `rgb(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)})`,
        `rgb(${Math.min(255, r + 90)}, ${Math.min(255, g + 90)}, ${Math.min(255, b + 90)})`
    ];
    
    document.getElementById('testMode').textContent = theme.name;
}

// ===== ОБНОВЛЕНИЕ ИНФО ПАНЕЛИ =====
function updateInfoPanel() {
    document.getElementById('charsCount').textContent = matrixChars.length.toLocaleString();
    document.getElementById('fpsValue').textContent = Math.round(fps);
    
    // Статус нагрузки
    if (matrixChars.length > 10000) {
        document.getElementById('testMode').textContent = 'EXTREME';
    } else if (matrixChars.length > 5000) {
        document.getElementById('testMode').textContent = 'HEAVY';
    } else if (matrixChars.length > 1000) {
        document.getElementById('testMode').textContent = 'MEDIUM';
    }
}

// ===== ГЛАВНЫЙ ЦИКЛ (МАКСИМАЛЬНО ПРОИЗВОДИТЕЛЬНЫЙ) =====
function animate(currentTime) {
    frameCount++;
    
    if (!fpsUpdateTime) fpsUpdateTime = currentTime;
    const deltaTime = currentTime - fpsUpdateTime;
    
    if (deltaTime >= 1000) { // Раз в секунду для точности
        fps = Math.round((frameCount * 1000) / deltaTime);
        fpsUpdateTime = currentTime;
        frameCount = 0;
        updateInfoPanel();
    }
    
    if (!isPaused) {
        // ПОЛНАЯ ОЧИСТКА КАЖДЫЙ КАДР - никакого размытия
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Рисуем ВСЕ символы
        const length = matrixChars.length;
        for (let i = 0; i < length; i++) {
            const char = matrixChars[i];
            char.update();
            char.draw();
        }
    }
    
    requestAnimationFrame(animate);
}

// ===== ПУБЛИЧНЫЙ API =====
window.addMatrixChar = addMatrixChar;
window.addMultipleChars = addMultipleChars;
window.resetTest = resetTest;
window.togglePause = togglePause;
window.changeTheme = changeTheme;
window.setDeviceType = setDeviceType;
window.startTest = function() {
    document.getElementById('instructions').style.display = 'none';
    localStorage.setItem('matrixTestVisited', 'true');
    
    setTimeout(() => {
        addMultipleChars(3);
    }, 300);
};

// ===== ЗАПУСК =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMatrix);
} else {
    initMatrix();
}
