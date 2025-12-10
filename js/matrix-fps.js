// MATRIX FPS TEST - CMatrix Style
// Save as: js/matrix-fps.js

// ===== CONFIGURATION =====
const CONFIG = {
    // Символы как в cmatrix
    chars: "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ012345789Z:.\"=*+-<>¦｜╌ç",
    
    desktop: {
        maxChars: 4000,
        fontSize: 16,
        spawnRate: 15,
        tailLength: 1, // МИНИМАЛЬНЫЙ шлейф
        speedMultiplier: 1.2
    },
    
    mobile: {
        maxChars: 800,
        fontSize: 14,
        spawnRate: 5,
        tailLength: 0, // БЕЗ шлейфа на мобилках
        speedMultiplier: 0.9
    },
    
    colors: ['#0F0', '#0F6', '#0C0', '#3F3'],
    gravity: 0.03
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

// ===== ТЕМЫ (ИСПРАВЛЕНО) =====
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

// ===== КЛАСС СИМВОЛА КАК В CMATRIX =====
class MatrixChar {
    constructor(x, y) {
        this.x = x || Math.random() * canvas.width;
        this.y = y || -20;
        this.char = CONFIG.chars[Math.floor(Math.random() * CONFIG.chars.length)];
        this.speed = (0.8 + Math.random() * 0.4) * currentConfig.speedMultiplier;
        this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
        this.size = currentConfig.fontSize;
        this.lifetime = 5000 + Math.random() * 5000;
        this.createdTime = Date.now();
        this.brightness = 0.7 + Math.random() * 0.3;
        
        // Минимальный хвост (0 или 1 позиция)
        this.tail = [];
        this.tailMax = currentConfig.tailLength;
    }
    
    update() {
        // Удаляем старые символы
        if (Date.now() - this.createdTime > this.lifetime) {
            return false;
        }
        
        // Добавляем в хвост (если разрешено)
        if (this.tailMax > 0) {
            this.tail.unshift({x: this.x, y: this.y});
            if (this.tail.length > this.tailMax) {
                this.tail.pop();
            }
        }
        
        // Движение
        this.y += this.speed;
        this.x += Math.sin(this.y * 0.01) * 0.2;
        
        // Выход за границы
        if (this.y > canvas.height + 30) {
            return false;
        }
        
        return true;
    }
    
    draw() {
        // Рисуем хвост (если есть)
        for (let i = 0; i < this.tail.length; i++) {
            const pos = this.tail[i];
            const opacity = 0.3 * (1 - i / this.tail.length);
            
            ctx.save();
            ctx.globalAlpha = opacity * this.brightness;
            ctx.fillStyle = this.color;
            ctx.font = `${this.size * 0.8}px 'Courier New'`;
            ctx.fillText(this.char, pos.x, pos.y);
            ctx.restore();
        }
        
        // Рисуем основной символ
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
    canvas.addEventListener('mousedown', startRapidAddition);
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
            case 'KeyA': addMultipleChars(5); break;
            case 'Escape': stopRapidAddition(); break;
        }
    });
}

// ===== УПРАВЛЕНИЕ СИМВОЛАМИ =====
function addMatrixChar(event = null) {
    if (matrixChars.length >= currentConfig.maxChars || isPaused) return;
    
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
    for (let i = 0; i < count; i++) {
        if (matrixChars.length >= currentConfig.maxChars) break;
        addMatrixChar();
    }
}

function startRapidAddition() {
    if (holdInterval || isPaused) return;
    holdInterval = setInterval(() => {
        addMultipleChars(currentConfig.spawnRate);
    }, deviceType === 'mobile' ? 120 : 60);
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
    
    // Добавить пару символов для демо
    setTimeout(() => {
        for (let i = 0; i < 2; i++) {
            setTimeout(() => addMatrixChar(), i * 200);
        }
    }, 300);
}

function togglePause() {
    isPaused = !isPaused;
    const btn = document.querySelectorAll('.control-btn')[1];
    btn.textContent = isPaused ? 'RESUME' : 'PAUSE';
}

// ===== СМЕНА ТЕМЫ (ИСПРАВЛЕНО) =====
function changeTheme() {
    currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
    applyTheme(THEMES[currentThemeIndex]);
}

function applyTheme(theme) {
    // Применяем тему к странице
    document.body.style.backgroundColor = theme.bg;
    document.body.style.color = theme.color;
    
    // Применяем к элементам интерфейса
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
    
    // Применяем к кнопкам
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.style.borderColor = theme.color;
        btn.style.color = theme.color;
        btn.style.background = theme.bg.replace(')', ', 0.8)').replace('rgb', 'rgba');
    });
    
    // Обновляем цвета символов
    const hue = getHueFromColor(theme.color);
    CONFIG.colors = [
        theme.color,
        adjustColor(theme.color, 30),
        adjustColor(theme.color, 60),
        adjustColor(theme.color, 90)
    ];
    
    // Обновляем название режима
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
    document.getElementById('charsCount').textContent = matrixChars.length;
    document.getElementById('fpsValue').textContent = Math.round(fps);
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
    }
    
    if (!isPaused) {
        // Очистка с лёгким затемнением
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Обновление символов
        const newChars = [];
        for (let i = 0; i < matrixChars.length; i++) {
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
        for (let i = 0; i < 2; i++) {
            setTimeout(() => addMatrixChar(), i * 200);
        }
    }, 300);
};

// ===== ЗАПУСК =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMatrix);
} else {
    initMatrix();
}
