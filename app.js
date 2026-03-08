const MORSE_DICT = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
    '8': '---..', '9': '----.', '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '@': '.--.-.'
};

const REVERSE_DICT = Object.entries(MORSE_DICT).reduce((acc, [key, value]) => { acc[value] = key; return acc; }, {});

const ui = {
    switchMode: document.getElementById('ui-switch'),
    toggleLabel: document.getElementById('toggle-label'),
    viewTextToMorse: document.getElementById('view-text-to-morse'),
    viewMorseToText: document.getElementById('view-morse-to-text'),
    textInput: document.getElementById('text-input'),
    morseOutput: document.getElementById('morse-output'),
    textOutput: document.getElementById('text-output'),
    currentMorseBuffer: document.getElementById('current-morse-buffer'),

    btnDot: document.getElementById('btn-dot'), btnDash: document.getElementById('btn-dash'), btnSpace: document.getElementById('btn-space'),
    btnDel: document.getElementById('btn-del'), btnSend: document.getElementById('btn-send'), btnReset: document.getElementById('btn-reset'),

    btnSettings: document.getElementById('btn-settings'), btnCloseSettings: document.getElementById('btn-close-settings'), settingsModal: document.getElementById('settings-modal'),
    toggleSound: document.getElementById('toggle-sound'), toggleVibe: document.getElementById('toggle-vibe'), vibeDuration: document.getElementById('vibe-duration'),
    btnExport: document.getElementById('btn-export'), uiScaleSlider: document.getElementById('ui-scale'),

    btnGuide: document.getElementById('btn-guide'), btnCloseGuide: document.getElementById('btn-close-guide'), guideModal: document.getElementById('guide-modal'), guideGrid: document.getElementById('guide-grid'),
    btnCamera: document.getElementById('btn-camera'), cameraInput: document.getElementById('camera-input'), cropModal: document.getElementById('crop-modal'),
    btnCloseCrop: document.getElementById('btn-close-crop'), cropImage: document.getElementById('crop-image'), btnRunOcr: document.getElementById('btn-run-ocr')
};

let currentMorseChar = ""; let translatedMessage = ""; let deleteTimer;
let isMorseMode = true; let isSoundEnabled = true; let isVibeEnabled = true; let vibeMultiplier = 1;
let cropperInstance = null;

// --- Populate Guide ---
Object.entries(MORSE_DICT).forEach(([letter, code]) => {
    if(letter !== '/') {
        const item = document.createElement('div'); item.className = 'guide-item';
        item.innerHTML = `<span>${letter}</span><span class="guide-morse">${code}</span>`;
        ui.guideGrid.appendChild(item);
    }
});

ui.btnGuide.addEventListener('click', () => ui.guideModal.classList.add('show'));
ui.btnCloseGuide.addEventListener('click', () => ui.guideModal.classList.remove('show'));

// --- Hardware Feedback ---
let audioCtx;
const initAudio = () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
};

const playTone = (durationMs) => {
    if (!isSoundEnabled) return; initAudio();
    const oscillator = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime); gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.01);
    gainNode.gain.setValueAtTime(1, audioCtx.currentTime + (durationMs/1000) - 0.01); gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + (durationMs/1000));
    oscillator.connect(gainNode); gainNode.connect(audioCtx.destination);
    oscillator.start(); oscillator.stop(audioCtx.currentTime + (durationMs/1000));
};

const triggerFeedback = (type) => {
    const baseDuration = type === 'dot' ? 100 : 300; playTone(baseDuration);
    if (isVibeEnabled && navigator.vibrate) navigator.vibrate(baseDuration * vibeMultiplier);
};

// --- Camera OCR ---
ui.btnCamera.addEventListener('click', () => ui.cameraInput.click());
ui.cameraInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            ui.cropImage.src = event.target.result; ui.cropModal.classList.add('show');
            if (cropperInstance) cropperInstance.destroy();
            cropperInstance = new Cropper(ui.cropImage, { viewMode: 1, autoCropArea: 0.8, background: false });
        };
        reader.readAsDataURL(file);
    }
    e.target.value = '';
});

ui.btnCloseCrop.addEventListener('click', () => { ui.cropModal.classList.remove('show'); if (cropperInstance) cropperInstance.destroy(); });

ui.btnRunOcr.addEventListener('click', async () => {
    if (!cropperInstance) return;
    const originalText = ui.btnRunOcr.innerHTML;
    ui.btnRunOcr.innerHTML = '<span class="material-symbols-rounded">hourglass_empty</span> Scanning...';
    ui.btnRunOcr.disabled = true;
    const canvas = cropperInstance.getCroppedCanvas(); const imageData = canvas.toDataURL('image/png');

    try {
        const result = await Tesseract.recognize(imageData, 'eng');
        let extractedText = result.data.text.trim();
        if (extractedText) { ui.textInput.value = extractedText; ui.textInput.dispatchEvent(new Event('input')); }
        ui.cropModal.classList.remove('show'); if (cropperInstance) cropperInstance.destroy();
    } catch (err) { alert("Failed to scan text. Please try again."); }
    finally { ui.btnRunOcr.innerHTML = originalText; ui.btnRunOcr.disabled = false; }
});

