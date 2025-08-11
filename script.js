const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size to fill viewport while maintaining circle
function setCanvasSize() {
    const size = Math.min(window.innerWidth * 0.85, window.innerHeight * 0.85);
    canvas.width = size;
    canvas.height = size;
    return size;
}

let size = setCanvasSize();
let centerX = size / 2;
let centerY = size / 2;
let maxRadius = size / 2 - 10;

// Musical notes in chromatic scale
const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const octaves = 4; // Number of octaves (rings) - octaves 3-6, center empty

let hoveredNote = null;
let hoveredOctave = null;
let highlightedSegments = []; // Changed to track specific segments

// Audio context for sound generation
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

// Note to frequency mapping (A4 = 440Hz standard tuning)
function noteToFrequency(note, octave) {
    const noteIndex = notes.indexOf(note);
    const a4 = 440; // A4 = 440 Hz (concert pitch)
    // A is at index 9 in our notes array
    // Calculate semitones from A4
    const halfSteps = noteIndex - 9 + (octave - 4) * 12;
    return a4 * Math.pow(2, halfSteps / 12);
}

// Color mapping - chromatic circle of fifths inspired
function noteToHue(noteIndex) {
    // Map notes to colors in a perceptually pleasing way
    const hueMap = {
        0: 0,     // C - Red
        1: 30,    // C# - Orange-Red
        2: 45,    // D - Orange
        3: 60,    // D# - Yellow-Orange
        4: 90,    // E - Yellow-Green
        5: 120,   // F - Green
        6: 180,   // F# - Cyan
        7: 210,   // G - Blue-Cyan
        8: 240,   // G# - Blue
        9: 270,   // A - Purple
        10: 300,  // A# - Magenta
        11: 330   // B - Pink-Red
    };
    return hueMap[noteIndex];
}

// Convert HSL to RGB for blending calculations
function hslToRgb(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    
    const a = s * Math.min(l, 1 - l);
    const f = (n, k = (n + h * 12) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

// Convert RGB back to HSL
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;
    const l = sum / 2;
    
    if (diff === 0) return [0, 0, Math.round(l * 100)];
    
    const s = l > 0.5 ? diff / (2 - sum) : diff / sum;
    
    let h;
    switch (max) {
        case r: h = ((g - b) / diff + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / diff + 2) / 6; break;
        case b: h = ((r - g) / diff + 4) / 6; break;
    }
    
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

// Blend multiple note colors for chord visualization using actual segment colors
function blendChordColors() {
    if (highlightedSegments.length === 0) return null;
    
    let totalR = 0, totalG = 0, totalB = 0, totalWeight = 0;
    
    highlightedSegments.forEach(segment => {
        const [note, octaveRing] = segment.split('-');
        const noteIndex = notes.indexOf(note);
        if (noteIndex === -1) return;
        
        // Use same color calculation as the actual wheel segments
        const hue = noteToHue(noteIndex);
        
        // Calculate frequency-based brightness (same as drawWheel)
        const audioOctave = Number(octaveRing) + 3;
        const frequency = noteToFrequency(note, audioOctave);
        const minFreq = 130; // C3 (~130Hz) - darkest
        const maxFreq = 1047; // C6 (~1047Hz) - brightest
        const freqRatio = Math.log(frequency / minFreq) / Math.log(maxFreq / minFreq);
        const lightness = 25 + Math.pow(freqRatio, 0.8) * 55; // Match wheel calculation
        
        const saturation = 70; // Match the main wheel saturation
        
        const [r, g, b] = hslToRgb(hue, saturation, lightness);
        
        totalR += r;
        totalG += g;
        totalB += b;
        totalWeight += 1;
    });
    
    const avgR = totalR / totalWeight;
    const avgG = totalG / totalWeight;
    const avgB = totalB / totalWeight;
    
    const [h, s, l] = rgbToHsl(avgR, avgG, avgB);
    return { hue: h, saturation: s, lightness: l };
}

// Extract chord notes from highlighted segments (with repetition for proper weighting)
function getCurrentChordNotes() {
    if (highlightedSegments.length === 0) return [];
    
    const chordNotes = [];
    highlightedSegments.forEach(segment => {
        const [note, octave] = segment.split('-');
        chordNotes.push(note);
    });
    
    return chordNotes;
}

function drawWheel() {
    ctx.clearRect(0, 0, size, size);
    
    const centerRadius = maxRadius * 0.2; // Center for chord blending
    const availableRadius = maxRadius - centerRadius;
    const ringWidth = availableRadius / octaves;
    
    for (let octave = 0; octave < octaves; octave++) {
        const baseInnerRadius = centerRadius + octave * ringWidth;
        const baseOuterRadius = centerRadius + (octave + 1) * ringWidth;
        
        for (let i = 0; i < notes.length; i++) {
            const startAngle = (i / notes.length) * Math.PI * 2 - Math.PI / 2;
            const endAngle = ((i + 1) / notes.length) * Math.PI * 2 - Math.PI / 2;
            
            // Check if this specific segment is highlighted
            const segmentKey = `${notes[i]}-${octave}`;
            const isHighlighted = highlightedSegments.includes(segmentKey);
            
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, baseInnerRadius, startAngle, endAngle);
            ctx.arc(centerX, centerY, baseOuterRadius, endAngle, startAngle, true);
            ctx.closePath();
            
            // Color based on note with frequency-based brightness
            const hue = noteToHue(i);
            
            // Calculate actual frequency for this note and octave
            // Visual octaves 0-3 map to audio octaves 3-6
            const audioOctave = octave + 3;
            const frequency = noteToFrequency(notes[i], audioOctave);
            
            // Map frequency to brightness (human hearing range ~20Hz to 20kHz)
            // Lower frequencies = darker, higher frequencies = brighter
            const minFreq = 130; // C3 (~130Hz) - darkest
            const maxFreq = 1047; // C6 (~1047Hz) - brightest
            const freqRatio = Math.log(frequency / minFreq) / Math.log(maxFreq / minFreq);
            const lightness = 25 + Math.pow(freqRatio, 0.8) * 55; // Gentle curve, 25-80% range
            
            let saturation = 70;
            let brightness = lightness;
            
            // Keep natural colors for all states - no color changes for hover or playing
            // (Border effects will handle visual feedback)
            
            ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${brightness}%)`;
            ctx.fill();
            
            // Border effects for visual feedback
            if (isHighlighted) {
                // Add prominent border for playing notes
                ctx.strokeStyle = `hsl(${hue}, 100%, 90%)`;
                ctx.lineWidth = 3;
                ctx.stroke();
            } else if (hoveredNote === notes[i] && hoveredOctave === octave) {
                // Add medium border for hovered notes
                ctx.strokeStyle = `hsl(${hue}, 80%, 80%)`;
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                // Normal subtle border
                ctx.strokeStyle = `rgba(255, 255, 255, 0.1)`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    }
    
    // Dim non-highlighted segments when something is playing
    if (highlightedSegments.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        
        for (let octave = 0; octave < octaves; octave++) {
            const baseInnerRadius = centerRadius + octave * ringWidth;
            const baseOuterRadius = centerRadius + (octave + 1) * ringWidth;
            
            for (let i = 0; i < notes.length; i++) {
                const segmentKey = `${notes[i]}-${octave}`;
                if (!highlightedSegments.includes(segmentKey)) {
                    const startAngle = (i / notes.length) * Math.PI * 2 - Math.PI / 2;
                    const endAngle = ((i + 1) / notes.length) * Math.PI * 2 - Math.PI / 2;
                    
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, baseInnerRadius, startAngle, endAngle);
                    ctx.arc(centerX, centerY, baseOuterRadius, endAngle, startAngle, true);
                    ctx.closePath();
                    
                    ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';
                    ctx.fill();
                }
            }
        }
        
        ctx.restore();
    }
    
    // Draw chord blending in center circle
    if (highlightedSegments.length > 0) {
        // Blend chord colors and draw in center
        const blendedColor = blendChordColors();
        if (blendedColor) {
            // Draw the blended chord color as a solid circle
            ctx.beginPath();
            ctx.arc(centerX, centerY, centerRadius * 0.85, 0, 2 * Math.PI);
            ctx.fillStyle = `hsl(${blendedColor.hue}, ${blendedColor.saturation}%, ${blendedColor.lightness}%)`;
            ctx.fill();
            
            // Add a subtle border
            ctx.strokeStyle = `hsl(${blendedColor.hue}, ${blendedColor.saturation}%, 90%)`;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Add a subtle glow effect
            const glowRadius = centerRadius * 1.2;
            const gradient = ctx.createRadialGradient(centerX, centerY, centerRadius * 0.85, centerX, centerY, glowRadius);
            gradient.addColorStop(0, `hsla(${blendedColor.hue}, ${blendedColor.saturation}%, ${blendedColor.lightness}%, 0)`);
            gradient.addColorStop(1, `hsla(${blendedColor.hue}, ${blendedColor.saturation}%, ${Math.min(80, blendedColor.lightness + 20)}%, 0.2)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, glowRadius, 0, 2 * Math.PI);
            ctx.fill();
        }
    } else {
        // Add subtle center glow when no chord is playing
        if (maxRadius > 0) {
            const glowRadius = Math.max(10, ringWidth);
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
        }
    }
}

