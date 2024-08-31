const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const splashScreen = document.getElementById('splashScreen');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const lineWidth = 4; // Line thickness
let ongoingTouches = [];

// Show splash screen and hide after 5 seconds
function showSplashScreen() {
    splashScreen.style.display = 'flex';
    startCountdown();
    setTimeout(() => {
        splashScreen.style.display = 'none';
    }, 5000);
}

// Countdown functionality
function startCountdown() {
    const countdownElement = document.getElementById('countdown');
    let countdown = 5; // Start from 5 seconds

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

// Draw a line between two points with a random color
function drawLine(x1, y1, x2, y2) {
    ctx.strokeStyle = getRandomColor();
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

// Get a random color
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Handle touch and mouse events
function handleStart(event) {
    const touches = event.changedTouches || [event];
    for (let i = 0; i < touches.length; i++) {
        ongoingTouches.push({ x: touches[i].clientX, y: touches[i].clientY });
    }
}

function handleMove(event) {
    const touches = event.changedTouches || [event];
    for (let i = 0; i < touches.length; i++) {
        const index = ongoingTouches.findIndex(t => t.x === touches[i].clientX && t.y === touches[i].clientY);
        if (index >= 0) {
            const touch = ongoingTouches[index];
            drawLine(touch.x, touch.y, touches[i].clientX, touches[i].clientY);
            touch.x = touches[i].clientX;
            touch.y = touches[i].clientY;
        }
    }
}

function handleEnd(event) {
    const touches = event.changedTouches || [event];
    for (let i = 0; i < touches.length; i++) {
        ongoingTouches = ongoingTouches.filter(t => t.x !== touches[i].clientX || t.y !== touches[i].clientY);
    }
}

// Clear the canvas
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Event listeners
canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);

canvas.addEventListener('touchstart', handleStart);
canvas.addEventListener('touchmove', handleMove);
canvas.addEventListener('touchend', handleEnd);

canvas.addEventListener('dblclick', clearCanvas);

// Show splash screen on page load
window.addEventListener('load', showSplashScreen);

// Toggle splash screen on click
document.getElementById('footerLabel').addEventListener('click', () => {
    if (splashScreen.style.display === 'none' || splashScreen.style.display === '') {
        splashScreen.style.display = 'flex';
        startCountdown();
    } else {
        splashScreen.style.display = 'none';
    }
});
