// --- 1. Dictionaries ---
const DICT_LETTERS = { 'A':'.-', 'B':'-...', 'C':'-.-.', 'D':'-..', 'E':'.', 'F':'..-.', 'G':'--.', 'H':'....', 'I':'..', 'J':'.---', 'K':'-.-', 'L':'.-..', 'M':'--', 'N':'-.', 'O':'---', 'P':'.--.', 'Q':'--.-', 'R':'.-.', 'S':'...', 'T':'-', 'U':'..-', 'V':'...-', 'W':'.--', 'X':'-..-', 'Y':'-.--', 'Z':'--..' };
const DICT_NUMBERS = { '0':'-----', '1':'.----', '2':'..---', '3':'...--', '4':'....-', '5':'.....', '6':'-....', '7':'--...', '8':'---..', '9':'----.' };
const DICT_SYMBOLS = { '.':'.-.-.-', ',':'--..--', '?':'..--..', "'":'.----.', '!':'-.-.--', '/':'-..-.', '(':'-.--.', ')':'-.--.-', '@':'.--.-.' };
const MORSE_DICT = { ...DICT_LETTERS, ...DICT_NUMBERS, ...DICT_SYMBOLS };
const REVERSE_DICT = Object.entries(MORSE_DICT).reduce((acc, [key, value]) => { acc[value] = key; return acc; }, {});

// --- 2. Safari Zoom Prevention ---
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => { const now = (new Date()).getTime(); if (now - lastTouchEnd <= 300) e.preventDefault(); lastTouchEnd = now; }, false);
document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

// --- 3. DOM Elements ---
const ui = {
    bgAnim: document.getElementById('bg-animation'), mainOutput: document.getElementById('main-output'),
    currentMorseBuffer: document.getElementById('current-morse-buffer'), calcGrid: document.getElementById('calc-grid'),
    keyboardGrid: document.getElementById('keyboard-grid'), textInput: document.getElementById('text-input'),
    btnKeyboardToggle: document.getElementById('btn-keyboard-toggle'),

    btnDot: document.getElementById('btn-dot'), btnDash: document.getElementById('btn-dash'), btnSpace: document.getElementById('btn-space'),
    btnDel: document.getElementById('btn-del'), btnSend: document.getElementById('btn-send'), btnReset: document.getElementById('btn-reset'),

    btnSettings: document.getElementById('btn-settings'), btnCloseSettings: document.getElementById('btn-close-settings'), settingsModal: document.getElementById('settings-modal'),
    toggleSound: document.getElementById('toggle-sound'), toggleVibe: document.getElementById('toggle-vibe'),
    btnExportTxt: document.getElementById('btn-export-txt'), btnExportCsv: document.getElementById('btn-export-csv'), uiScaleSlider: document.getElementById('ui-scale'),

    btnGuide: document.getElementById('btn-guide'), btnCloseGuide: document.getElementById('btn-close-guide'), guideModal: document.getElementById('guide-modal'),
    gridLetters: document.getElementById('guide-grid-letters'), gridNumbers: document.getElementById('guide-grid-numbers'), gridSymbols: document.getElementById('guide-grid-symbols'),

    btnCamera: document.getElementById('btn-camera'), cameraInput: document.getElementById('camera-input'), cropModal: document.getElementById('crop-modal'),
    btnCloseCrop: document.getElementById('btn-close-crop'), cropImage: document.getElementById('crop-image'), btnRunOcr: document.getElementById('btn-run-ocr')
};

// --- State Variables ---
let currentMorseChar = "";
let translatedMessage = "";
let isKeyboardMode = false;
let isSoundEnabled = false; // Disabled by default per request
let isVibeEnabled = true;
let cropperInstance = null;

// --- Hardware Feedback (Sound strictly limited to dot/dash) ---
let audioCtx;
const initAudio = () => { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); };

const playTone = (durationMs) => {
    if (!isSoundEnabled) return; initAudio();
    const oscillator = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime); gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.01);
    gainNode.gain.setValueAtTime(1, audioCtx.currentTime + (durationMs/1000) - 0.01); gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + (durationMs/1000));
    oscillator.connect(gainNode); gainNode.connect(audioCtx.destination);
    oscillator.start(); oscillator.stop(audioCtx.currentTime + (durationMs/1000));
};

const triggerFeedback = (type, btnElement, playSound = false) => {
    const baseDuration = type === 'dot' ? 100 : 300;

    if (playSound) playTone(baseDuration);
    if (isVibeEnabled && navigator.vibrate) navigator.vibrate(baseDuration);
    if (btnElement && isVibeEnabled) {
        btnElement.classList.add('visual-shake');
        btnElement.style.animationDuration = `${baseDuration}ms`;
        setTimeout(() => btnElement.classList.remove('visual-shake'), baseDuration);
    }
};