// Tab switching function
function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Show/hide control groups
    document.querySelectorAll('.control-group').forEach(group => {
        group.classList.remove('active');
    });
    document.getElementById(`${tabName}-group`).classList.add('active');
}

// Make showTab globally accessible
window.showTab = showTab;

// Mobile menu functionality
let mobileControlsOpen = false;
let mobileLegendOpen = false;

function toggleMobileControls() {
    const controlsBtn = document.getElementById('mobileControlsBtn');
    const controls = document.querySelector('.controls');
    
    mobileControlsOpen = !mobileControlsOpen;
    
    if (mobileControlsOpen) {
        controlsBtn.classList.add('active');
        controls.classList.add('mobile-open');
    } else {
        controlsBtn.classList.remove('active');
        controls.classList.remove('mobile-open');
    }
}

function toggleMobileLegend() {
    const legendBtn = document.getElementById('mobileLegendBtn');
    const legend = document.querySelector('.legend');
    
    mobileLegendOpen = !mobileLegendOpen;
    
    if (mobileLegendOpen) {
        legendBtn.classList.add('active');
        legend.classList.add('mobile-open');
    } else {
        legendBtn.classList.remove('active');
        legend.classList.remove('mobile-open');
    }
}

// Close mobile controls when a control is selected
function closeMobileControlsOnSelection() {
    if ((window.innerWidth <= 1024 || window.innerHeight <= 768) && mobileControlsOpen) {
        toggleMobileControls();
    }
}

// Close menus when tapping outside
function closeMobileMenusOnOutsideClick(e) {
    // Don't close if tapping on the mobile buttons themselves
    if (e.target.closest('.mobile-controls-btn') || e.target.closest('.mobile-legend-btn')) {
        return;
    }
    
    // Don't close if tapping inside the panels
    if (e.target.closest('.controls') || e.target.closest('.legend')) {
        return;
    }
    
    // Close both panels if they're open and we're on mobile
    if (window.innerWidth <= 1024 || window.innerHeight <= 768) {
        if (mobileControlsOpen) {
            toggleMobileControls();
        }
        if (mobileLegendOpen) {
            toggleMobileLegend();
        }
    }
}

// Close menus when tapping outside
function closeMobileMenusOnOutsideClick(e) {
    // Don't close if tapping on the mobile buttons themselves
    if (e.target.closest('.mobile-controls-btn') || e.target.closest('.mobile-legend-btn')) {
        return;
    }
    
    // Don't close if tapping inside the panels
    if (e.target.closest('.controls') || e.target.closest('.legend')) {
        return;
    }
    
    // Close both panels if they're open and we're on mobile
    if (window.innerWidth <= 1024 || window.innerHeight <= 768) {
        if (mobileControlsOpen) {
            toggleMobileControls();
        }
        if (mobileLegendOpen) {
            toggleMobileLegend();
        }
    }
}

// Make functions globally accessible
window.toggleMobileControls = toggleMobileControls;
window.toggleMobileLegend = toggleMobileLegend;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
}

// Equal loudness compensation based on A-weighting curve
function getEqualLoudnessVolume(frequency, baseVolume = 0.3) {
    // Simplified A-weighting approximation for equal loudness
    // Peak sensitivity around 1000-4000 Hz, reduced at very low and very high frequencies
    const f = frequency;
    const f2 = f * f;
    const f4 = f2 * f2;
    
    // A-weighting approximation (simplified)
    const numerator = 12194 * 12194 * f4;
    const denominator = (f2 + 20.6 * 20.6) * Math.sqrt((f2 + 107.7 * 107.7) * (f2 + 737.9 * 737.9)) * (f2 + 12194 * 12194);
    const aWeight = numerator / denominator;
    
    // Convert to linear scale and normalize (1000 Hz = reference)
    const referenceWeight = 0.5; // Approximation for 1000 Hz
    const compensation = Math.min(2.0, Math.max(0.3, referenceWeight / aWeight));
    
    return baseVolume * compensation;
}

function playNote(frequency, duration = 200, volume = 0.3) {
    initAudio();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    // Apply equal loudness compensation
    const compensatedVolume = getEqualLoudnessVolume(frequency, volume);
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(compensatedVolume, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration / 1000);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration / 1000);
    
    return {oscillator, gainNode};
}

