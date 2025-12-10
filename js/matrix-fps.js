// MATRIX FPS TEST - Main Engine
// Save this as: js/matrix-fps.js

// ===== CONFIGURATION =====
const CONFIG = {
    chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~@",
    colors: ['#00FF00', '#00FF41', '#39FF14', '#7CFC00', '#ADFF2F', '#32CD32'],
    fontSize: 20,
    maxChars: 8000,
    gravity: 0.05,
    spawnRate: 15,
    tailLength: 5,
    glowIntensity: 15
};

// ===== GLOBAL VARIABLES =====
let canvas, ctx;
let matrixChars = [];
let fps = 60;
let lastTime = 0;
let frameCount = 0;
let fpsUpdateTime = 0;
let isPaused = false;
let holdInterval = null;
let testStartTime = Date.now();
let totalCharsSpawned = 0;
let animationId = null;
let isBenchmarkRunning = false;

// ===== MATRIX CHARACTER CLASS =====
class MatrixChar {
    constructor(x, y, speed = 1) {
        this.x = x || Math.random() * canvas.width;
        this.y = y || -30;
        this.char = CONFIG.chars[Math.floor(Math.random() * CONFIG.chars.length)];
        this.speed = speed * (0.8 + Math.random() * 0.4);
        this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
        this.opacity = 0.8 + Math.random() * 0.2;
        this.size = CONFIG.fontSize + Math.random() * 8;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.03;
        this.tail = [];
        this.tailMax = CONFIG.tailLength + Math.floor(Math.random() * 8);
        this.brightness = 0.5 + Math.random() * 0.5;
    }
    
    update() {
        // Add current position to tail
        this.tail.unshift({
            x: this.x,
            y: this.y,
            opacity: this.opacity * 0.7,
            size: this.size * 0.7
        });
        
        // Limit tail length
        if (this.tail.length > this.tailMax) {
            this.tail.pop();
        }
        
        // Fade tail
        for (let i = 0; i < this.tail.length; i++) {
            this.tail[i].opacity *= 0.85;
            this.tail[i].size *= 0.95;
        }
        
        // Cleanup tail
        this.tail = this.tail.filter(pos => pos.opacity > 0.05);
        
        // Update position and rotation
        this.y += this.speed;
        this.x += (Math.random() - 0.5) * 0.5;
        this.rotation += this.rotationSpeed;
        
        // Check if out of bounds
        if (this.y > canvas.height + 100 || 
            this.x < -50 || 
            this.x > canvas.width + 50) {
            return false;
        }
        
        return true;
    }
    
