// MATRIX FPS TEST - Optimized Version
// Save as: js/matrix-fps.js

// ===== CONFIGURATION =====
const CONFIG = {
    // Разные настройки для разных устройств
    desktop: {
        chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~",
        maxChars: 5000,
        fontSize: 18,
        spawnRate: 20,
        tailLength: 3, // Уменьшенный шлейф
        speedMultiplier: 1.5
    },
    mobile: {
        chars: "01",
        maxChars: 1000,
        fontSize: 14,
        spawnRate: 5,
        tailLength: 1, // Минимальный шлейф для мобилок
        speedMultiplier: 0.8
    },
    
    // Общие настройки
    colors: ['#00FF00', '#00FF41', '#39FF14', '#32CD32'],
    gravity: 0.05,
    glowIntensity: 8
};

// ===== GLOBAL VARIABLES =====
let canvas, ctx;
let matrixChars = [];
let fps = 0;
let lastTime = 0;
let frameCount = 0;
let fpsUpdateTime = 0;
let isPaused = false;
let holdInterval = null;
let testStartTime = Date.now();
let deviceType = 'desktop';
let currentConfig = CONFIG.desktop;
let renderMode = 'gpu'; // 'gpu' или 'cpu'

// ===== DEVICE DETECTION =====
function setDeviceType(type) {
    deviceType = type;
    currentConfig = type === 'mobile' ? CONFIG.mobile : CONFIG.desktop;
    renderMode = type === 'mobile' ? 'cpu' : 'gpu';
    
    console.log(`Device: ${deviceType}, Mode: ${renderMode}, Max chars: ${currentConfig.maxChars}`);
    
    // Обновляем заголовок
    document.getElementById('testMode').textContent = 
        renderMode === 'gpu' ? 'GPU Stress' : 'CPU Stress';
}

// ===== MATRIX CHARACTER CLASS (ОПТИМИЗИРОВАННЫЙ) =====
class MatrixChar {
    constructor(x, y) {
        this.x = x || Math.random() * canvas.width;
        this.y = y || -30;
        this.char = currentConfig.chars[Math.floor(Math.random() * currentConfig.chars.length)];
        this.speed = (1 + Math.random() * 0.5) * currentConfig.speedMultiplier;
        this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
        this.size = currentConfig.fontSize + Math.random() * 4;
        this.tail = [];
        this.tailMax = currentConfig.tailLength;
        this.createdTime = Date.now();
        this.lifetime = 8000 + Math.random() * 7000; // Время жизни символа
    }
    
    update() {
        // Убираем старые символы
        if (Date.now() - this.createdTime > this.lifetime) {
            return false;
        }
        
        // Добавляем позицию в хвост (упрощённый вариант)
        this.tail.unshift({x: this.x, y: this.y});
        if (this.tail.length > this.tailMax) {
            this.tail.pop();
        }
        
        // Движение
        this.y += this.speed;
        
        // Немного горизонтального движения для GPU теста
        if (renderMode === 'gpu') {
            this.x += Math.sin(this.y * 0.01) * 0.3;
        }
        
        // Выход за границы
        if (this.y > canvas.height + 50 || this.x < -50 || this.x > canvas.width + 50) {
            return false;
        }
        
        return true;
    }
    