// ============================================================================
// REFACTORED: Unified Chord and Scale System (Eliminates 20+ duplicate functions)
// ============================================================================

// Chord definitions - replaces 10+ individual chord functions
const CHORD_DEFINITIONS = {
    'major': {
        notes: ['C', 'E', 'G'],
        name: 'C Major',
        description: 'C - E - G (Happy chord)'
    },
    'minor': {
        notes: ['C', 'D#', 'G'],
        name: 'C Minor', 
        description: 'C - E♭ - G (Sad chord)'
    },
    'diminished': {
        notes: ['C', 'D#', 'F#'],
        name: 'C Diminished',
        description: 'C - E♭ - G♭ (Tense chord)'
    },
    'augmented': {
        notes: ['C', 'E', 'G#'],
        name: 'C Augmented',
        description: 'C - E - G# (Mysterious chord)'
    },
    'maj7': {
        notes: ['C', 'E', 'G', 'B'],
        name: 'C Major 7th',
        description: 'C - E - G - B (Jazzy chord)'
    },
    'min7': {
        notes: ['C', 'D#', 'G', 'A#'],
        name: 'C Minor 7th',
        description: 'C - E♭ - G - B♭ (Smooth chord)'
    },
    'dom7': {
        notes: ['C', 'E', 'G', 'A#'],
        name: 'C Dominant 7th',
        description: 'C - E - G - B♭ (Bluesy chord)'
    },
    'sus2': {
        notes: ['C', 'D', 'G'],
        name: 'C Suspended 2nd',
        description: 'C - D - G (Floating chord)'
    },
    'sus4': {
        notes: ['C', 'F', 'G'],
        name: 'C Suspended 4th', 
        description: 'C - F - G (Unresolved chord)'
    },
    'add9': {
        notes: ['C', 'E', 'G', 'D'],
        name: 'C Add 9',
        description: 'C - E - G - D (Colorful chord)'
    }
};

// Scale definitions - replaces 8+ individual scale functions
const SCALE_DEFINITIONS = {
    'chromatic': {
        notes: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
        name: 'Chromatic Scale',
        description: 'All 12 semitones'
    },
    'major': {
        notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
        name: 'C Major Scale',
        description: 'Do-Re-Mi-Fa-Sol-La-Ti (Happy scale)'
    },
    'minor': {
        notes: ['C', 'D', 'D#', 'F', 'G', 'G#', 'A#'],
        name: 'C Minor Scale', 
        description: 'Natural minor (Sad scale)'
    },
    'pentatonic': {
        notes: ['C', 'D', 'E', 'G', 'A'],
        name: 'C Pentatonic Scale',
        description: '5-note scale (Universal scale)'
    },
    'harmonic': {
        notes: ['C', 'D', 'D#', 'F', 'G', 'G#', 'B'],
        name: 'C Harmonic Minor',
        description: 'Exotic scale with augmented 2nd'
    },
    'chromatic_desc': {
        notes: ['C', 'B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#'],
        name: 'Chromatic Descending',
        description: 'All 12 semitones descending'
    },
    'blues': {
        notes: ['C', 'D#', 'F', 'F#', 'G', 'A#'],
        name: 'C Blues Scale',
        description: 'Minor pentatonic + blue note'
    },
    'wholetone': {
        notes: ['C', 'D', 'E', 'F#', 'G#', 'A#'],
        name: 'C Whole Tone Scale',
        description: 'Dreamy impressionist scale'
    }
};

// Unified chord player - replaces 10+ duplicate functions
function playChordType(chordType) {
    initAudio();
    const chord = CHORD_DEFINITIONS[chordType];
    if (!chord) {
        console.error(`Unknown chord type: ${chordType}`);
        return;
    }
    
    const chordNotes = chord.notes;
    const chordOctave = 1; // Ring 1 = Octave 4
    
    // Visual feedback
    highlightedSegments = chordNotes.map(note => `${note}-${chordOctave}`);
    drawWheel();
    
    // UI updates
    document.getElementById('noteDisplay').textContent = chord.name;
    document.getElementById('freqDisplay').textContent = chord.description;
    
    // Play chord
    chordNotes.forEach(note => {
        const freq = noteToFrequency(note, 4);
        playNote(freq, 1500, 0.2);
    });
    
    // Reset UI
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('noteDisplay').style.color = '#fff';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, 1500);
}

// Unified scale player - replaces 8+ duplicate functions  
function playScaleType(scaleType) {
    initAudio();
    const scale = SCALE_DEFINITIONS[scaleType];
    if (!scale) {
        console.error(`Unknown scale type: ${scaleType}`);
        return;
    }
    
    const scaleNotes = scale.notes;
    let delay = 0;
    const noteDelay = 200;
    
    // UI update
    document.getElementById('noteDisplay').textContent = `Starting ${scale.name}`;
    document.getElementById('freqDisplay').textContent = scale.description;
    
    // Play scale sequence
    scaleNotes.forEach((note, index) => {
        setTimeout(() => {
            const freq = noteToFrequency(note, 4);
            playNote(freq, 300);
            
            // Visual feedback for current note - octave 4 maps to ring 1
            highlightedSegments = [`${note}-1`]; // Ring 1 = Octave 4
            drawWheel();
            
            // Keep highlight active during sequence (don't clear between notes)
            
            // Reset UI after last note
            if (index === scaleNotes.length - 1) {
                setTimeout(() => {
                    highlightedSegments = [];
                    drawWheel();
                    document.getElementById('noteDisplay').textContent = 'Click to hear notes';
                    document.getElementById('noteDisplay').style.color = '#fff';
                    document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
                }, 300);
            }
        }, delay);
        delay += noteDelay;
    });
}

// ============================================================================
// Melody Functions (kept separate as they have unique chord progressions)
// ============================================================================

function playTwinkleTwinkle() {
    initAudio();
    // Twinkle, Twinkle, Little Star: C-C-G-G-A-A-G-F-F-E-E-D-D-C
    const melody = [
        {note: 'C', octave: 4, duration: 400},
        {note: 'C', octave: 4, duration: 400},
        {note: 'G', octave: 4, duration: 400},
        {note: 'G', octave: 4, duration: 400},
        {note: 'A', octave: 4, duration: 400},
        {note: 'A', octave: 4, duration: 400},
        {note: 'G', octave: 4, duration: 800},
        {note: 'F', octave: 4, duration: 400},
        {note: 'F', octave: 4, duration: 400},
        {note: 'E', octave: 4, duration: 400},
        {note: 'E', octave: 4, duration: 400},
        {note: 'D', octave: 4, duration: 400},
        {note: 'D', octave: 4, duration: 400},
        {note: 'C', octave: 4, duration: 800}
    ];
    
    // Classic I-V-vi-IV progression in C major
    const chords = [
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},  // C major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},  // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 400},  // G major (V)
        {notes: ['G', 'B', 'D'], octave: 3, duration: 400},  // G major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 400},  // A minor (vi)
        {notes: ['A', 'C', 'E'], octave: 3, duration: 400},  // A minor
        {notes: ['G', 'B', 'D'], octave: 3, duration: 800},  // G major
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},  // F major (IV)
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},  // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},  // C major (I)
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},  // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 400},  // G major (V)
        {notes: ['G', 'B', 'D'], octave: 3, duration: 400},  // G major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 800}   // C major (I)
    ];
    
    playMelodyWithChords(melody, chords, 'Twinkle, Twinkle, Little Star');
}

