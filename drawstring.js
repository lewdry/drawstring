const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const splashScreen = document.getElementById('splashScreen');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const lineWidth = 10; // Line thickness, you can adjust this value

let ongoingTouches = [];
let drawing = false;

// Create and append the splash screen content
function createSplashScreenContent() {
    splashScreen.innerHTML = `
        <div>
            <p>this is drawstring,</p>
            <p>a mobile sketchpad.</p>
            <p>touch to draw.</p>
            <p>colours are random.</p>
            <p>double-tap to clear.</p>
            <p>screenshot to save.</p>
            <p>multi-touch works.</p>
            <p>start drawing in...</p>
            <p id="countdown"></p>
        </div>
    `;
}
createSplashScreenContent();

// Update the countdown every second
function startCountdown() {
    const countdownElement = document.getElementById('countdown');
    let countdown = 3; // Start from 3 seconds

    countdownElement.textContent = `Starting in ${countdown}...`;

    const interval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            countdownElement.textContent = `Starting in ${countdown}...`;
        } else {
            countdownElement.textContent = ''; // Clear countdown text
            clearInterval(interval); // Stop countdown
        }
    }, 1000);
}

// Show splash screen and hide after 3 seconds
function showSplashScreen() {
    splashScreen.style.display = 'flex';
    startCountdown();
    setTimeout(() => {
        splashScreen.style.display = 'none';
    }, 3000);
}

// Event listeners for touch and mouse events
function handleStart(evt) {
    evt.preventDefault();

    if (splashScreen.style.display === 'flex') return; // Do nothing if splash screen is visible

    const touches = evt.changedTouches;

    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const color = getRandomColor();
        ongoingTouches.push({
            id: touch.identifier,
            x: touch.pageX,
            y: touch.pageY,
            color: color
        });
        drawLine(touch.pageX, touch.pageY, touch.pageX, touch.pageY, color);
    }
}

function handleMouseDown(evt) {
    evt.preventDefault();
    if (splashScreen.style.display === 'flex') return; // Do nothing if splash screen is visible

    drawing = true;
    const color = getRandomColor();
    ongoingTouches.push({
        id: 'mouse', // Use a unique identifier for the mouse
        x: evt.clientX,
        y: evt.clientY,
        color: color
    });
    drawLine(evt.clientX, evt.clientY, evt.clientX, evt.clientY, color);
}

function handleMove(evt) {
    evt.preventDefault();
    if (splashScreen.style.display === 'flex') return; // Do nothing if splash screen is visible

    const touches = evt.changedTouches;

    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const idx = ongoingTouchIndexById(touch.identifier);

        if (idx >= 0) {
            const color = ongoingTouches[idx].color;
            drawLine(ongoingTouches[idx].x, ongoingTouches[idx].y, touch.pageX, touch.pageY, color);
            ongoingTouches[idx].x = touch.pageX;
            ongoingTouches[idx].y = touch.pageY;
        }
    }
}

function handleMouseMove(evt) {
    evt.preventDefault();
    if (splashScreen.style.display === 'flex') return; // Do nothing if splash screen is visible

    if (drawing) {
        const idx = ongoingTouchIndexById('mouse');

        if (idx >= 0) {
            const color = ongoingTouches[idx].color;
            drawLine(ongoingTouches[idx].x, ongoingTouches[idx].y, evt.clientX, evt.clientY, color);
            ongoingTouches[idx].x = evt.clientX;
            ongoingTouches[idx].y = evt.clientY;
        }
    }
}

function handleEnd(evt) {
    evt.preventDefault();
    if (splashScreen.style.display === 'flex') return; // Do nothing if splash screen is visible

    const touches = evt.changedTouches;

    for (let i = 0; i < touches.length; i++) {
        const idx = ongoingTouchIndexById(touches[i].identifier);
        if (idx >= 0) {
            ongoingTouches.splice(idx, 1);  // Remove it; we're done
        }
    }
}

function handleMouseUp(evt) {
    evt.preventDefault();
    drawing = false;
    if (splashScreen.style.display === 'flex') return; // Do nothing if splash screen is visible

    const idx = ongoingTouchIndexById('mouse');
    if (idx >= 0) {
        ongoingTouches.splice(idx, 1);  // Remove it; we're done
    }
}

function handleCancel(evt) {
    evt.preventDefault();
    if (splashScreen.style.display === 'flex') return; // Do nothing if splash screen is visible

    const touches = evt.changedTouches;

    for (let i = 0; i < touches.length; i++) {
        const idx = ongoingTouchIndexById(touches[i].identifier);
        ongoingTouches.splice(idx, 1);  // Remove it; we're done
    }
}

// Handle double tap (for both touch and mouse)
function handleDoubleTap(evt) {
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
    ctx.lineWidth = lineWidth; // Line thickness
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
    return -1;  // Not found
}

// Add event listeners for drawing
canvas.addEventListener('touchstart', handleStart, false);
canvas.addEventListener('mousedown', handleMouseDown, false);
canvas.addEventListener('touchmove', handleMove, false);
canvas.addEventListener('mousemove', handleMouseMove, false);
canvas.addEventListener('touchend', handleEnd, false);
canvas.addEventListener('mouseup', handleMouseUp, false);
canvas.addEventListener('touchcancel', handleCancel, false);
canvas.addEventListener('touchstart', handleDoubleTap, false);
canvas.addEventListener('dblclick', handleDoubleTap, false);

// Show splash screen on page load
window.addEventListener('load', showSplashScreen);