// --- SPA GSAP Toggle ---
ui.btnKeyboardToggle.addEventListener('click', () => {
    isKeyboardMode = !isKeyboardMode;
    ui.btnKeyboardToggle.setAttribute('aria-pressed', isKeyboardMode);

    currentMorseChar = ""; translatedMessage = ""; ui.textInput.value = ""; updateDisplay();
    triggerFeedback('dot', ui.btnKeyboardToggle, false);

    if (isKeyboardMode) {
        ui.btnKeyboardToggle.classList.add('active-keyboard-btn');
        gsap.to(ui.calcGrid, { opacity: 0, y: 20, duration: 0.2, onComplete: () => {
            ui.calcGrid.style.display = 'none'; ui.keyboardGrid.style.display = 'block';
            gsap.fromTo(ui.keyboardGrid, {opacity: 0, y: -20}, {opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.7)", onComplete: () => ui.textInput.focus()});
        }});
    } else {
        ui.btnKeyboardToggle.classList.remove('active-keyboard-btn');
        gsap.to(ui.keyboardGrid, { opacity: 0, y: -20, duration: 0.2, onComplete: () => {
            ui.keyboardGrid.style.display = 'none'; ui.calcGrid.style.display = 'grid';
            gsap.fromTo(ui.calcGrid, {opacity: 0, y: 20}, {opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.7)"});
        }});
    }
});

// --- Unified Display Logic ---
const updateDisplay = () => {
    if (isKeyboardMode) {
        ui.mainOutput.innerText = translatedMessage === "" ? "Awaiting input..." : translatedMessage;
        ui.bgAnim.innerText = translatedMessage; ui.currentMorseBuffer.innerText = "";
    } else {
        ui.mainOutput.innerText = translatedMessage === "" ? "Awaiting input..." : translatedMessage;
        ui.currentMorseBuffer.innerText = currentMorseChar; ui.bgAnim.innerText = translatedMessage;
    }
};

ui.textInput.addEventListener('input', (e) => {
    const rawText = e.target.value.toUpperCase();
    if (rawText.trim() === "") { translatedMessage = ""; updateDisplay(); return; }
    translatedMessage = rawText.split('').map(char => {
        if (char === ' ' || char === '\n') return '/';
        return MORSE_DICT[char] !== undefined ? MORSE_DICT[char] : char;
    }).join(' '); updateDisplay();
});

// --- Calculator Inputs ---
ui.btnDot.addEventListener('click', () => { triggerFeedback('dot', ui.btnDot, true); currentMorseChar += "."; updateDisplay(); });
ui.btnDash.addEventListener('click', () => { triggerFeedback('dash', ui.btnDash, true); currentMorseChar += "-"; updateDisplay(); });
ui.btnSpace.addEventListener('click', () => { triggerFeedback('dot', ui.btnSpace, false); if (currentMorseChar !== "") { translatedMessage += (REVERSE_DICT[currentMorseChar] || '?'); currentMorseChar = ""; } else { translatedMessage += " "; } updateDisplay(); });

const deleteAction = () => { if (currentMorseChar.length > 0) currentMorseChar = currentMorseChar.slice(0, -1); else if (translatedMessage.length > 0) translatedMessage = translatedMessage.slice(0, -1); updateDisplay(); triggerFeedback('dot', ui.btnDel, false); };
const deleteWordAction = () => { if (translatedMessage.length > 0) { const lastSpaceIndex = translatedMessage.trimEnd().lastIndexOf(" "); translatedMessage = lastSpaceIndex === -1 ? "" : translatedMessage.substring(0, lastSpaceIndex + 1); currentMorseChar = ""; updateDisplay(); if (isVibeEnabled && navigator.vibrate) navigator.vibrate([50, 50, 50]); } };

let deleteTimer;
const startDelete = (e) => { e.preventDefault(); deleteAction(); deleteTimer = setTimeout(deleteWordAction, 600); };
const endDelete = () => clearTimeout(deleteTimer);
ui.btnDel.addEventListener('mousedown', startDelete); ui.btnDel.addEventListener('touchstart', startDelete, {passive: false});
ui.btnDel.addEventListener('mouseup', endDelete); ui.btnDel.addEventListener('mouseleave', endDelete); ui.btnDel.addEventListener('touchend', endDelete);

ui.btnReset.addEventListener('click', () => { currentMorseChar = ""; translatedMessage = ""; ui.textInput.value = ""; updateDisplay(); triggerFeedback('dash', ui.btnReset, false); });
ui.btnSend.addEventListener('click', () => { if (currentMorseChar !== "") { translatedMessage += (REVERSE_DICT[currentMorseChar] || '?'); currentMorseChar = ""; updateDisplay(); } ui.mainOutput.style.backgroundColor = 'var(--accent-1)'; ui.mainOutput.style.color = '#1e1e24'; setTimeout(() => { ui.mainOutput.style.backgroundColor = 'var(--bg-secondary)'; ui.mainOutput.style.color = 'var(--text-primary)'; }, 200); triggerFeedback('dash', ui.btnSend, false);});

// --- Guide, Modals & GSAP Tooltips ---
const populateGrid = (dict, targetGrid) => {
    Object.entries(dict).forEach(([char, code]) => {
        const item = document.createElement('div'); item.className = 'guide-item focus-ring';
        item.setAttribute('tabindex', '0'); item.setAttribute('role', 'button');
        item.innerHTML = `<span>${char}</span><span class="guide-morse">${code}</span>`;

        const copyAction = (e) => {
            navigator.clipboard.writeText(code).then(() => {
                if (item.querySelector('.copy-tooltip')) return;
                const tooltip = document.createElement('div'); tooltip.className = 'copy-tooltip'; tooltip.innerText = 'Copied!';
                item.appendChild(tooltip);

                gsap.fromTo(tooltip, { y: 10, opacity: 0, scale: 0.8, xPercent: -50 }, { y: -5, opacity: 1, scale: 1, duration: 0.2, ease: "back.out(2)", onComplete: () => {
                    gsap.to(tooltip, { opacity: 0, y: -15, duration: 0.2, delay: 0.5, onComplete: () => tooltip.remove() });
                }});

                item.style.backgroundColor = 'var(--accent-1)'; item.style.color = 'var(--bg-primary)';
                if (isVibeEnabled && navigator.vibrate) navigator.vibrate(30);
                setTimeout(() => { item.style.backgroundColor = ''; item.style.color = ''; }, 250);
            });
        };

        item.addEventListener('click', copyAction);
        item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copyAction(e); }});
        targetGrid.appendChild(item);
    });
};
populateGrid(DICT_LETTERS, ui.gridLetters); populateGrid(DICT_NUMBERS, ui.gridNumbers); populateGrid(DICT_SYMBOLS, ui.gridSymbols);