function playMaryLittleLamb() {
    initAudio();
    // Mary Had a Little Lamb: E-D-C-D-E-E-E-D-D-D-E-G-G
    const melody = [
        {note: 'E', octave: 4, duration: 400},
        {note: 'D', octave: 4, duration: 400},
        {note: 'C', octave: 4, duration: 400},
        {note: 'D', octave: 4, duration: 400},
        {note: 'E', octave: 4, duration: 400},
        {note: 'E', octave: 4, duration: 400},
        {note: 'E', octave: 4, duration: 800},
        {note: 'D', octave: 4, duration: 400},
        {note: 'D', octave: 4, duration: 400},
        {note: 'D', octave: 4, duration: 800},
        {note: 'E', octave: 4, duration: 400},
        {note: 'G', octave: 4, duration: 400},
        {note: 'G', octave: 4, duration: 800}
    ];
    
    // Simple I-V progression in C major
    const chords = [
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},  // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 400},  // G major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},  // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 400},  // G major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},  // C major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},  // C major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 800},  // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 400},  // G major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 400},  // G major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 800},  // G major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},  // C major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},  // C major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 800}   // C major
    ];
    
    playMelodyWithChords(melody, chords, 'Mary Had a Little Lamb');
}

function playHappyBirthday() {
    initAudio();
    // Happy Birthday: D-D-E-D-G-F#-D-D-E-D-A-G-D-D-D-B-G-F#-E-C-C-B-G-A-G
    const melody = [
        {note: 'D', octave: 4, duration: 200},
        {note: 'D', octave: 4, duration: 300},
        {note: 'E', octave: 4, duration: 500},
        {note: 'D', octave: 4, duration: 500},
        {note: 'G', octave: 4, duration: 500},
        {note: 'F#', octave: 4, duration: 1000},
        {note: 'D', octave: 4, duration: 200},
        {note: 'D', octave: 4, duration: 300},
        {note: 'E', octave: 4, duration: 500},
        {note: 'D', octave: 4, duration: 500},
        {note: 'A', octave: 4, duration: 500},
        {note: 'G', octave: 4, duration: 1000},
        {note: 'D', octave: 4, duration: 200},
        {note: 'D', octave: 4, duration: 300},
        {note: 'D', octave: 5, duration: 500},
        {note: 'B', octave: 4, duration: 500},
        {note: 'G', octave: 4, duration: 500},
        {note: 'F#', octave: 4, duration: 500},
        {note: 'E', octave: 4, duration: 1000},
        {note: 'C', octave: 5, duration: 200},
        {note: 'C', octave: 5, duration: 300},
        {note: 'B', octave: 4, duration: 500},
        {note: 'G', octave: 4, duration: 500},
        {note: 'A', octave: 4, duration: 500},
        {note: 'G', octave: 4, duration: 1000}
    ];
    
    // Classic phrase-based harmony for Happy Birthday
    const chords = [
        {notes: ['G', 'B', 'D'], octave: 3, duration: 200},  // G major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 300},  // G major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 500},  // G major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 500},  // G major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 500},  // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 1000}, // G major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 200},  // G major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 300},  // G major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 500},  // G major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 500},  // G major
        {notes: ['D', 'F#', 'A'], octave: 3, duration: 500}, // D major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 1000}, // G major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 200},  // G major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 300},  // G major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 500},  // G major
        {notes: ['E', 'G', 'B'], octave: 3, duration: 500},  // E minor
        {notes: ['C', 'E', 'G'], octave: 3, duration: 500},  // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 500},  // G major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 1000}, // C major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 200},  // C major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 300},  // C major
        {notes: ['E', 'G', 'B'], octave: 3, duration: 500},  // E minor
        {notes: ['C', 'E', 'G'], octave: 3, duration: 500},  // C major
        {notes: ['D', 'F#', 'A'], octave: 3, duration: 500}, // D major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 1000}  // G major
    ];
    
    playMelodyWithChords(melody, chords, 'Happy Birthday');
}

function playAmazingGrace() {
    initAudio();
    // Amazing Grace complete first verse: "Amazing grace, how sweet the sound, that saved a wretch like me"
    const melody = [
        // "A-ma-zing grace"
        {note: 'G', octave: 3, duration: 400},   // A-
        {note: 'C', octave: 4, duration: 600},   // ma-
        {note: 'E', octave: 4, duration: 400},   // zing
        {note: 'C', octave: 4, duration: 400},   // grace
        
        // "how sweet the sound"
        {note: 'E', octave: 4, duration: 400},   // how
        {note: 'D', octave: 4, duration: 300},   // sweet
        {note: 'C', octave: 4, duration: 900},   // the
        {note: 'A', octave: 3, duration: 400},   // sound
        {note: 'G', octave: 3, duration: 800},   // (pause)
        
        // "that saved a wretch"
        {note: 'G', octave: 3, duration: 400},   // that
        {note: 'C', octave: 4, duration: 600},   // saved
        {note: 'E', octave: 4, duration: 400},   // a
        {note: 'C', octave: 4, duration: 400},   // wretch
        
        // "like me"
        {note: 'E', octave: 4, duration: 400},   // like
        {note: 'D', octave: 4, duration: 300},   // me
        {note: 'C', octave: 4, duration: 1200},  // (hold)
        
        // Second phrase: "I once was lost, but now am found"
        {note: 'A', octave: 3, duration: 400},   // I
        {note: 'A', octave: 3, duration: 400},   // once
        {note: 'G', octave: 3, duration: 400},   // was
        {note: 'C', octave: 4, duration: 600},   // lost
        {note: 'E', octave: 4, duration: 400},   // but
        {note: 'G', octave: 4, duration: 500},   // now
        {note: 'F', octave: 4, duration: 300},   // am
        {note: 'E', octave: 4, duration: 800},   // found
        
        // "was blind, but now I see"
        {note: 'G', octave: 3, duration: 400},   // was
        {note: 'C', octave: 4, duration: 600},   // blind
        {note: 'E', octave: 4, duration: 400},   // but
        {note: 'C', octave: 4, duration: 400},   // now
        {note: 'E', octave: 4, duration: 400},   // I
        {note: 'D', octave: 4, duration: 300},   // see
        {note: 'C', octave: 4, duration: 1200}   // (final hold)
    ];
    
    // Extended chord progression for complete verse
    const chords = [
        // "A-ma-zing grace"
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},   // C major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 600},   // C major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 400},   // A minor
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},   // F major
        
        // "how sweet the sound"
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},   // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 300},   // G major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 900},   // C major
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},   // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 800},   // C major
        
        // "that saved a wretch"
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},   // C major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 600},   // C major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 400},   // A minor
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},   // F major
        
        // "like me"
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},   // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 300},   // G major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 1200},  // C major
        
        // "I once was lost, but now am found"
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},   // F major
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},   // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},   // C major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 600},   // C major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 400},   // A minor
        {notes: ['G', 'B', 'D'], octave: 3, duration: 500},   // G major
        {notes: ['F', 'A', 'C'], octave: 3, duration: 300},   // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 800},   // C major
        
        // "was blind, but now I see"
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},   // C major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 600},   // C major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 400},   // A minor
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},   // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},   // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 300},   // G major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 1200}   // C major (final)
    ];
    
    playMelodyWithChords(melody, chords, 'Amazing Grace');
}

