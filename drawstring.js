// drawstring.js

// Get canvas and context
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

// Canvas dimensions
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// State variables
let isDrawing = false;
let ongoingTouches = [];
let splashScreenVisible = true;

// Initialize splash screen
function showSplashScreen() {
    document.getElementById('splashScreen').style.display = 'flex';
    let countdown = 5; // Set countdown to 5 seconds
    const countdownElement = document.getElementById('countdown');
    countdownElement.textContent = countdown;

    const interval = setInterval(() => {
        countdown--;
        countdownElement.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(interval);
            document.getElementById('splashScreen').style.display = 'none';
            splashScreenVisible = false;
        }
    }, 1000);
}

// Initialize splash screen display
window.addEventListener('load', () => {
    showSplashScreen();
});

// Event handlers
function handleStart(event) {
    if (splashScreenVisible) return;
    isDrawing = true;
    const { clientX, clientY } = event.changedTouches ? event.changedTouches[0] : event;
    ctx.beginPath();
    ctx.moveTo(clientX, clientY);
    event.preventDefault();
}

function handleMove(event) {
    if (!isDrawing || splashScreenVisible) return;
    const { clientX, clientY } = event.changedTouches ? event.changedTouches[0] : event;
    ctx.lineTo(clientX, clientY);
    ctx.strokeStyle = getRandomColor();
    ctx.lineWidth = 10;
    ctx.stroke();
    event.preventDefault();
}

function handleEnd(event) {
    if (splashScreenVisible) return;
    isDrawing = false;
    event.preventDefault();
}

function handleCancel(event) {
    if (splashScreenVisible) return;
    isDrawing = false;
    event.preventDefault();
}

function handleMouseDown(event) {
    if (splashScreenVisible) return;
    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(event.clientX, event.clientY);
}

function handleMouseMove(event) {
    if (!isDrawing || splashScreenVisible) return;
    ctx.lineTo(event.clientX, event.clientY);
    ctx.strokeStyle = getRandomColor();
    ctx.lineWidth = 10;
    ctx.stroke();
}

function handleMouseUp(event) {
    if (splashScreenVisible) return;
    isDrawing = false;
}

function handleDoubleTap(event) {
    if (splashScreenVisible) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    event.preventDefault();
}

// Helper function to get a random color
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Add event listeners for drawing
canvas.addEventListener('touchstart', handleStart, false);
canvas.addEventListener('mousedown', handleMouseDown, false);
canvas.addEventListener('touchmove', handleMove, false);
canvas.addEventListener('mousemove', handleMouseMove, false);
canvas.addEventListener('touchend', handleEnd, false);
canvas.addEventListener('mouseup', handleMouseUp, false);
canvas.addEventListener('touchcancel', handleCancel, false);
canvas.addEventListener('dblclick', handleDoubleTap, false);

// Add event listener for splash screen toggle
document.addEventListener('click', function(event) {
    if (event.target.id === 'footerLabel') {
        const splashScreen = document.getElementById('splashScreen');
        splashScreen.style.display = splashScreen.style.display === 'none' ? 'flex' : 'none';
        splashScreenVisible = splashScreen.style.display === 'flex';
    }
});