    draw() {
        // Рисуем хвост (упрощённо)
        for (let i = 0; i < this.tail.length; i++) {
            const pos = this.tail[i];
            const opacity = 0.3 * (1 - i / this.tail.length);
            
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.fillStyle = this.color;
            ctx.font = `${this.size * 0.7}px 'Courier New'`;
            ctx.fillText(this.char, pos.x, pos.y);
            ctx.restore();
        }
        
        // Рисуем основной символ
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size}px 'Courier New'`;
        
        if (renderMode === 'gpu') {
            // GPU-интенсивные эффекты только для десктопов
            ctx.shadowColor = this.color;
            ctx.shadowBlur = CONFIG.glowIntensity;
        }
        
        ctx.fillText(this.char, this.x, this.y);
        ctx.restore();
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
function initMatrix() {
    canvas = document.getElementById('matrixCanvas');
    ctx = canvas.getContext('2d', { alpha: false }); // Отключаем альфа-канал для производительности
    
    // Определяем устройство если ещё не определили
    if (!deviceType) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        setDeviceType(isMobile ? 'mobile' : 'desktop');
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    setupEventListeners();
    requestAnimationFrame(animate);
    
    console.log('Matrix Test initialized in', renderMode, 'mode');
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function setupEventListeners() {
    // Клик для добавления символов
    canvas.addEventListener('click', (e) => {
        if (isPaused) return;
        addMatrixChar(e);
    });
    
    // Удержание для быстрого добавления
    canvas.addEventListener('mousedown', startRapidAddition);
    canvas.addEventListener('mouseup', stopRapidAddition);
    canvas.addEventListener('mouseleave', stopRapidAddition);
    
    // Тач-события для мобилок
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (isPaused) return;
        startRapidAddition();
        if (e.touches[0]) {
            addMatrixChar({clientX: e.touches[0].clientX, clientY: e.touches[0].clientY});
        }
    }, { passive: false });
    
    canvas.addEventListener('touchend', stopRapidAddition);
    canvas.addEventListener('touchcancel', stopRapidAddition);
    
    // Клавиатура
    document.addEventListener('keydown', (e) => {
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                togglePause();
                break;
            case 'KeyR':
                resetTest();
                break;
            case 'KeyA':
                addMultipleChars(10);
                break;
            case 'Escape':
                stopRapidAddition();
                break;
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
        y = -30;
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
    }, deviceType === 'mobile' ? 100 : 50); // Медленнее на мобилках
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
    document.getElementById('statusValue').textContent = 'Reset';
    
    // Добавляем один символ для демонстрации
    setTimeout(() => addMatrixChar(), 300);
}

function togglePause() {
    isPaused = !isPaused;
    const btn = document.querySelectorAll('.control-btn')[1];
    btn.textContent = isPaused ? 'RESUME' : 'PAUSE';
    document.getElementById('statusValue').textContent = isPaused ? 'Paused' : 'Running';
}

function changeTheme() {
    const themes = [
        { bg: '#000000', color: '#00FF00', name: 'Matrix' },
        { bg: '#0a0a2a', color: '#00ffff', name: 'Cyber' },
        { bg: '#1a001a', color: '#ff00ff', name: 'Neon' },
        { bg: '#002a00', color: '#00ff00', name: 'Forest' }
    ];
    
    const currentBg = document.body.style.backgroundColor || '#000000';
    let nextIndex = themes.findIndex(t => t.bg === currentBg);
    nextIndex = (nextIndex + 1) % themes.length;
    
    const theme = themes[nextIndex];
    document.body.style.backgroundColor = theme.bg;
    document.body.style.color = theme.color;
    
    document.querySelectorAll('#infoPanel, #controls, #instructions').forEach(el => {
        el.style.borderColor = theme.color;
    });
    
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.style.borderColor = theme.color;
        btn.style.color = theme.color;
    });
    
    CONFIG.colors = [theme.color];
    document.getElementById('testMode').textContent = theme.name + ' ' + (renderMode === 'gpu' ? 'GPU' : 'CPU');
}

// ===== ОБНОВЛЕНИЕ ИНФОРМАЦИИ =====
function updateInfoPanel() {
    document.getElementById('charsCount').textContent = matrixChars.length;
    document.getElementById('fpsValue').textContent = Math.round(fps);
    document.getElementById('timeValue').textContent = Math.floor((Date.now() - testStartTime) / 1000);
    
    // Статус в зависимости от FPS
    let status = 'Good';
    if (matrixChars.length === 0) {
        status = 'Ready';
    } else if (fps < 10) {
        status = 'Heavy Load';
    } else if (fps < 30) {
        status = 'Medium Load';
    } else if (fps < 50) {
        status = 'Light Load';
    }
    document.getElementById('statusValue').textContent = status;
}

// ===== ОСНОВНОЙ ЦИКЛ (ОПТИМИЗИРОВАННЫЙ) =====
function animate(currentTime) {
    // Считаем FPS
    frameCount++;
    if (!fpsUpdateTime) fpsUpdateTime = currentTime;
    
    const deltaTime = currentTime - fpsUpdateTime;
    if (deltaTime >= 500) { // Обновляем FPS каждые 500мс
        fps = Math.round((frameCount * 1000) / deltaTime);
        fpsUpdateTime = currentTime;
        frameCount = 0;
        updateInfoPanel();
    }
    
    if (!isPaused) {
        // Очищаем canvas (оптимизированно)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Обновляем и рисуем символы
        const newChars = [];
        for (let i = 0; i < matrixChars.length; i++) {
            const char = matrixChars[i];
            if (char.update()) {
                char.draw();
                newChars.push(char);
            }
        }
        matrixChars = newChars;
        
        // Автоматически убираем старые символы если их много
        if (matrixChars.length > currentConfig.maxChars * 0.8) {
            matrixChars = matrixChars.slice(-currentConfig.maxChars);
        }
    }
    
    requestAnimationFrame(animate);
}

// ===== ПУБЛИЧНЫЕ ФУНКЦИИ =====
window.addMatrixChar = addMatrixChar;
window.addMultipleChars = addMultipleChars;
window.resetTest = resetTest;
window.togglePause = togglePause;
window.changeTheme = changeTheme;
window.startRapidAddition = startRapidAddition;
window.stopRapidAddition = stopRapidAddition;
window.setDeviceType = setDeviceType;
window.startBenchmark = function() {
    document.getElementById('instructions').style.display = 'none';
    localStorage.setItem('matrixTestVisited', 'true');
    
    // Добавляем несколько начальных символов
    setTimeout(() => {
        for (let i = 0; i < 3; i++) {
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