function playGreensleeves() {
    initAudio();
    // Greensleeves complete verse: "Alas my love, you do me wrong, to cast me off discourteously..."
    const melody = [
        // "Alas my love, you do me wrong"
        {note: 'A', octave: 4, duration: 600},   // A-
        {note: 'C', octave: 5, duration: 400},   // las
        {note: 'D', octave: 5, duration: 600},   // my
        {note: 'E', octave: 5, duration: 900},   // love
        {note: 'F', octave: 5, duration: 400},   // you
        {note: 'E', octave: 5, duration: 300},   // do
        {note: 'D', octave: 5, duration: 600},   // me
        {note: 'B', octave: 4, duration: 900},   // wrong
        
        // "to cast me off discourteously"  
        {note: 'G', octave: 4, duration: 600},   // to
        {note: 'A', octave: 4, duration: 400},   // cast
        {note: 'B', octave: 4, duration: 600},   // me
        {note: 'C', octave: 5, duration: 900},   // off
        {note: 'D', octave: 5, duration: 400},   // dis-
        {note: 'C', octave: 5, duration: 300},   // cour-
        {note: 'B', octave: 4, duration: 300},   // teous-
        {note: 'A', octave: 4, duration: 1200},  // ly
        
        // "for I have loved you well and long"
        {note: 'A', octave: 4, duration: 600},   // for
        {note: 'C', octave: 5, duration: 400},   // I
        {note: 'D', octave: 5, duration: 600},   // have
        {note: 'E', octave: 5, duration: 900},   // loved
        {note: 'F', octave: 5, duration: 400},   // you
        {note: 'E', octave: 5, duration: 300},   // well
        {note: 'D', octave: 5, duration: 600},   // and
        {note: 'B', octave: 4, duration: 900},   // long
        
        // "delighting in your company"
        {note: 'G', octave: 4, duration: 600},   // de-
        {note: 'A', octave: 4, duration: 400},   // light-
        {note: 'B', octave: 4, duration: 600},   // ing
        {note: 'C', octave: 5, duration: 900},   // in
        {note: 'D', octave: 5, duration: 400},   // your
        {note: 'C', octave: 5, duration: 300},   // com-
        {note: 'B', octave: 4, duration: 300},   // pan-
        {note: 'A', octave: 4, duration: 1200},  // y
        
        // Chorus: "Greensleeves was all my joy"
        {note: 'D', octave: 5, duration: 800},   // Green-
        {note: 'F', octave: 5, duration: 600},   // sleeves
        {note: 'E', octave: 5, duration: 600},   // was
        {note: 'D', octave: 5, duration: 400},   // all
        {note: 'C', octave: 5, duration: 600},   // my
        {note: 'A', octave: 4, duration: 900},   // joy
        
        // "Greensleeves was my delight"
        {note: 'D', octave: 5, duration: 800},   // Green-
        {note: 'F', octave: 5, duration: 600},   // sleeves
        {note: 'E', octave: 5, duration: 600},   // was
        {note: 'D', octave: 5, duration: 400},   // my
        {note: 'C', octave: 5, duration: 300},   // de-
        {note: 'B', octave: 4, duration: 1200},  // light
        
        // "Greensleeves was my heart of gold"
        {note: 'D', octave: 5, duration: 800},   // Green-
        {note: 'F', octave: 5, duration: 600},   // sleeves
        {note: 'E', octave: 5, duration: 600},   // was
        {note: 'D', octave: 5, duration: 400},   // my
        {note: 'C', octave: 5, duration: 300},   // heart
        {note: 'B', octave: 4, duration: 300},   // of
        {note: 'A', octave: 4, duration: 900},   // gold
        
        // "and who but my lady Greensleeves"
        {note: 'G', octave: 4, duration: 400},   // and
        {note: 'A', octave: 4, duration: 400},   // who
        {note: 'B', octave: 4, duration: 600},   // but
        {note: 'C', octave: 5, duration: 900},   // my
        {note: 'D', octave: 5, duration: 400},   // la-
        {note: 'C', octave: 5, duration: 300},   // dy
        {note: 'B', octave: 4, duration: 300},   // Green-
        {note: 'A', octave: 4, duration: 1500}   // sleeves (final)
    ];
    
    // Extended chord progression for complete verse and chorus
    const chords = [
        // "Alas my love, you do me wrong"
        {notes: ['A', 'C', 'E'], octave: 3, duration: 600},   // A minor
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},   // F major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 600},   // G major
        {notes: ['E', 'G', 'B'], octave: 3, duration: 900},   // E minor
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},   // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 300},   // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 600},   // G major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 900},   // A minor
        
        // "to cast me off discourteously"  
        {notes: ['C', 'E', 'G'], octave: 3, duration: 600},   // C major
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},   // F major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 600},   // G major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 900},   // A minor
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},   // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 300},   // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 300},   // G major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 1200},  // A minor
        
        // "for I have loved you well and long"
        {notes: ['A', 'C', 'E'], octave: 3, duration: 600},   // A minor
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},   // F major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 600},   // G major
        {notes: ['E', 'G', 'B'], octave: 3, duration: 900},   // E minor
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},   // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 300},   // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 600},   // G major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 900},   // A minor
        
        // "delighting in your company"
        {notes: ['C', 'E', 'G'], octave: 3, duration: 600},   // C major
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},   // F major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 600},   // G major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 900},   // A minor
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},   // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 300},   // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 300},   // G major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 1200},  // A minor
        
        // Chorus: "Greensleeves was all my joy"
        {notes: ['G', 'B', 'D'], octave: 3, duration: 800},   // G major
        {notes: ['F', 'A', 'C'], octave: 3, duration: 600},   // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 600},   // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 400},   // G major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 600},   // A minor
        {notes: ['A', 'C', 'E'], octave: 3, duration: 900},   // A minor
        
        // "Greensleeves was my delight"
        {notes: ['G', 'B', 'D'], octave: 3, duration: 800},   // G major
        {notes: ['F', 'A', 'C'], octave: 3, duration: 600},   // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 600},   // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 400},   // G major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 300},   // A minor
        {notes: ['E', 'G', 'B'], octave: 3, duration: 1200},  // E minor
        
        // "Greensleeves was my heart of gold"
        {notes: ['G', 'B', 'D'], octave: 3, duration: 800},   // G major
        {notes: ['F', 'A', 'C'], octave: 3, duration: 600},   // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 600},   // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 400},   // G major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 300},   // A minor
        {notes: ['E', 'G', 'B'], octave: 3, duration: 300},   // E minor
        {notes: ['A', 'C', 'E'], octave: 3, duration: 900},   // A minor
        
        // "and who but my lady Greensleeves"
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},   // C major
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},   // F major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 600},   // G major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 900},   // A minor
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},   // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 300},   // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 300},   // G major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 1500}   // A minor (final)
    ];
    
    playMelodyWithChords(melody, chords, 'Greensleeves');
}


