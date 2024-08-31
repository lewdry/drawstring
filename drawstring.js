const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const splashScreen = document.createElement('div');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Create splash screen
splashScreen.id = 'splashScreen';
splashScreen.innerHTML = `
    <div>
        <p>Welcome to drawstring, a randomly coloured sketchpad.</p>
        <p>Touch and drag to draw.</p>
        <p>Multi-touch supported.</p>
        <p>Screenshot anything you want to keep.</p>
        <p>Double tap to clear.</p>
    </div>
`;
document.body.appendChild(splashScreen);

// Handle drawing functionality
const lineWidth = 10;
let ongoingTouches = [];

function handleStart(evt) {
    evt.preventDefault();
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

    // Remove splash screen on first touch
    splashScreen.style.display = 'none';
}

function handleMove(evt) {
    evt.preventDefault();
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

function handleEnd(evt) {
    evt.preventDefault();
    const touches = evt.changedTouches;

    for (let i = 0; i < touches.length; i++) {
        const idx = ongoingTouchIndexById(touches[i].identifier);
        if (idx >= 0) {
            ongoingTouches.splice(idx, 1);  // Remove it; we're done
        }
    }
}

function handleCancel(evt) {
    evt.preventDefault();
    const touches = evt.changedTouches;

    for (let i = 0; i < touches.length; i++) {
        const idx = ongoingTouchIndexById(touches[i].identifier);
        ongoingTouches.splice(idx, 1);  // Remove it; we're done
    }
}

function handleDoubleTap(evt) {
    if (evt.touches.length === 1) {
        const now = new Date().getTime();
        const lastTap = canvas.dataset.lastTap || 0;
        const timeDiff = now - lastTap;

        if (timeDiff < 300 && timeDiff > 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        canvas.dataset.lastTap = now;
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
    return -1;  // Not found
}

canvas.addEventListener('touchstart', handleStart, false);
canvas.addEventListener('touchmove', handleMove, false);
canvas.addEventListener('touchend', handleEnd, false);
canvas.addEventListener('touchcancel', handleCancel, false);
canvas.addEventListener('touchstart', handleDoubleTap, false);