const openModal = (modal) => modal.classList.add('show');
const closeModal = (modal) => modal.classList.remove('show');
document.querySelectorAll('.modal').forEach(modal => { modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); }); });
ui.btnGuide.addEventListener('click', () => openModal(ui.guideModal)); ui.btnCloseGuide.addEventListener('click', () => closeModal(ui.guideModal));
ui.btnSettings.addEventListener('click', () => openModal(ui.settingsModal)); ui.btnCloseSettings.addEventListener('click', () => closeModal(ui.settingsModal));

// --- Camera OCR ---
ui.btnCamera.addEventListener('click', () => ui.cameraInput.click());
ui.cameraInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            ui.cropImage.src = event.target.result; openModal(ui.cropModal);
            if (cropperInstance) cropperInstance.destroy();
            cropperInstance = new Cropper(ui.cropImage, { viewMode: 1, autoCropArea: 0.8, background: false });
        }; reader.readAsDataURL(file);
    } e.target.value = '';
});
ui.btnCloseCrop.addEventListener('click', () => { closeModal(ui.cropModal); if (cropperInstance) cropperInstance.destroy(); });
ui.btnRunOcr.addEventListener('click', async () => {
    if (!cropperInstance) return;
    const originalText = ui.btnRunOcr.innerHTML; ui.btnRunOcr.innerHTML = '<span class="material-symbols-rounded">hourglass_empty</span> Scanning...'; ui.btnRunOcr.disabled = true;
    const canvas = cropperInstance.getCroppedCanvas(); const imageData = canvas.toDataURL('image/png');
    try {
        const result = await Tesseract.recognize(imageData, 'eng');
        let extractedText = result.data.text.trim();
        if (extractedText) {
            if(!isKeyboardMode) ui.btnKeyboardToggle.click();
            setTimeout(() => { ui.textInput.value = extractedText; ui.textInput.dispatchEvent(new Event('input')); }, 300);
        }
        closeModal(ui.cropModal); if (cropperInstance) cropperInstance.destroy();
    } catch (err) { alert("Failed to scan text."); } finally { ui.btnRunOcr.innerHTML = originalText; ui.btnRunOcr.disabled = false; }
});

// --- Settings & Exports ---
ui.toggleSound.addEventListener('change', (e) => isSoundEnabled = e.target.checked);
ui.toggleVibe.addEventListener('change', (e) => isVibeEnabled = e.target.checked);
ui.uiScaleSlider.addEventListener('input', (e) => document.documentElement.style.setProperty('--app-scale', e.target.value));

ui.btnExportTxt.addEventListener('click', () => {
    let textToExport = translatedMessage; if (!textToExport) return;
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([textToExport], { type: "text/plain" }));
    a.download = "doT.dasH_Export.txt"; a.click();
});
ui.btnExportCsv.addEventListener('click', () => {
    let textToExport = translatedMessage; if (!textToExport) return;
    const csvContent = `Timestamp,Translation\n"${new Date().toLocaleString()}","${textToExport.replace(/"/g, '""')}"`;
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }));
    a.download = "doT.dasH_Export.csv"; a.click();
});