function playOdeToJoy() {
    initAudio();
    // Ode to Joy (Beethoven): E-E-F-G-G-F-E-D-C-C-D-E-E-D-D
    const melody = [
        {note: 'E', octave: 4, duration: 400},
        {note: 'E', octave: 4, duration: 400},
        {note: 'F', octave: 4, duration: 400},
        {note: 'G', octave: 4, duration: 400},
        {note: 'G', octave: 4, duration: 400},
        {note: 'F', octave: 4, duration: 400},
        {note: 'E', octave: 4, duration: 400},
        {note: 'D', octave: 4, duration: 400},
        {note: 'C', octave: 4, duration: 400},
        {note: 'C', octave: 4, duration: 400},
        {note: 'D', octave: 4, duration: 400},
        {note: 'E', octave: 4, duration: 400},
        {note: 'E', octave: 4, duration: 600},
        {note: 'D', octave: 4, duration: 200},
        {note: 'D', octave: 4, duration: 800}
    ];
    
    // Classical chord progression: C - C - F - C - G - Am - F - G - Am - F - G7 - C - G - G - C
    const chords = [
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},  // C major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},  // C major
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},  // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},  // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 400},  // G major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 400},  // A minor
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},  // F major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 400},  // G major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 400},  // A minor
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},  // F major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 400},  // G major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},  // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 600},  // G major
        null,
        {notes: ['C', 'E', 'G'], octave: 3, duration: 800}   // C major
    ];
    
    playMelodyWithChords(melody, chords, 'Ode to Joy');
}

function playFurElise() {
    initAudio();
    // Für Elise (Beethoven) opening theme: E-D#-E-D#-E-B-D-C-A
    const melody = [
        {note: 'E', octave: 5, duration: 300},
        {note: 'D#', octave: 5, duration: 300},
        {note: 'E', octave: 5, duration: 300},
        {note: 'D#', octave: 5, duration: 300},
        {note: 'E', octave: 5, duration: 300},
        {note: 'B', octave: 4, duration: 300},
        {note: 'D', octave: 5, duration: 300},
        {note: 'C', octave: 5, duration: 300},
        {note: 'A', octave: 4, duration: 600},
        // Second phrase: C-E-A-B
        {note: 'C', octave: 4, duration: 300},
        {note: 'E', octave: 4, duration: 300},
        {note: 'A', octave: 4, duration: 300},
        {note: 'B', octave: 4, duration: 600},
        // Third phrase: E-G#-B-C
        {note: 'E', octave: 4, duration: 300},
        {note: 'G#', octave: 4, duration: 300},
        {note: 'B', octave: 4, duration: 300},
        {note: 'C', octave: 5, duration: 600},
        // Return to main theme: E-D#-E-D#-E-B-D-C-A
        {note: 'E', octave: 5, duration: 300},
        {note: 'D#', octave: 5, duration: 300},
        {note: 'E', octave: 5, duration: 300},
        {note: 'D#', octave: 5, duration: 300},
        {note: 'E', octave: 5, duration: 300},
        {note: 'B', octave: 4, duration: 300},
        {note: 'D', octave: 5, duration: 300},
        {note: 'C', octave: 5, duration: 300},
        {note: 'A', octave: 4, duration: 800}
    ];
    
    // Romantic period chord progression in A minor: Am - E7 - Am - F - C - G - Am - E7 - Am
    const chords = [
        {notes: ['A', 'C', 'E'], octave: 3, duration: 300},  // A minor
        {notes: ['E', 'G#', 'B'], octave: 3, duration: 300}, // E major (dominant)
        {notes: ['A', 'C', 'E'], octave: 3, duration: 300},  // A minor
        {notes: ['E', 'G#', 'B'], octave: 3, duration: 300}, // E major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 300},  // A minor
        {notes: ['E', 'G#', 'B'], octave: 3, duration: 300}, // E major
        {notes: ['F', 'A', 'C'], octave: 3, duration: 300},  // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 300},  // C major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 600},  // A minor
        // Second phrase
        {notes: ['F', 'A', 'C'], octave: 3, duration: 300},  // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 300},  // C major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 300},  // A minor
        {notes: ['E', 'G#', 'B'], octave: 3, duration: 600}, // E major
        // Third phrase
        {notes: ['E', 'G#', 'B'], octave: 3, duration: 300}, // E major
        {notes: ['E', 'G#', 'B'], octave: 3, duration: 300}, // E major
        {notes: ['E', 'G#', 'B'], octave: 3, duration: 300}, // E major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 600},  // A minor
        // Return to main theme
        {notes: ['A', 'C', 'E'], octave: 3, duration: 300},  // A minor
        {notes: ['E', 'G#', 'B'], octave: 3, duration: 300}, // E major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 300},  // A minor
        {notes: ['E', 'G#', 'B'], octave: 3, duration: 300}, // E major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 300},  // A minor
        {notes: ['E', 'G#', 'B'], octave: 3, duration: 300}, // E major
        {notes: ['F', 'A', 'C'], octave: 3, duration: 300},  // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 300},  // C major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 800}   // A minor
    ];
    
    playMelodyWithChords(melody, chords, 'Für Elise');
}

