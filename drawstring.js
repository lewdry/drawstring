const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const splashScreen = document.getElementById('splashScreen');

const devicePixelRatio = window.devicePixelRatio || 1;

function resizeCanvas() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(devicePixelRatio, devicePixelRatio);
}

// Initial canvas resize
resizeCanvas();

// Resize canvas when the window is resized
window.addEventListener('resize', resizeCanvas);

const lineWidth = 2;
let ongoingTouches = [];
let drawing = false;
let splashScreenVisible = true;
let lastTapTime = 0;
let isDoubleTap = false;
let isFirstTouch = true;

function hideSplashScreen() {
    splashScreen.style.display = 'none';
    splashScreenVisible = false;
}

function handleStart(evt) {
    evt.preventDefault();
    if (isDoubleTap) {
        isDoubleTap = false;
        return;
    }
    
    const touches = evt.changedTouches || [evt];
    
    if (splashScreenVisible) {
        if (evt.target.id !== 'startButton') {
            return;
        }
        hideSplashScreen();
        isFirstTouch = false;
        return;
    }

    if (isFirstTouch) {
        isFirstTouch = false;
        return;
    }

    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const x = touch.clientX;
        const y = touch.clientY;

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
        const distanceThreshold = 20;

        if (timeSinceLastTap < 300 && distance < distanceThreshold) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            evt.preventDefault();
            isDoubleTap = true;
            setTimeout(() => { isDoubleTap = false; }, 300);
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

document.getElementById('startButton').addEventListener('click', handleStart, false);
    


canvas.addEventListener('touchmove', handleMove, false);
canvas.addEventListener('mousemove', handleMove, false);
canvas.addEventListener('touchend', handleEnd, false);
canvas.addEventListener('mouseup', handleEnd, false);
canvas.addEventListener('touchcancel', handleCancel, false);
canvas.addEventListener('dblclick', handleDoubleTap, false);
canvas.addEventListener('touchstart', handleDoubleTap, false);
window.addEventListener('resize', handleResize);