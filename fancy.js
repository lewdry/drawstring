// Fancy drawing mode functionality
function initFancyMode() {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    const colorPicker = document.getElementById('colorPicker');
    const brushSize = document.getElementById('brushSize');
    const brushPreview = document.getElementById('brushPreview');
    
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Generate a random color
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    
    let drawing = false;
    let currentColor = randomColor;
    let currentBrushSize = 2;
    let lastX = 0;
    let lastY = 0;
    let history = [];
    let historyStep = -1;
    let lastTapTime = 0;

    function resizeCanvas() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        canvas.width = width * devicePixelRatio;
        canvas.height = height * devicePixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        
        ctx.scale(devicePixelRatio, devicePixelRatio);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.putImageData(imageData, 0, 0);
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    resizeCanvas();
    
    // Set color picker to the random color
    colorPicker.value = currentColor;
    
    // Initialize with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);
    
    // Initialize the first state for undo functionality
    function saveState() {
        historyStep++;
        if (historyStep < history.length) {
            history.length = historyStep;
        }
        history.push(canvas.toDataURL());
        if (history.length > 20) {
            history.shift();
            historyStep--;
        }
    }
    
    // Save initial state
    saveState();

    function undo() {
        if (historyStep > 0) {
            historyStep--;
            const img = new Image();
            img.src = history[historyStep];
            img.onload = () => {
                // Reset transform to avoid scaling issues
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // Reapply the scaling
                ctx.scale(devicePixelRatio, devicePixelRatio);
            };
        }
    }

    function clearCanvas() {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);
        saveState();
    }

    function downloadCanvas() {
        const link = document.createElement('a');
        link.download = `drawstring-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    }

    function drawLine(x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentBrushSize;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    function startDrawing(e) {
        // Prevent drawing if the event target is a UI element
        if (e.target.tagName === 'BUTTON' || 
            e.target.tagName === 'INPUT' || 
            e.target.closest('#toolbar') ||
            e.target.closest('#splashScreen')) {
            return;
        }
        
        drawing = true;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        lastX = touch.clientX - rect.left;
        lastY = touch.clientY - rect.top;
        
        ctx.beginPath();
        ctx.arc(lastX, lastY, currentBrushSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = currentColor;
        ctx.fill();
    }

    function draw(e) {
        if (!drawing) return;
        
        // Prevent drawing if the event target is a UI element
        if (e.target.tagName === 'BUTTON' || 
            e.target.tagName === 'INPUT' || 
            e.target.closest('#toolbar') ||
            e.target.closest('#splashScreen')) {
            return;
        }
        
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        drawLine(lastX, lastY, x, y);
        
        lastX = x;
        lastY = y;
    }

    function stopDrawing() {
        if (drawing) {
            drawing = false;
            saveState();
        }
    }

    function handleDoubleTap(e) {
        const now = Date.now();
        const timeSince = now - lastTapTime;
        
        if (timeSince < 300) {
            clearCanvas();
            e.preventDefault();
        }
        
        lastTapTime = now;
    }

    function updateBrushPreview(e) {
        const touch = e.touches ? e.touches[0] : e;
        brushPreview.style.left = touch.clientX + 'px';
        brushPreview.style.top = touch.clientY + 'px';
        brushPreview.style.width = currentBrushSize + 'px';
        brushPreview.style.height = currentBrushSize + 'px';
        brushPreview.style.borderColor = currentColor;
        brushPreview.style.display = 'block';
    }

    // Event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', (e) => {
        draw(e);
        updateBrushPreview(e);
    });
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('mouseleave', () => {
        brushPreview.style.display = 'none';
    });

    canvas.addEventListener('touchstart', (e) => {
        // Don't prevent default for UI elements
        if (e.target.tagName === 'INPUT' || e.target.closest('#toolbar')) {
            return;
        }
        e.preventDefault();
        handleDoubleTap(e);
        startDrawing(e);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        // Don't prevent default for UI elements
        if (e.target.tagName === 'INPUT' || e.target.closest('#toolbar')) {
            return;
        }
        e.preventDefault();
        draw(e);
        updateBrushPreview(e);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        // Don't prevent default for UI elements
        if (e.target.tagName === 'INPUT' || e.target.closest('#toolbar')) {
            return;
        }
        e.preventDefault();
        stopDrawing();
        brushPreview.style.display = 'none';
    }, { passive: false });

    // Add double-click support for desktop
    canvas.addEventListener('dblclick', (e) => {
        clearCanvas();
        e.preventDefault();
    });

    colorPicker.addEventListener('input', (e) => {
        currentColor = e.target.value;
    });

    // Add change event for better mobile support
    colorPicker.addEventListener('change', (e) => {
        currentColor = e.target.value;
    });

    brushSize.addEventListener('input', (e) => {
        currentBrushSize = e.target.value;
    });

    // Prevent double-tap zoom on buttons
    const buttons = [
        document.getElementById('undoBtn'),
        document.getElementById('clearBtn'),
        document.getElementById('downloadBtn'),
        document.getElementById('toggleToolbar')
    ];
    
    buttons.forEach(button => {
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            button.click();
        }, { passive: false });
    });

    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('clearBtn').addEventListener('click', clearCanvas);
    document.getElementById('downloadBtn').addEventListener('click', downloadCanvas);

    // Toggle toolbar minimize/expand
    const toolbar = document.getElementById('toolbar');
    const toggleBtn = document.getElementById('toggleToolbar');
    
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toolbar.classList.toggle('minimized');
        
        // Update tooltip and aria-label
        if (toolbar.classList.contains('minimized')) {
            toggleBtn.setAttribute('title', 'Expand');
        } else {
            toggleBtn.setAttribute('title', 'Minimize');
        }
    });

    window.addEventListener('resize', resizeCanvas);
}