    draw() {
        // Draw tail
        for (let i = this.tail.length - 1; i >= 0; i--) {
            const pos = this.tail[i];
            ctx.save();
            ctx.globalAlpha = pos.opacity * this.brightness;
            ctx.fillStyle = this.color;
            ctx.font = `bold ${pos.size}px 'Courier New', monospace`;
            
            // Glow effect for tail
            ctx.shadowColor = this.color;
            ctx.shadowBlur = CONFIG.glowIntensity * 0.5;
            
            ctx.translate(pos.x, pos.y);
            ctx.rotate(this.rotation * 0.7);
            ctx.fillText(this.char, 0, 0);
            ctx.restore();
        }
        
        // Draw main character
        ctx.save();
        ctx.globalAlpha = this.opacity * this.brightness;
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size}px 'Courier New', monospace`;
        
        // Strong glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = CONFIG.glowIntensity;
        
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillText(this.char, 0, 0);
        ctx.restore();
    }
}

// ===== INITIALIZATION =====
function initMatrix() {
    canvas = document.getElementById('matrixCanvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Event listeners
    setupEventListeners();
    
    // Start animation loop
    animationId = requestAnimationFrame(animate);
    
    // Initial character
    setTimeout(() => addMatrixChar(), 500);
    
    console.log('Matrix FPS Test initialized');
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
    // Click to add
    canvas.addEventListener('click', (e) => {
        addMatrixChar(e);
    });
    
    // Hold for rapid addition
    canvas.addEventListener('mousedown', startRapidAddition);
    canvas.addEventListener('mouseup', stopRapidAddition);
    canvas.addEventListener('mouseleave', stopRapidAddition);
    
    // Touch support
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startRapidAddition();
        addMatrixChar(e.touches[0]);
    }, { passive: false });
    
    canvas.addEventListener('touchend', stopRapidAddition);
    canvas.addEventListener('touchcancel', stopRapidAddition);
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        switch(e.code) {
            case 'Space':
                togglePause();
                break;
            case 'KeyR':
                resetTest();
                break;
            case 'Escape':
                stopRapidAddition();
                break;
            case 'KeyA':
                addMultipleChars(10);
                break;
        }
    });
}

// ===== CHARACTER MANAGEMENT =====
function addMatrixChar(event = null) {
    if (matrixChars.length >= CONFIG.maxChars || isPaused) return;
    
    const x = event ? (event.clientX || event.pageX) : Math.random() * canvas.width;
    const y = event ? (event.clientY || event.pageY) : Math.random() * -50;
    
    const speedMultiplier = 1 + (matrixChars.length / 2000);
    
    matrixChars.push(new MatrixChar(x, y, speedMultiplier));
    totalCharsSpawned++;
    
    updateInfoPanel();
}

function addMultipleChars(count) {
    for (let i = 0; i < count; i++) {
        if (matrixChars.length >= CONFIG.maxChars) break;
        addMatrixChar();
    }
}

function startRapidAddition() {
    if (holdInterval) clearInterval(holdInterval);
    holdInterval = setInterval(() => {
        addMultipleChars(CONFIG.spawnRate);
    }, 50);
}

function stopRapidAddition() {
    if (holdInterval) {
        clearInterval(holdInterval);
        holdInterval = null;
    }
}

// ===== CONTROL FUNCTIONS =====
function resetTest() {
    matrixChars = [];
    totalCharsSpawned = 0;
    testStartTime = Date.now();
    updateInfoPanel();
    document.getElementById('statusValue').textContent = 'RESET';
}

function togglePause() {
    isPaused = !isPaused;
    const btn = document.querySelector('#controls button:nth-child(2)');
    btn.textContent = isPaused ? 'RESUME' : 'PAUSE';
    document.getElementById('statusValue').textContent = isPaused ? 'PAUSED' : 'RUNNING';
    
    if (!isPaused) {
        animationId = requestAnimationFrame(animate);
    }
}

function changeTheme() {
    const themes = [
        { bg: '#000000', color: '#00FF00', name: 'MATRIX' },
        { bg: '#0a0a2a', color: '#00ffff', name: 'CYBER' },
        { bg: '#1a001a', color: '#ff00ff', name: 'NEON' },
        { bg: '#002a00', color: '#00ff00', name: 'FOREST' },
        { bg: '#00002a', color: '#4169E1', name: 'ROYAL' }
    ];
    
    const currentBg = document.body.style.backgroundColor || '#000000';
    let nextIndex = 0;
    
    for (let i = 0; i < themes.length; i++) {
        if (themes[i].bg === currentBg) {
            nextIndex = (i + 1) % themes.length;
            break;
        }
    }
    
    const theme = themes[nextIndex];
    applyTheme(theme);
}

function applyTheme(theme) {
    document.body.style.backgroundColor = theme.bg;
    document.body.style.color = theme.color;
    
    const elements = document.querySelectorAll('#infoPanel, #controls, #instructions');
    elements.forEach(el => {
        el.style.borderColor = theme.color;
    });
    
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.style.borderColor = theme.color;
        btn.style.color = theme.color;
    });
    
    CONFIG.colors = [theme.color, lightenColor(theme.color, 20), lightenColor(theme.color, 40)];
    document.getElementById('statusValue').textContent = theme.name;
}

function lightenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (
        0x1000000 +
        (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1);
}

// ===== INFO PANEL UPDATES =====
function updateInfoPanel() {
    document.getElementById('charsCount').textContent = matrixChars.length;
    document.getElementById('fpsValue').textContent = Math.round(fps);
    document.getElementById('speedValue').textContent = (1 + matrixChars.length / 1500).toFixed(2);
    document.getElementById('timeValue').textContent = Math.floor((Date.now() - testStartTime) / 1000);
    
    // Approximate memory usage (very rough estimate)
    const memoryMB = Math.round((matrixChars.length * 150) / 1024);
    document.getElementById('memoryValue').textContent = memoryMB;
    
    // Update status
    if (matrixChars.length === 0) {
        document.getElementById('statusValue').textContent = 'READY';
    } else if (fps > 50) {
        document.getElementById('statusValue').textContent = 'EXCELLENT';
    } else if (fps > 30) {
        document.getElementById('statusValue').textContent = 'GOOD';
    } else if (fps > 15) {
        document.getElementById('statusValue').textContent = 'SLOW';
    } else {
        document.getElementById('statusValue').textContent = 'STRESS';
    }
}

// ===== ANIMATION LOOP =====
function animate(currentTime) {
    if (!lastTime) lastTime = currentTime;
    
    // Calculate FPS
    frameCount++;
    const deltaTime = currentTime - fpsUpdateTime;
    
    if (deltaTime >= 1000) {
        fps = Math.round((frameCount * 1000) / deltaTime);
        fpsUpdateTime = currentTime;
        frameCount = 0;
        updateInfoPanel();
    }
    
    if (!isPaused) {
        // Clear with fade effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Update and draw characters
        const aliveChars = [];
        for (let char of matrixChars) {
            if (char.update()) {
                char.draw();
                aliveChars.push(char);
            }
        }
        matrixChars = aliveChars;
        
        // Auto-add characters if too few
        if (matrixChars.length < 5 && Math.random() < 0.05) {
            addMatrixChar();
        }
    }
    
    // Continue animation
    animationId = requestAnimationFrame(animate);
}

// ===== PUBLIC API =====
window.addMatrixChar = addMatrixChar;
window.addMultipleChars = addMultipleChars;
window.resetTest = resetTest;
window.togglePause = togglePause;
window.changeTheme = changeTheme;
window.startRapidAddition = startRapidAddition;
window.stopRapidAddition = stopRapidAddition;

// ===== START APPLICATION =====
// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMatrix);
} else {
    initMatrix();
}
