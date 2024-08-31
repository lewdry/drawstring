const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const splashScreen = document.createElement('div');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Create splash screen
splashScreen.id = 'splashScreen';
splashScreen.innerHTML = `
   <div>
        <p>Welcome to Drawstring.</p>
        <p>A mobile sketchpad.</p>
        <p>Touch to draw.</p>
        <p>Colours are random.</p>
        <p>Multi-touch supported.</p>
        <p>Double-tap to clear.</p>
        <p>Screenshot to save.</p>
        <p>Touch to start drawing.</p>
    </div>
`;
document.body.appendChild(splashScreen);

let splashScreenVisible = true;

function handleFirstTouch(evt) {
    evt.preventDefault();

    if (splashScreenVisible) {
        splashScreen.remove();
        splashScreenVisible = false;
        canvas.removeEventListener('touchstart', handleFirstTouch);
        canvas.addEventListener('touchstart', handleStart, false);
    }
}

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

// Add event listeners
canvas.addEventListener('touchstart', handleFirstTouch, false);
canvas.addEventListener('touchmove', handleMove, false);
canvas.addEventListener('touchend', handleEnd, false);
canvas.addEventListener('touchcancel', handleCancel, false);
canvas.addEventListener('touchstart', handleDoubleTap, false);