// --- UI Logic & Mode Toggling ---
const updateDisplay = () => { ui.textOutput.innerText = translatedMessage === "" ? "Awaiting input..." : translatedMessage; ui.currentMorseBuffer.innerText = currentMorseChar; };

ui.textInput.addEventListener('input', (e) => {
    const rawText = e.target.value.toUpperCase();
    if (rawText.trim() === "") { ui.morseOutput.innerHTML = '<span class="placeholder">...</span>'; return; }
    const morse = rawText.split('').map(char => { if (char === ' ' || char === '\n') return '/'; return MORSE_DICT[char] !== undefined ? MORSE_DICT[char] : char; }).join(' ');
    ui.morseOutput.innerText = morse;
});

ui.switchMode.addEventListener('change', (e) => {
    isMorseMode = !e.target.checked;

    // Smooth Text Transition
    ui.toggleLabel.classList.remove('active-label');
    setTimeout(() => {
        ui.toggleLabel.innerText = isMorseMode ? "MORSE" : "TXT";
        ui.toggleLabel.classList.add('active-label');
    }, 150);

    // View Toggling
    if (isMorseMode) { ui.viewTextToMorse.classList.add('hidden'); ui.viewMorseToText.classList.remove('hidden'); }
    else { ui.viewMorseToText.classList.add('hidden'); ui.viewTextToMorse.classList.remove('hidden'); }
});

// --- Calculator Logic ---
ui.btnDot.addEventListener('click', () => { triggerFeedback('dot'); currentMorseChar += "."; updateDisplay(); });
ui.btnDash.addEventListener('click', () => { triggerFeedback('dash'); currentMorseChar += "-"; updateDisplay(); });
ui.btnSpace.addEventListener('click', () => { if (currentMorseChar !== "") { translatedMessage += (REVERSE_DICT[currentMorseChar] || '?'); currentMorseChar = ""; } else { translatedMessage += " "; } updateDisplay(); });

const deleteAction = () => { if (currentMorseChar.length > 0) currentMorseChar = currentMorseChar.slice(0, -1); else if (translatedMessage.length > 0) translatedMessage = translatedMessage.slice(0, -1); updateDisplay(); if (isVibeEnabled && navigator.vibrate) navigator.vibrate(50 * vibeMultiplier); };
const deleteWordAction = () => { if (translatedMessage.length > 0) { const lastSpaceIndex = translatedMessage.trimEnd().lastIndexOf(" "); translatedMessage = lastSpaceIndex === -1 ? "" : translatedMessage.substring(0, lastSpaceIndex + 1); currentMorseChar = ""; updateDisplay(); if (isVibeEnabled && navigator.vibrate) navigator.vibrate([50, 50, 50].map(v => v * vibeMultiplier)); } };

let deleteInterval;
const startDelete = (e) => { e.preventDefault(); deleteAction(); deleteTimer = setTimeout(deleteWordAction, 600); };
const endDelete = () => clearTimeout(deleteTimer);
ui.btnDel.addEventListener('mousedown', startDelete); ui.btnDel.addEventListener('touchstart', startDelete, {passive: false});
ui.btnDel.addEventListener('mouseup', endDelete); ui.btnDel.addEventListener('mouseleave', endDelete); ui.btnDel.addEventListener('touchend', endDelete);

ui.btnReset.addEventListener('click', () => { currentMorseChar = ""; translatedMessage = ""; ui.textInput.value = ""; ui.morseOutput.innerHTML = '<span class="placeholder">...</span>'; updateDisplay(); if (isVibeEnabled && navigator.vibrate) navigator.vibrate(40 * vibeMultiplier); });
ui.btnSend.addEventListener('click', () => { if (currentMorseChar !== "") { translatedMessage += (REVERSE_DICT[currentMorseChar] || '?'); currentMorseChar = ""; updateDisplay(); } ui.textOutput.style.backgroundColor = 'var(--accent-color)'; ui.textOutput.style.color = '#1e1e24'; setTimeout(() => { ui.textOutput.style.backgroundColor = 'var(--bg-secondary)'; ui.textOutput.style.color = 'var(--text-primary)'; }, 200); });

// --- Settings & Scale ---
ui.btnSettings.addEventListener('click', () => ui.settingsModal.classList.add('show')); ui.btnCloseSettings.addEventListener('click', () => ui.settingsModal.classList.remove('show'));
ui.toggleSound.addEventListener('change', (e) => isSoundEnabled = e.target.checked); ui.toggleVibe.addEventListener('change', (e) => isVibeEnabled = e.target.checked);
ui.vibeDuration.addEventListener('input', (e) => vibeMultiplier = parseFloat(e.target.value));
ui.uiScaleSlider.addEventListener('input', (e) => document.documentElement.style.setProperty('--app-scale', e.target.value));

ui.btnExport.addEventListener('click', () => { let textToExport = isMorseMode ? translatedMessage : ui.morseOutput.innerText; if (!textToExport || textToExport === "..." || textToExport === "Awaiting input...") return; const blob = new Blob([textToExport], { type: "text/plain" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "doT.dasH_Export.txt"; a.click(); URL.revokeObjectURL(url); });