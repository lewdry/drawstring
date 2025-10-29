const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const splashScreen = document.getElementById('splashScreen');

// Constants
const DEVICE_PIXEL_RATIO = window.devicePixelRatio || 1;
const LINE_WIDTH = 2;
const DOUBLE_TAP_TIMEOUT = 300;
const DOUBLE_TAP_DISTANCE_THRESHOLD = 20;
const MAX_RGB_VALUE = 255;

function resizeCanvas() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width * DEVICE_PIXEL_RATIO;
    canvas.height = height * DEVICE_PIXEL_RATIO;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(DEVICE_PIXEL_RATIO, DEVICE_PIXEL_RATIO);
}

// Initial canvas resize
resizeCanvas();

// Resize canvas when the window is resized
window.addEventListener('resize', resizeCanvas);

const ongoingTouches = [];
let drawing = false;
let splashScreenVisible = true;
let lastTapTime = 0;
let isDoubleTap = false;
let currentMode = null; // 'simple' or 'fancy'

function hideSplashScreen() {
    splashScreen.style.display = 'none';
    splashScreenVisible = false;
}

function initSimpleMode() {
    currentMode = 'simple';
    // Hide fancy mode elements
    document.getElementById('toolbar').style.display = 'none';
    document.getElementById('brushPreview').style.display = 'none';
    
    // Apply simple mode styles
    document.body.style.background = '';
    document.body.className = '';
}

function initFancyModeUI() {
    currentMode = 'fancy';
    // Show fancy mode elements
    document.getElementById('toolbar').style.display = 'flex';
    
    // Apply fancy mode styles
    document.body.style.background = 'white';
    document.body.className = 'fancy-mode';
    
    // Initialize fancy drawing functionality
    initFancyMode();
}

function handleStart(evt) {
    // Handle splash screen button clicks first
    if (splashScreenVisible) {
        if (evt.target.id === 'simpleButton') {
            evt.preventDefault();
            evt.stopPropagation();
            hideSplashScreen();
            initSimpleMode();
            return;
        } else if (evt.target.id === 'fancyButton') {
            evt.preventDefault();
            evt.stopPropagation();
            hideSplashScreen();
            initFancyModeUI();
            return;
        }
        // If splash screen is visible but it's not a button click, don't do anything
        return;
    }
    
    // Check if the event target is a UI element (button, input, etc.) that should not trigger drawing
    if (evt.target.tagName === 'BUTTON' || 
        evt.target.tagName === 'INPUT' || 
        evt.target.closest('#toolbar')) {
        return; // Don't preventDefault or handle as drawing event
    }
    
    evt.preventDefault();
    
    if (isDoubleTap) {
        isDoubleTap = false;
        return;
    }
    
    // Only continue with simple mode drawing logic if in simple mode
    if (currentMode !== 'simple') return;
    
    const touches = evt.changedTouches || [evt];

    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const x = touch.clientX;
        const y = touch.clientY;

        // Validate touch coordinates
        if (!isValidCoordinate(x) || !isValidCoordinate(y)) continue;

        const colour = `rgb(${Math.floor(Math.random() * MAX_RGB_VALUE)},${Math.floor(Math.random() * MAX_RGB_VALUE)},${Math.floor(Math.random() * MAX_RGB_VALUE)})`;
        ongoingTouches.push({
            id: touch.identifier || 'mouse',
            x: x,
            y: y,
            colour: colour
        });
        drawLine(x, y, x, y, colour);
    }

    drawing = true;
}

function handleMove(evt) {
    // Don't prevent default for UI elements
    if (evt.target.tagName === 'INPUT' || evt.target.closest('#toolbar')) {
        return;
    }
    
    evt.preventDefault();
    if (splashScreenVisible || !drawing || currentMode !== 'simple') return;

    const touches = evt.changedTouches || [evt];
    
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const x = touch.clientX;
        const y = touch.clientY;

        // Validate touch coordinates
        if (!isValidCoordinate(x) || !isValidCoordinate(y)) continue;

        const idx = ongoingTouchIndexById(touch.identifier || 'mouse');
        if (idx >= 0) {
            const colour = ongoingTouches[idx].colour;
            drawLine(ongoingTouches[idx].x, ongoingTouches[idx].y, x, y, colour);
            ongoingTouches[idx].x = x;
            ongoingTouches[idx].y = y;
        }
    }
}