function playGlissando() {
    initAudio();
    
    document.getElementById('noteDisplay').textContent = 'Glissando';
    document.getElementById('freqDisplay').textContent = 'Continuous sliding effect';
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    // Start and end frequencies for the glissando
    const startFreq = noteToFrequency('C', 3); // C3 = 130.81 Hz
    const endFreq = noteToFrequency('C', 6);   // C6 = 1046.50 Hz
    const duration = 3; // 3 seconds
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
    
    // Smooth exponential frequency slide from start to end
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + duration);
    
    // Volume envelope
    const compensatedVolume = getEqualLoudnessVolume((startFreq + endFreq) / 2, 0.2);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(compensatedVolume, audioCtx.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
    
    // Visual feedback - animate the highlighting across all rings
    let currentNote = 0;
    const totalSteps = 12 * 3; // 3 octaves worth of notes
    const stepInterval = (duration * 1000) / totalSteps;
    
    const animationInterval = setInterval(() => {
        if (currentNote >= totalSteps) {
            clearInterval(animationInterval);
            highlightedSegments = [];
            drawWheel();
            document.getElementById('noteDisplay').textContent = 'Click to hear notes';
            document.getElementById('noteDisplay').style.color = '#fff';
            document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
            return;
        }
        
        const noteIndex = currentNote % 12;
        const octaveRing = Math.floor(currentNote / 12);
        const note = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][noteIndex];
        
        // Highlight current note across multiple rings for flowing effect
        highlightedSegments = [];
        for (let ring = Math.max(0, octaveRing); ring <= Math.min(4, octaveRing + 2); ring++) {
            highlightedSegments.push(`${note}-${ring}`);
        }
        drawWheel();
        
        currentNote++;
    }, stepInterval);
}

// ============================================================================
// Helper Functions
// ============================================================================

// Helper function to play a chord (multiple notes simultaneously)
function playChord(chordNotes, octave, duration, volume = 0.15, delay = 0) {
    initAudio();
    chordNotes.forEach(note => {
        setTimeout(() => {
            const freq = noteToFrequency(note, octave);
            playNote(freq, duration, volume);
        }, delay);
    });
}

// Enhanced helper function to play a melody with optional chord accompaniment
function playMelodyWithChords(melody, chords, title) {
    let delay = 0;
    highlightedSegments = [];
    
    document.getElementById('noteDisplay').textContent = `Playing: ${title}`;
    document.getElementById('freqDisplay').textContent = 'With harmonic accompaniment!';
    
    melody.forEach((noteData, i) => {
        // Play chord if specified for this note
        if (chords && chords[i]) {
            setTimeout(() => {
                playChord(chords[i].notes, chords[i].octave, chords[i].duration, 0.12);
                
                // Visual highlighting for chord
                const chordOctave = Math.max(0, Math.min(3, chords[i].octave - 3));
                const chordSegments = chords[i].notes.map(note => `${note}-${chordOctave}`);
                highlightedSegments = chordSegments;
                drawWheel();
            }, delay);
        }
        
        // Start highlighting the melody note (slightly after chord)
        setTimeout(() => {
            const freq = noteToFrequency(noteData.note, noteData.octave);
            playNote(freq, noteData.duration, 0.3); // Melody louder than chords
            
            // Visual highlighting for melody note
            const visualOctave = Math.max(0, Math.min(3, noteData.octave - 3));
            const melodySegment = `${noteData.note}-${visualOctave}`;
            
            // Combine chord and melody highlights
            if (chords && chords[i]) {
                const chordOctave = Math.max(0, Math.min(3, chords[i].octave - 3));
                const chordSegments = chords[i].notes.map(note => `${note}-${chordOctave}`);
                highlightedSegments = [...chordSegments, melodySegment];
            } else {
                highlightedSegments = [melodySegment];
            }
            drawWheel();
            
            const noteIndex = notes.indexOf(noteData.note);
            document.getElementById('noteDisplay').textContent = `${noteData.note}${noteData.octave}`;
            document.getElementById('noteDisplay').style.color = `hsl(${noteToHue(noteIndex)}, 70%, 60%)`;
            document.getElementById('freqDisplay').textContent = `${title} - Note ${i + 1} of ${melody.length}`;
        }, delay + 50); // Melody slightly after chord
        
        // Keep highlighting active during melody sequence
        
        delay += noteData.duration + 50;
    });
    
    // Clean up after melody finishes
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('noteDisplay').style.color = '#fff';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, delay + 200);
}

// Helper function to play a melody with visual feedback (original function for simple melodies)
function playMelody(melody, title) {
    let delay = 0;
    highlightedSegments = [];
    
    document.getElementById('noteDisplay').textContent = `Playing: ${title}`;
    document.getElementById('freqDisplay').textContent = 'Watch the notes light up!';
    
    melody.forEach((noteData, i) => {
        // Start highlighting the note
        setTimeout(() => {
            const freq = noteToFrequency(noteData.note, noteData.octave);
            playNote(freq, noteData.duration, 0.25);
            
            // Visual highlighting
            const visualOctave = Math.max(0, Math.min(3, noteData.octave - 3)); // Map to visual rings
            highlightedSegments = [`${noteData.note}-${visualOctave}`];
            drawWheel();
            
            const noteIndex = notes.indexOf(noteData.note);
            document.getElementById('noteDisplay').textContent = `${noteData.note}${noteData.octave}`;
            document.getElementById('noteDisplay').style.color = `hsl(${noteToHue(noteIndex)}, 70%, 60%)`;
            document.getElementById('freqDisplay').textContent = `${title} - Note ${i + 1} of ${melody.length}`;
        }, delay);
        
        // Keep highlighting active during melody sequence
        
        delay += noteData.duration + 50; // Small gap between notes
    });
    
    // Clean up after melody finishes
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('noteDisplay').style.color = '#fff';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, delay + 200);
}

// Mouse interaction
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width) - centerX;
    const y = (e.clientY - rect.top) * (canvas.height / rect.height) - centerY;
    
    const distance = Math.sqrt(x * x + y * y);
    let angle = Math.atan2(y, x) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    
    const centerRadius = maxRadius * 0.2; // Match drawWheel center
    
    if (distance <= maxRadius && distance >= centerRadius) {
        const adjustedDistance = distance - centerRadius;
        const availableRadius = maxRadius - centerRadius;
        const octave = Math.floor(adjustedDistance / (availableRadius / octaves));
        const noteIndex = Math.floor((angle / (Math.PI * 2)) * notes.length) % notes.length;
        
        hoveredNote = notes[noteIndex];
        hoveredOctave = octave;
        
        // Map visual octave to audio octave - shifted for audibility
        // Ring 0 (innermost) = Octave 3
        // Ring 1 = Octave 4
        // Ring 2 (middle) = Octave 5
        // Ring 3 = Octave 6
        // Ring 4 (outermost) = Octave 7
        const audioOctave = octave + 3;
        const freq = noteToFrequency(hoveredNote, audioOctave);
        
        document.getElementById('noteDisplay').textContent = `${hoveredNote}${audioOctave}`;
        document.getElementById('noteDisplay').style.color = `hsl(${noteToHue(noteIndex)}, 70%, 60%)`;
        document.getElementById('freqDisplay').textContent = `${freq.toFixed(1)} Hz`;
        
        drawWheel();
    } else {
        hoveredNote = null;
        hoveredOctave = null;
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('noteDisplay').style.color = '#fff';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
        drawWheel();
    }
});

