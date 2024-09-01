const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const splashScreen = document.getElementById('splashScreen');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const lineWidth = 2;

let ongoingTouches = [];
let drawing = false;
let splashScreenVisible = true;

function hideSplashScreen() {
    splashScreen.style.display = 'none';
    splashScreenVisible = false;
}

function handleStart(evt) {
    evt.preventDefault();

    const touch = evt.type.startsWith('mouse') ? evt : evt.changedTouches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    if (splashScreenVisible) {
        if (!isInsideSplashScreen(x, y)) {
            hideSplashScreen();
            // Immediately start drawing after hiding splash screen
            startDrawing(x, y);
        }
        return;
    }

    startDrawing(x, y);
}

function startDrawing(x, y) {
    drawing = true;
    const color = getRandomColor();
    ongoingTouches.push({
        id: 'mouse', // mouse is both click and touch
        x: x,
        y: y,
        color: color
    });
    drawLine(x, y, x, y, color);
}

function handleMove(evt) {
    evt.preventDefault();
    if (splashScreenVisible || !drawing) return;

    const touch = evt.type.startsWith('mouse') ? evt : evt.changedTouches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    const idx = ongoingTouchIndexById(touch.identifier || 'mouse');
    if (idx >= 0) {
        const color = ongoingTouches[idx].color;
        drawLine(ongoingTouches[idx].x, ongoingTouches[idx].y, x, y, color);
        ongoingTouches[idx].x = x;
        ongoingTouches[idx].y = y;
    }
}

function handleEnd(evt) {
    evt.preventDefault();
    drawing = false;
    if (splashScreenVisible) return;

    const touch = evt.type.startsWith('mouse') ? evt : evt.changedTouches[0];
    const idx = ongoingTouchIndexById(touch.identifier || 'mouse');
    if (idx >= 0) {
        ongoingTouches.splice(idx, 1);
    }
}

function handleCancel(evt) {
    evt.preventDefault();
    if (splashScreenVisible) return;

    const touches = evt.changedTouches || [evt];

    for (let i = 0; i < touches.length; i++) {
        const idx = ongoingTouchIndexById(touches[i].identifier || 'mouse');
        ongoingTouches.splice(idx, 1);
    }
}

function handleDoubleTap(evt) {
    if (splashScreenVisible) return;

    if (evt.touches && evt.touches.length === 1) {
        const now = new Date().getTime();
        const lastTap = canvas.dataset.lastTap || 0;
        const timeDiff = now - lastTap;

        if (timeDiff < 300 && timeDiff > 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        canvas.dataset.lastTap = now;
    } else if (evt.type === 'dblclick') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function isInsideSplashScreen(x, y) {
    const rect = splashScreen.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function drawLine(x1, y1, x2, y2, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.closePath();
}

function ongoingTouchIndexById(idToFind) {
    for (let i = 0; i < ongoingTouches.length; i++) {
        const id = ongoingTouches[i].id;
        if (id == idToFind) {
            return i;
        }
    }
    return -1;
}

function handleResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Redraw the canvas content if needed
}

// Event listeners
canvas.addEventListener('touchstart', handleStart, false);
canvas.addEventListener('mousedown', handleStart, false);
canvas.addEventListener('touchmove', handleMove, false);
canvas.addEventListener('mousemove', handleMove, false);
canvas.addEventListener('touchend', handleEnd, false);
canvas.addEventListener('mouseup', handleEnd, false);
canvas.addEventListener('touchcancel', handleEnd, false);
canvas.addEventListener('touchstart', handleDoubleTap, false);
canvas.addEventListener('dblclick', handleDoubleTap, false);
window.addEventListener('resize', handleResize);
