// Fancy drawing mode functionality (Object-based Infinite Canvas)
function initFancyMode() {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    const brushPreview = document.getElementById('brushPreview');

    const ui = {
        toolDraw: document.getElementById('toolDraw'),
        toolSelect: document.getElementById('toolSelect'),
        undoBtn: document.getElementById('undoBtn'),
        clearBtn: document.getElementById('clearBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        toggleBtn: document.getElementById('toggleToolbar'),
        toolbar: document.getElementById('toolbar')
    };

    // State
    let shapes = []; // Array of shape objects
    let selectedShapeIds = new Set();
    let history = [];
    let historyStep = -1;

    // Viewport / Camera
    let camera = { x: 0, y: 0, z: 1 };

    // Interaction State
    let isDragging = false;
    let isPanning = false;
    let hasMoved = false; // Track if selection was actually moved
    let lastPointer = { x: 0, y: 0 };
    let activeStroke = null; // The stroke currently being drawn
    let activeTool = 'draw'; // 'draw' or 'select'

    // Pick random initial color (skip first 3: black, grey, light grey)
    // We'll set this properly after DOM init
    let currentColor = '#000000';
    let currentBrushSize = 2;

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
            drawShape(ctx, shape, selectedShapeIds.has(shape.id));
        }

        // Draw Active Stroke (if any)
        if (activeStroke) {
            drawShape(ctx, activeStroke, false);
        }
    }

    function drawShape(context, shape, isSelected) {
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

            // Selection Outline
            if (isSelected) {
                context.save();
                context.lineWidth = 1 / camera.z; // Constant 1px width in screen space
                context.strokeStyle = '#2f80ed';
                context.stroke(); // Stroke again with selection color (center)
                // Bounding box would be better
                const bounds = getBounds(shape);
                drawBounds(context, bounds);
                context.restore();
            }
        }
    }

    function getBounds(shape) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        if (shape.type === 'stroke') {
            for (const p of shape.points) {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            }
            const pad = shape.size / 2;
            return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
        }
        return { x: 0, y: 0, w: 0, h: 0 };
    }

    function drawBounds(context, bounds) {
        context.strokeStyle = '#2f80ed';
        context.lineWidth = 1 / camera.z;
        context.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
    }

    function hitTest(x, y) {
        // Reverse iterate to hit top-most items first
        for (let i = shapes.length - 1; i >= 0; i--) {
            const shape = shapes[i];
            const bounds = getBounds(shape);
            // Simple bounding box hit test + padding
            const padding = 10 / camera.z;
            if (x >= bounds.x - padding && x <= bounds.x + bounds.w + padding &&
                y >= bounds.y - padding && y <= bounds.y + bounds.h + padding) {
                return shape;
            }
        }
        return null;
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
        if (e.button !== 0) return; // Only left click for tools

        const worldPos = screenToWorld(e.clientX, e.clientY);

        if (activeTool === 'draw') {
            isDragging = true;
            activeStroke = {
                id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                type: 'stroke',
                color: currentColor,
                size: currentBrushSize,
                points: [{
                    x: worldPos.x,
                    y: worldPos.y,
                    pressure: e.pressure || 0.5
                }]
            };
            // Deselect all when drawing
            selectedShapeIds.clear();
            render();
        } else if (activeTool === 'select') {
            hasMoved = false; // Reset move tracking
            const hit = hitTest(worldPos.x, worldPos.y);
            if (hit) {
                if (!e.shiftKey && !selectedShapeIds.has(hit.id)) {
                    selectedShapeIds.clear();
                }
                selectedShapeIds.add(hit.id);
                isDragging = true;
                lastPointer = worldPos; // Store WORLD pos for moving shapes
            } else {
                // Clicked empty space -> Deselect or start Box Select (future)
                if (!e.shiftKey) {
                    selectedShapeIds.clear();
                }
                isPanning = true; // Fallback to pan on empty space in select mode? Or box select?
                // For now, let's just deselect. 
                // Alternatively, standard behavior: drag background = box select or pan.
                // Let's make drag background = pan for now to keep it usable.
                isPanning = true;
                lastPointer = { x: e.clientX, y: e.clientY };
            }
            render();
        }
    }

    function handlePointerMove(e) {
        const worldPos = screenToWorld(e.clientX, e.clientY);

        // Update Brush Preview
        if (activeTool === 'draw') {
            // Logic to show brush cursor could go here
            // But DOM cursor is simpler for now
        }

        if (isPanning) {
            const dx = e.clientX - lastPointer.x;
            const dy = e.clientY - lastPointer.y;
            camera.x += dx;
            camera.y += dy;
            lastPointer = { x: e.clientX, y: e.clientY };
            render();
            return;
        }

        if (!isDragging) return;

        if (activeTool === 'draw' && activeStroke) {
            // Add point
            // Distance check optional for smoothing, but raw input is fine for now
            activeStroke.points.push({
                x: worldPos.x,
                y: worldPos.y,
                pressure: e.pressure || 0.5
            });
            render();
        } else if (activeTool === 'select' && selectedShapeIds.size > 0) {
            // Move selected shapes
            const dx = worldPos.x - lastPointer.x;
            const dy = worldPos.y - lastPointer.y;

            if (dx !== 0 || dy !== 0) { // Only mark as moved if there's actual displacement
                hasMoved = true;
                for (const shape of shapes) {
                    if (selectedShapeIds.has(shape.id)) {
                        // Update all points of the shape
                        shape.points.forEach(p => {
                            p.x += dx;
                            p.y += dy;
                        });
                    }
                }
                lastPointer = worldPos;
                render();
            }
        }
    }

    function handlePointerUp(e) {
        if (isPanning) {
            isPanning = false;
            canvas.style.cursor = 'crosshair'; // or default
            return;
        }

        if (activeTool === 'draw' && activeStroke) {
            // Commit stroke directly to shapes
            // Actually, we push, then save? 
            // Standard undo: History stack contains snapshots of 'shapes' array.

            shapes.push(activeStroke);
            activeStroke = null;
            saveState(); // Save new state
            isDragging = false;
            render();
        } else if (activeTool === 'select') {
            isDragging = false;
            // Only save if we actually moved something
            if (selectedShapeIds.size > 0 && hasMoved) {
                saveState();
                hasMoved = false; // Reset for next interaction
            }
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
        // Deep copy shapes
        // Optimization: structural sharing or JSON stringify
        const snapshot = JSON.stringify(shapes);

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
            shapes = JSON.parse(history[historyStep]);
            render();
        } else if (historyStep === 0) {
            // Clear to empty
            historyStep = -1;
            shapes = [];
            render();
        }
    }

    // --- UI Logic ---

    function setTool(tool) {
        activeTool = tool;
        ui.toolDraw.classList.toggle('active', tool === 'draw');
        ui.toolSelect.classList.toggle('active', tool === 'select');
        canvas.style.cursor = tool === 'draw' ? 'crosshair' : 'default';
        selectedShapeIds.clear();
        render();
    }

    // --- Events & Init ---

    window.addEventListener('resize', resizeCanvas);

    // Pointer Events
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerUp); // Treat leave as up

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

            // Update Selection
            if (selectedShapeIds.size > 0) {
                shapes.forEach(s => {
                    if (selectedShapeIds.has(s.id)) s.color = currentColor;
                });
                saveState();
                render();
            }
        });
    });

    // Size Buttons
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');

            currentBrushSize = parseInt(btn.dataset.size, 10);
            updatePreview();

            // Update Selection
            if (selectedShapeIds.size > 0) {
                shapes.forEach(s => {
                    if (selectedShapeIds.has(s.id)) s.size = currentBrushSize;
                });
                saveState();
                render();
            }
        });
    });

    ui.toolDraw.addEventListener('click', () => setTool('draw'));
    ui.toolSelect.addEventListener('click', () => setTool('select'));

    ui.undoBtn.addEventListener('click', undo);

    ui.clearBtn.addEventListener('click', () => {
        shapes = [];
        selectedShapeIds.clear();
        saveState();
        render();
    });

    ui.downloadBtn.addEventListener('click', () => {
        // Export viewport using toBlob for better performance (works best on server)
        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `drawstring-${Date.now()}.png`;
            link.href = url;
            document.body.appendChild(link); // Required for Chrome to respect filename
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 'image/png');
    });

    ui.toggleBtn.addEventListener('click', () => {
        ui.toolbar.classList.toggle('minimized');
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            undo();
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedShapeIds.size > 0) {
                shapes = shapes.filter(s => !selectedShapeIds.has(s.id));
                selectedShapeIds.clear();
                saveState();
                render();
            }
        }
        // Tool shortcuts
        if (e.key === 'v' || e.key === '1') setTool('select');
        if (e.key === 'p' || e.key === 'b' || e.key === '2') setTool('draw');
    });

    // Initialize
    resizeCanvas();
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