const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const splashScreen = document.createElement('div');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const lineWidth = 6; // Line thickness, you can adjust this value

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
let ongoingTouches = [];
let drawing = false;

function handleFirstTouchOrClick(evt) {
    evt.preventDefault();

    if (splashScreenVisible) {
        splashScreen.remove();
        splashScreenVisible = false;
        canvas.removeEventListener('touchstart', handleFirstTouchOrClick);
        canvas.removeEventListener('mousedown', handleFirstTouchOrClick);
        canvas.addEventListener('touchstart', handleStart, false);
        canvas.addEventListener('mousedown', handleMouseDown, false);
    }
}

// Handle touch start
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

// Handle mouse down
function handleMouseDown(evt) {
    evt.preventDefault();
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

// Handle touch move
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

// Handle mouse move
function handleMouseMove(evt) {
    evt.preventDefault();
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

// Handle touch end
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

// Handle mouse up
function handleMouseUp(evt) {
    evt.preventDefault();
    drawing = false;
    const idx = ongoingTouchIndexById('mouse');
    if (idx >= 0) {
        ongoingTouches.splice(idx, 1);  // Remove it; we're done
    }
}

// Handle touch cancel
function handleCancel(evt) {
    evt.preventDefault();
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

// Add event listeners
canvas.addEventListener('touchstart', handleFirstTouchOrClick, false);
canvas.addEventListener('mousedown', handleFirstTouchOrClick, false);
canvas.addEventListener('touchmove', handleMove, false);
canvas.addEventListener('mousemove', handleMouseMove, false);
canvas.addEventListener('touchend', handleEnd, false);
canvas.addEventListener('mouseup', handleMouseUp, false);
canvas.addEventListener('touchcancel', handleCancel, false);
canvas.addEventListener('touchstart', handleDoubleTap, false);
canvas.addEventListener('dblclick', handleDoubleTap, false);
