// MATRIX FPS TEST - Clean Version
// Save as: js/matrix-fps.js

// ===== CONFIGURATION =====
const CONFIG = {
    // Символы как в cmatrix
    chars: "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ012345789Z:.\"=*+-<>¦｜╌ç",
    
    desktop: {
        fontSize: 16,
        spawnRate: 25,
        speedMultiplier: 1.2,
        autoCleanup: true
    },
    
    mobile: {
        fontSize: 14,
        spawnRate: 15,
        speedMultiplier: 0.9,
        autoCleanup: true
    },
    
    colors: ['#0F0', '#0F6', '#0C0', '#3F3'],
    gravity: 0.03,
    performanceMode: true
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

// ===== КЛАСС СИМВОЛА (БЕЗ ШЛЕЙФА, ПРЯМОЕ ПАДЕНИЕ) =====
class MatrixChar {
    constructor(x, y) {
        this.x = x || Math.random() * canvas.width;
        this.y = y || -20;
        this.char = CONFIG.chars[Math.floor(Math.random() * CONFIG.chars.length)];
        this.speed = (0.8 + Math.random() * 0.4) * currentConfig.speedMultiplier;
        this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
        this.size = currentConfig.fontSize;
        this.lifetime = 8000 + Math.random() * 7000;
        this.createdTime = Date.now();
        this.brightness = 0.8 + Math.random() * 0.2;
        
        // БЕЗ ШЛЕЙФА ВООБЩЕ
        this.tail = null;
        this.tailMax = 0;
    }
    
    update() {
        // Автоочистка
        if (currentConfig.autoCleanup && Date.now() - this.createdTime > this.lifetime) {
            return false;
        }
        
        // ПРЯМОЕ ПАДЕНИЕ ВНИЗ - никаких волн
        this.y += this.speed;
        
        // Выход за границы
        if (this.y > canvas.height + 100) {
            return false;
        }
        
        return true;
    }
    
    draw() {
        // ТОЛЬКО ОДИН СИМВОЛ - без шлейфа
        ctx.save();
        ctx.globalAlpha = this.brightness;
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size}px 'Courier New'`;
        ctx.fillText(this.char, this.x, this.y);
        ctx.restore();
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
function initMatrix() {
    canvas = document.getElementById('matrixCanvas');
    ctx = canvas.getContext('2d', { alpha: false });
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    setupEventListeners();
    applyTheme(THEMES[currentThemeIndex]);
    requestAnimationFrame(animate);
    
    console.log('Matrix Test - CLEAN MODE (no trails)');
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function setupEventListeners() {
    // Клик
    canvas.addEventListener('click', (e) => {
        if (!isPaused) addMatrixChar(e);
    });
    
    // Удержание
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
            case 'KeyA': addMultipleChars(50); break;
            case 'KeyQ': addMultipleChars(200); break;
            case 'Escape': stopRapidAddition(); break;
        }
    });
}

// ===== УПРАВЛЕНИЕ СИМВОЛАМИ =====
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
    
    matrixChars.push(new MatrixChar(x, y));
    updateInfoPanel();
}

function addMultipleChars(count) {
    if (isPaused) return;
    
    const batchSize = 100;
    const batches = Math.ceil(count / batchSize);
    
    for (let b = 0; b < batches; b++) {
        setTimeout(() => {
            const charsToAdd = Math.min(batchSize, count - (b * batchSize));
            for (let i = 0; i < charsToAdd; i++) {
                addMatrixChar();
            }
        }, b * 10);
    }
}

function startRapidAddition() {
    if (holdInterval || isPaused) return;
    
    const addSpeed = deviceType === 'mobile' ? 80 : 150;
    
    holdInterval = setInterval(() => {
        const batch = deviceType === 'mobile' ? 8 : 15;
        addMultipleChars(batch);
    }, 1000 / addSpeed);
}

function stopRapidAddition() {
    if (holdInterval) {
        clearInterval(holdInterval);
        holdInterval = null;
    }
}

// ===== ОПТИМИЗАЦИЯ ПАМЯТИ =====
function optimizeMemory() {
    if (matrixChars.length > 10000) {
        const removeCount = Math.floor(matrixChars.length * 0.1);
        matrixChars = matrixChars.slice(removeCount);
        console.log(`Memory optimized: removed ${removeCount} old symbols`);
    }
}

// ===== УПРАВЛЕНИЕ ТЕСТОМ =====
function resetTest() {
    matrixChars = [];
    testStartTime = Date.now();
    updateInfoPanel();
    
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
    
    const hue = getHueFromColor(theme.color);
    CONFIG.colors = [
        theme.color,
        adjustColor(theme.color, 30),
        adjustColor(theme.color, 60),
        adjustColor(theme.color, 90)
    ];
    
    document.getElementById('testMode').textContent = theme.name;
}

function getHueFromColor(color) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    
    let hue = 0;
    if (max === min) {
        hue = 0;
    } else if (max === r) {
        hue = ((g - b) / (max - min)) % 6;
    } else if (max === g) {
        hue = (2 + (b - r) / (max - min)) % 6;
    } else {
        hue = (4 + (r - g) / (max - min)) % 6;
    }
    
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
    
    return hue;
}

function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);
    
    r = Math.min(255, Math.max(0, r + amount));
    g = Math.min(255, Math.max(0, g + amount));
    b = Math.min(255, Math.max(0, b + amount));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ===== ОБНОВЛЕНИЕ ИНФО ПАНЕЛИ =====
function updateInfoPanel() {
    document.getElementById('charsCount').textContent = matrixChars.length.toLocaleString();
    document.getElementById('fpsValue').textContent = Math.round(fps);
    
    if (matrixChars.length > 5000) {
        document.getElementById('testMode').textContent = 'HEAVY';
    }
}

// ===== ГЛАВНЫЙ ЦИКЛ =====
function animate(currentTime) {
    frameCount++;
    
    if (!fpsUpdateTime) fpsUpdateTime = currentTime;
    const deltaTime = currentTime - fpsUpdateTime;
    
    if (deltaTime >= 500) {
        fps = Math.round((frameCount * 1000) / deltaTime);
        fpsUpdateTime = currentTime;
        frameCount = 0;
        updateInfoPanel();
        
        if (matrixChars.length > 8000) {
            optimizeMemory();
        }
    }
    
    if (!isPaused) {
        // Очистка
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Обновление символов
        const newChars = [];
        const length = matrixChars.length;
        
        for (let i = 0; i < length; i++) {
            const char = matrixChars[i];
            if (char.update()) {
                char.draw();
                newChars.push(char);
            }
        }
        
        matrixChars = newChars;
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