function handleEnd(evt) {
    evt.preventDefault();
    if (splashScreenVisible || currentMode !== 'simple') return;

    const touches = evt.changedTouches || [evt];
    
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const idx = ongoingTouchIndexById(touch.identifier || 'mouse');
        if (idx >= 0) {
            ongoingTouches.splice(idx, 1);
        }
    }

    // Clean up any orphaned touches and stop drawing if no touches remain
    cleanupTouches();
    if (ongoingTouches.length === 0) {
        drawing = false;
    }
}

function handleCancel(evt) {
    evt.preventDefault();
    if (splashScreenVisible || currentMode !== 'simple') return;

    const touches = evt.changedTouches || [evt];
    
    for (let i = 0; i < touches.length; i++) {
        const idx = ongoingTouchIndexById(touches[i].identifier || 'mouse');
        if (idx >= 0) {
            ongoingTouches.splice(idx, 1);
        }
    }

    // Clean up any orphaned touches
    cleanupTouches();
    if (ongoingTouches.length === 0) {
        drawing = false;
    }
}

function handleDoubleTap(evt) {
    if (splashScreenVisible || currentMode !== 'simple') return;

    const now = new Date().getTime();
    const timeSinceLastTap = now - lastTapTime;

    if (evt.touches && evt.touches.length === 1) {
        // Get the current tap location
        const x = evt.touches[0].clientX;
        const y = evt.touches[0].clientY;

        // Get the last tap location
        const lastX = parseFloat(canvas.dataset.lastTapX || 0);
        const lastY = parseFloat(canvas.dataset.lastTapY || 0);

        // Calculate the distance between the current and last tap
        const distance = Math.sqrt(Math.pow(x - lastX, 2) + Math.pow(y - lastY, 2));

        // Define a threshold for how close the taps need to be (e.g., 30 pixels)
        const distanceThreshold = DOUBLE_TAP_DISTANCE_THRESHOLD;

        if (timeSinceLastTap < DOUBLE_TAP_TIMEOUT && distance < distanceThreshold) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            evt.preventDefault();
            isDoubleTap = true;
            setTimeout(() => { isDoubleTap = false; }, DOUBLE_TAP_TIMEOUT);
        }

        // Store the current tap location
        canvas.dataset.lastTapX = x;
        canvas.dataset.lastTapY = y;
    } else if (evt.type === 'dblclick') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    lastTapTime = now;
}

function drawLine(x1, y1, x2, y2, colour) {
    ctx.beginPath();
    ctx.strokeStyle = colour;
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = "butt";

    if (x1 === x2 && y1 === y2) {
        // Draw a dot
        ctx.arc(x1, y1, LINE_WIDTH / 2, 0, 2 * Math.PI);
        ctx.fillStyle = colour;
        ctx.fill();
    } else {
        // Draw a line
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    ctx.closePath();
}

function isValidCoordinate(coord) {
    return typeof coord === 'number' && !isNaN(coord) && isFinite(coord);
}

function ongoingTouchIndexById(idToFind) {
    for (let i = 0; i < ongoingTouches.length; i++) {
        const id = ongoingTouches[i].id;
        if (id === idToFind) {
            return i;
        }
    }
    return -1;
}

function cleanupTouches() {
    // Remove any touches that might have been orphaned
    for (let i = ongoingTouches.length - 1; i >= 0; i--) {
        if (!ongoingTouches[i] || !ongoingTouches[i].id) {
            ongoingTouches.splice(i, 1);
        }
    }
}

// Event listeners
function setupEventListeners() {
    // Document-level events
    document.addEventListener('touchstart', handleStart, false);
    document.addEventListener('mousedown', handleStart, false);
    
    // Canvas-specific events
    canvas.addEventListener('touchmove', handleMove, false);
    canvas.addEventListener('mousemove', handleMove, false);
    canvas.addEventListener('touchend', handleEnd, false);
    canvas.addEventListener('mouseup', handleEnd, false);
    canvas.addEventListener('touchcancel', handleCancel, false);
    canvas.addEventListener('dblclick', handleDoubleTap, false);
    canvas.addEventListener('touchstart', handleDoubleTap, false);
    
    // Button events
    document.getElementById('simpleButton').addEventListener('click', handleStart, false);
    document.getElementById('fancyButton').addEventListener('click', handleStart, false);
    
    // Window events
    window.addEventListener('resize', resizeCanvas);
}

// Initialize event listeners
setupEventListeners();