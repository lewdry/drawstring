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

        const colour = `rgb(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255})`;
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
    evt.preventDefault();
    if (splashScreenVisible || !drawing) return;

    const touches = evt.changedTouches || [evt];
    
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const x = touch.clientX;
        const y = touch.clientY;

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

        // Get the current tap location
        const x = evt.touches[0].clientX;
        const y = evt.touches[0].clientY;

        // Get the last tap location
        const lastX = parseFloat(canvas.dataset.lastTapX || 0);
        const lastY = parseFloat(canvas.dataset.lastTapY || 0);

        // Calculate the distance between the current and last tap
        const distance = Math.sqrt(Math.pow(x - lastX, 2) + Math.pow(y - lastY, 2));

        // Define a threshold for how close the taps need to be (e.g., 30 pixels)
        const distanceThreshold = 20;

        if (timeDiff < 300 && timeDiff > 0 && distance < distanceThreshold) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Store the current tap time and location
        canvas.dataset.lastTap = now;
        canvas.dataset.lastTapX = x;
        canvas.dataset.lastTapY = y;
    } else if (evt.type === 'dblclick') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function drawLine(x1, y1, x2, y2, colour) {
    ctx.beginPath();
    ctx.strokeStyle = colour;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "butt";

    if (x1 === x2 && y1 === y2) {
        // Draw a dot
        ctx.arc(x1, y1, lineWidth / 2, 0, 2 * Math.PI);
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
document.addEventListener('touchstart', handleStart, false);
document.addEventListener('mousedown', handleStart, false);
canvas.addEventListener('touchmove', handleMove, false);
canvas.addEventListener('mousemove', handleMove, false);
canvas.addEventListener('touchend', handleEnd, false);
canvas.addEventListener('mouseup', handleEnd, false);
canvas.addEventListener('touchcancel', handleCancel, false);
canvas.addEventListener('touchstart', handleDoubleTap, false);
canvas.addEventListener('dblclick', handleDoubleTap, false);
window.addEventListener('resize', handleResize);