// Prevent rapid repeated touches
let lastTouchTime = 0;
const TOUCH_DEBOUNCE_MS = 150;

function handleCanvasTouch(e) {
    // Prevent default touch behavior
    e.preventDefault();
    
    const now = Date.now();
    if (now - lastTouchTime < TOUCH_DEBOUNCE_MS) {
        return;
    }
    lastTouchTime = now;
    
    // Handle both touch and mouse coordinates
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width) - centerX;
    const y = (clientY - rect.top) * (canvas.height / rect.height) - centerY;
    
    const distance = Math.sqrt(x * x + y * y);
    let angle = Math.atan2(y, x) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    
    const centerRadius = maxRadius * 0.2; // Match drawWheel center
    
    if (distance <= maxRadius && distance >= centerRadius) {
        const adjustedDistance = distance - centerRadius;
        const availableRadius = maxRadius - centerRadius;
        const octave = Math.floor(adjustedDistance / (availableRadius / octaves));
        const noteIndex = Math.floor((angle / (Math.PI * 2)) * notes.length) % notes.length;
        const note = notes[noteIndex];
        
        // Map visual octave to audio octave
        // Ring 0 (innermost) = Octave 3
        // Ring 1 = Octave 4
        // Ring 2 = Octave 5
        // Ring 3 (outermost) = Octave 6
        const audioOctave = octave + 3;
        
        const freq = noteToFrequency(note, audioOctave);
        playNote(freq, 500, 0.3);
        
        // Visual feedback
        highlightedSegments = [`${note}-${octave}`];
        drawWheel();
        
        // Update display
        document.getElementById('noteDisplay').textContent = `${note}${audioOctave}`;
        const displayNoteIndex = notes.indexOf(note);
        document.getElementById('noteDisplay').style.color = `hsl(${noteToHue(displayNoteIndex)}, 70%, 60%)`;
        document.getElementById('freqDisplay').textContent = `${freq.toFixed(1)} Hz - Click heard`;
        
        setTimeout(() => {
            highlightedSegments = [];
            drawWheel();
            document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
        }, 500);
    }
}

// Add both click and touch event listeners
canvas.addEventListener('click', handleCanvasTouch);
canvas.addEventListener('touchstart', handleCanvasTouch, { passive: false });

// Prevent context menu on long press
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Prevent touch hold effects
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
});

canvas.addEventListener('mouseleave', () => {
    hoveredNote = null;
    hoveredOctave = null;
    document.getElementById('noteDisplay').textContent = 'Click to hear notes';
    document.getElementById('noteDisplay').style.color = '#fff';
    document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    drawWheel();
});

// Initialize
drawWheel();

// Ensure wheel is drawn after page load and add all event listeners
window.addEventListener('load', () => {
    drawWheel();
    
    // REFACTORED: Scale button listeners using unified system
    document.getElementById('chromatic-btn').addEventListener('click', () => {
        playScaleType('chromatic');
    });
    
    document.getElementById('major-btn').addEventListener('click', () => {
        playScaleType('major');
    });
    
    document.getElementById('minor-btn').addEventListener('click', () => {
        playScaleType('minor');
    });
    
    document.getElementById('pentatonic-btn').addEventListener('click', () => {
        playScaleType('pentatonic');
    });
    
    document.getElementById('harmonic-btn').addEventListener('click', () => {
        playScaleType('harmonic');
    });
    
    document.getElementById('chromatic-desc-btn').addEventListener('click', () => {
        playScaleType('chromatic_desc');
    });
    
    document.getElementById('blues-btn').addEventListener('click', () => {
        playScaleType('blues');
    });
    
    document.getElementById('wholetone-btn').addEventListener('click', () => {
        playScaleType('wholetone');
    });
    
    document.getElementById('glissando-btn').addEventListener('click', () => {
        playGlissando(); // Keep special glissando function for now
    });
    
    // REFACTORED: Chord button listeners using unified system
    document.getElementById('major-chord-btn').addEventListener('click', () => {
        playChordType('major');
    });
    
    document.getElementById('minor-chord-btn').addEventListener('click', () => {
        playChordType('minor');
    });
    
    document.getElementById('diminished-btn').addEventListener('click', () => {
        playChordType('diminished');
    });
    
    document.getElementById('augmented-btn').addEventListener('click', () => {
        playChordType('augmented');
    });
    
    document.getElementById('maj7-btn').addEventListener('click', () => {
        playChordType('maj7');
    });
    
    document.getElementById('min7-btn').addEventListener('click', () => {
        playChordType('min7');
    });
    
    document.getElementById('dom7-btn').addEventListener('click', () => {
        playChordType('dom7');
    });
    
    document.getElementById('sus2-btn').addEventListener('click', () => {
        playChordType('sus2');
    });
    
    document.getElementById('sus4-btn').addEventListener('click', () => {
        playChordType('sus4');
    });
    
    document.getElementById('add9-btn').addEventListener('click', () => {
        playChordType('add9');
    });
    
    // Melody button listeners
    const melodyButtons = [
        { id: 'twinkle-btn', func: playTwinkleTwinkle },
        { id: 'mary-lamb-btn', func: playMaryLittleLamb },
        { id: 'happy-birthday-btn', func: playHappyBirthday },
        { id: 'amazing-grace-btn', func: playAmazingGrace },
        { id: 'greensleeves-btn', func: playGreensleeves },
        { id: 'ode-to-joy-btn', func: playOdeToJoy },
        { id: 'fur-elise-btn', func: playFurElise }
    ];
    
    melodyButtons.forEach(({ id, func }) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', () => {
                func();
                closeMobileControlsOnSelection();
            });
        } else {
            console.warn(`Melody button not found: ${id}`);
        }
    });
    
    // Add mobile menu close functionality to all control buttons
    document.querySelector('.controls').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && !e.target.classList.contains('tab-button')) {
            // Small delay to ensure the action completes first
            setTimeout(closeMobileControlsOnSelection, 100);
        }
    });
    
    // Add outside click to close mobile menus
    document.addEventListener('click', closeMobileMenusOnOutsideClick);
    document.addEventListener('touchstart', closeMobileMenusOnOutsideClick, { passive: true });
});

// Redraw on resize - outside of load event
window.addEventListener('resize', () => {
    size = setCanvasSize();
    centerX = size / 2;
    centerY = size / 2;
    maxRadius = size / 2 - 10;
    drawWheel();
});