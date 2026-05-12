// Fancy drawing mode functionality (Object-based Infinite Canvas)
function initFancyMode() {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    const brushPreview = document.getElementById('brushPreview');

    const ui = {
        undoBtn: document.getElementById('undoBtn'),
        clearBtn: document.getElementById('clearBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        toggleBtn: document.getElementById('toggleToolbar'),
        toolbar: document.getElementById('toolbar')
    };

    // State
    let shapes = []; // Array of shape objects
    let history = [];
    let historyStep = -1;

    // Viewport / Camera
    let camera = { x: 0, y: 0, z: 1 };

    // Interaction State
    let isPanning = false;
    let lastPointer = { x: 0, y: 0 };
    const activeStrokes = new Map(); // pointerId -> stroke

    // Pick random initial color (skip first 3: black, grey, light grey)
    // We'll set this properly after DOM init
    let currentColor = '#000000';
    let currentBrushSize = 8;

    // Constants
    const ZOOM_min = 0.1;
    const ZOOM_max = 5;

    // --- Core Logic: Coordinate Systems ---

    function screenToWorld(x, y) {
        return {
            x: (x - camera.x) / camera.z,
            y: (y - camera.y) / camera.z
        };
    }

    function worldToScreen(x, y) {
        return {
            x: (x * camera.z) + camera.x,
            y: (y * camera.z) + camera.y
        };
    }

    // --- Core Logic: Rendering ---

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.scale(dpr, dpr);
        render();
    }

    function render() {
        // Clear screen
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);

        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset for clear
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

        // Apply Camera Transform
        ctx.translate(camera.x, camera.y);
        ctx.scale(camera.z, camera.z);

        // Draw Shadows / Selection background (optional)

        // Draw Shapes
        for (const shape of shapes) {
            drawShape(ctx, shape);
        }

        // Draw Active Strokes (one per pointer)
        for (const stroke of activeStrokes.values()) {
            drawShape(ctx, stroke);
        }
    }

    function drawShape(context, shape) {
        if (shape.type === 'stroke') {
            if (shape.points.length < 2) return;

            context.beginPath();
            context.lineCap = 'round';
            context.lineJoin = 'round';
            context.lineWidth = shape.size;
            context.strokeStyle = shape.color;

            // Simple rendering for now (ignoring pressure for the path logic itself to keep it smooth)
            // We can upgrade to perfect-freehand later for variable width paths

            // Move to first point
            context.beginPath();

            if (shape.points.length === 1) {
                // Dot
                const p = shape.points[0];
                context.arc(p.x, p.y, shape.size / 2, 0, Math.PI * 2);
                context.fillStyle = shape.color;
                context.fill();
            } else {
                // Line
                const p0 = shape.points[0];
                context.moveTo(p0.x, p0.y);

                // Quadratic bezier smoothing
                for (let i = 1; i < shape.points.length - 1; i++) {
                    const p1 = shape.points[i];
                    const p2 = shape.points[i + 1];
                    const midX = (p1.x + p2.x) / 2;
                    const midY = (p1.y + p2.y) / 2;
                    // Varying line width based on pressure would happen here if manually filling paths
                    // For now, simple stroke
                    context.quadraticCurveTo(p1.x, p1.y, midX, midY);
                }

                const last = shape.points[shape.points.length - 1];
                context.lineTo(last.x, last.y);
                context.stroke();
            }
        }
    }

    // --- Interaction ---

    function handlePointerDown(e) {
        if (e.target.closest('#toolbar')) return;

        // Check for Middle Mouse or Spacebar -> Pan
        if (e.button === 1 || (e.button === 0 && e.getModifierState && e.getModifierState('Space'))) {
            isPanning = true;
            lastPointer = { x: e.clientX, y: e.clientY };
            canvas.style.cursor = 'grabbing';
            return;
        }
        if (e.button !== 0 && e.pointerType !== 'touch') return; // Allow touch pointers (no button check), only left click for mouse

        const worldPos = screenToWorld(e.clientX, e.clientY);

        canvas.setPointerCapture(e.pointerId);
        activeStrokes.set(e.pointerId, {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            type: 'stroke',
            color: currentColor,
            size: currentBrushSize,
            points: [{
                x: worldPos.x,
                y: worldPos.y,
                pressure: e.pressure || 0.5
            }]
        });
        render();
    }

    function handlePointerMove(e) {
        if (isPanning) {
            const dx = e.clientX - lastPointer.x;
            const dy = e.clientY - lastPointer.y;
            camera.x += dx;
            camera.y += dy;
            lastPointer = { x: e.clientX, y: e.clientY };
            render();
            return;
        }

        const stroke = activeStrokes.get(e.pointerId);
        if (!stroke) return;

        const worldPos = screenToWorld(e.clientX, e.clientY);
        stroke.points.push({
            x: worldPos.x,
            y: worldPos.y,
            pressure: e.pressure || 0.5
        });
        render();
    }

    function handlePointerUp(e) {
        if (isPanning) {
            isPanning = false;
            canvas.style.cursor = 'crosshair';
            return;
        }

        const stroke = activeStrokes.get(e.pointerId);
        if (stroke) {
            canvas.releasePointerCapture(e.pointerId);
            activeStrokes.delete(e.pointerId);
            shapes.push(stroke);
            saveState();
            render();
        }
    }

    function handlePointerCancel(e) {
        // Discard the stroke without saving (mirrors simple mode's touchcancel)
        if (activeStrokes.has(e.pointerId)) {
            activeStrokes.delete(e.pointerId);
            render();
        }
    }

    function handleWheel(e) {
        if (e.ctrlKey || e.metaKey) {
            // Zoom
            e.preventDefault();
            const zoomSensitivity = 0.001;
            const delta = -e.deltaY * zoomSensitivity;
            const oldZoom = camera.z;
            let newZoom = oldZoom * (1 + delta);

            // Clamp zoom
            newZoom = Math.max(ZOOM_min, Math.min(ZOOM_max, newZoom));

            // Zoom towards mouse pointer
            // world_mouse = (screen_mouse - camera) / zoom
            // world_mouse remains constant during zoom
            // (screen_mouse - new_camera) / new_zoom = (screen_mouse - old_camera) / old_zoom

            // Or simpler math:
            // Translate camera so mouse is at 0,0
            // Scale
            // Translate back

            const mouseX = e.clientX;
            const mouseY = e.clientY;

            const wx = (mouseX - camera.x) / oldZoom;
            const wy = (mouseY - camera.y) / oldZoom;

            camera.x = mouseX - wx * newZoom;
            camera.y = mouseY - wy * newZoom;
            camera.z = newZoom;

            render();
        } else {
            // Pan
            e.preventDefault(); // Prevent browser back/forward gestures
            camera.x -= e.deltaX;
            camera.y -= e.deltaY;
            render();
        }
    }

    // --- State Management ---

    function saveState() {
        // Deep copy shapes using structuredClone (faster than JSON stringify/parse)
        const snapshot = structuredClone(shapes);

        // If we are in the middle of history, cut off the future
        if (historyStep < history.length - 1) {
            history = history.slice(0, historyStep + 1);
        }

        history.push(snapshot);
        historyStep++;

        // Limit history size
        if (history.length > 50) {
            history.shift();
            historyStep--;
        }
    }

    function undo() {
        if (historyStep > 0) {
            historyStep--;
            shapes = structuredClone(history[historyStep]);
            render();
        } else if (historyStep === 0) {
            // Clear to empty
            historyStep = -1;
            shapes = [];
            render();
        }
    }

    // --- UI Logic ---

    // --- Events & Init ---

    window.addEventListener('resize', resizeCanvas);

    // Pointer Events
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerUp); // Treat leave as up
    canvas.addEventListener('pointercancel', handlePointerCancel);

    // Wheel
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // UI Listeners

    // Styles Menu Toggle
    const styleMenu = document.getElementById('styleMenu');
    const toggleStylesBtn = document.getElementById('toggleStyles');
    const previewDot = toggleStylesBtn.querySelector('.color-preview-dot');

    toggleStylesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        styleMenu.classList.toggle('visible');
        toggleStylesBtn.classList.toggle('active', styleMenu.classList.contains('visible'));
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!styleMenu.contains(e.target) && !toggleStylesBtn.contains(e.target)) {
            styleMenu.classList.remove('visible');
            toggleStylesBtn.classList.remove('active');
        }
    });

    // Close menu when touching canvas (mobile)
    canvas.addEventListener('touchstart', () => {
        styleMenu.classList.remove('visible');
        toggleStylesBtn.classList.remove('active');
    }, { passive: true });

    function updatePreview() {
        previewDot.style.backgroundColor = currentColor;
        // Optionally update size of preview dot based on brush size?
        // previewDot.style.width = Math.max(12, currentBrushSize * 2) + 'px';
        // previewDot.style.height = Math.max(12, currentBrushSize * 2) + 'px';
    }

    // Color Buttons
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentColor = btn.dataset.color;
            updatePreview();
        });
    });

    // Size Buttons
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');

            currentBrushSize = parseInt(btn.dataset.size, 10);
            updatePreview();
        });
    });

    ui.undoBtn.addEventListener('click', undo);

    ui.clearBtn.addEventListener('click', () => {
        shapes = [];
        saveState();
        render();
    });

    ui.downloadBtn.addEventListener('click', () => {
        // Export viewport using toBlob for better performance
        canvas.toBlob((blob) => {
            if (!blob) return;

            // Check if Web Share API is supported
            if (navigator.share) {
                const file = new File([blob], `drawstring-${Date.now()}.png`, { type: 'image/png' });
                navigator.share({
                    files: [file],
                    title: 'Drawstring',
                    text: 'My drawing from Drawstring'
                }).catch((err) => {
                    // User cancelled or share failed, fallback to download
                    if (err.name !== 'AbortError') {
                        console.error('Share failed:', err);
                        fallbackDownload(blob);
                    }
                });
            } else {
                // Fallback to download if Web Share API is not supported
                fallbackDownload(blob);
            }
        }, 'image/png');
    });

    function fallbackDownload(blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `drawstring-${Date.now()}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    ui.toggleBtn.addEventListener('click', () => {
        ui.toolbar.classList.toggle('minimized');
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            undo();
        }
    });

    // Initialize
    resizeCanvas();
    canvas.style.cursor = 'crosshair';
    ui.toolbar.style.display = 'flex'; // Initial show

    // Initial State & Random Color
    // Randomize color (skip first 2: black, grey)
    const colorBtns = document.querySelectorAll('.color-btn');
    if (colorBtns.length > 2) {
        const randomIndex = 2 + Math.floor(Math.random() * (colorBtns.length - 2));
        const randomBtn = colorBtns[randomIndex];
        if (randomBtn) {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            randomBtn.classList.add('active');
            currentColor = randomBtn.dataset.color;
        }
    }

    updatePreview();
    saveState();
}