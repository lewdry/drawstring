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
    const touches = evt.changedTouches || [evt];
    
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const x = touch.clientX;
        const y = touch.clientY;
        
        if (splashScreenVisible) {
            hideSplashScreen();
            return;
        }

        const color = getRandomColor();
        ongoingTouches.push({
            id: touch.identifier || 'mouse',
            x: x,
            y: y,
            color: color
        });
        drawLine(x, y, x, y, color);
    }

    drawing = true;
}

function handleMove(evt) {
    evt.preventDefault();
    if (splashScreenVisible || !drawing) return;

    const touches = evt.changedTouches || [evt];
    
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
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
}

function handleEnd(evt) {
    evt.preventDefault();
    if (splashScreenVisible) return;

    const touches = evt.changedTouches || [evt];
    
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const idx = ongoingTouchIndexById(touch.identifier || 'mouse');
        if (idx >= 0) {
            ongoingTouches.splice(idx, 1);
        }
    }

    if (ongoingTouches.length === 0) {
        drawing = false;
    }
}

function handleCancel(evt) {
    evt.preventDefault();
    if (splashScreenVisible) return;

    const touches = evt.changedTouches || [evt];
    
    for (let i = 0; i < touches.length; i++) {
        const idx = ongoingTouchIndexById(touches[i].identifier || 'mouse');
        if (idx >= 0) {
            ongoingTouches.splice(idx, 1);
        }
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
canvas.addEventListener('touchcancel', handleCancel, false);
canvas.addEventListener('touchstart', handleDoubleTap, false);
canvas.addEventListener('dblclick', handleDoubleTap, false);
window.addEventListener('resize', handleResize);
