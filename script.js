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
const octaves = 5; // Number of octaves (rings)

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

function drawWheel() {
    ctx.clearRect(0, 0, size, size);
    
    const ringWidth = maxRadius / octaves;
    
    for (let octave = 0; octave < octaves; octave++) {
        const baseInnerRadius = Math.max(0, octave * ringWidth);
        const baseOuterRadius = Math.max(baseInnerRadius + 1, (octave + 1) * ringWidth);
        
        for (let i = 0; i < notes.length; i++) {
            const startAngle = (i / notes.length) * Math.PI * 2 - Math.PI / 2;
            const endAngle = ((i + 1) / notes.length) * Math.PI * 2 - Math.PI / 2;
            
            // Check if this specific segment is highlighted
            const segmentKey = `${notes[i]}-${octave}`;
            const isHighlighted = highlightedSegments.includes(segmentKey);
            
            // Draw glow effect for highlighted segments
            if (isHighlighted) {
                ctx.save();
                
                // Create multiple glow layers
                for (let glow = 3; glow > 0; glow--) {
                    const glowInner = Math.max(0, baseInnerRadius - glow * 3);
                    const glowOuter = baseOuterRadius + glow * 3;
                    
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, glowInner, startAngle, endAngle);
                    ctx.arc(centerX, centerY, glowOuter, endAngle, startAngle, true);
                    ctx.closePath();
                    
                    const hue = noteToHue(i);
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
                    ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${0.1 * (4 - glow)})`;
                    ctx.fill();
                }
                
                ctx.restore();
            }
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, baseInnerRadius, startAngle, endAngle);
            ctx.arc(centerX, centerY, baseOuterRadius, endAngle, startAngle, true);
            ctx.closePath();
            
            // Color based on note with brightness based on octave
            const hue = noteToHue(i);
            const lightness = 20 + (octave / octaves) * 50; // Inner darker, outer lighter
            let saturation = 70;
            let brightness = lightness;
            
            // Highlight logic
            if (hoveredNote === notes[i] && hoveredOctave === octave) {
                saturation = 100;
                brightness = Math.min(80, lightness + 20);
            } else if (isHighlighted) {
                saturation = 100;
                brightness = Math.min(80, lightness + 30);
                
                // Add inner glow
                ctx.save();
                ctx.shadowBlur = 15;
                ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
            
            ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${brightness}%)`;
            ctx.fill();
            
            if (isHighlighted) {
                ctx.restore();
                
                // Add bright border for highlighted segments
                ctx.strokeStyle = `hsla(${hue}, 100%, 80%, 0.8)`;
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
            const baseInnerRadius = Math.max(0, octave * ringWidth);
            const baseOuterRadius = Math.max(baseInnerRadius + 1, (octave + 1) * ringWidth);
            
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
    
    // Add center glow - ensure radius is always positive
    if (maxRadius > 0) {
        const glowRadius = Math.max(10, ringWidth);
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
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
    'dorian': {
        notes: ['C', 'D', 'D#', 'F', 'G', 'A', 'A#'],
        name: 'C Dorian Mode',
        description: 'Minor with raised 6th (Celtic sound)'
    },
    'mixolydian': {
        notes: ['C', 'D', 'E', 'F', 'G', 'A', 'A#'],
        name: 'C Mixolydian Mode',
        description: 'Major with flat 7th (Rock sound)'
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
    const chordOctave = 2; // Middle ring
    
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
            
            // Visual feedback for current note
            highlightedSegments = [`${note}-2`]; // Middle ring
            drawWheel();
            
            // Clear highlight after note duration
            setTimeout(() => {
                highlightedSegments = [];
                drawWheel();
            }, 300);
            
            // Reset UI after last note
            if (index === scaleNotes.length - 1) {
                setTimeout(() => {
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
    // Amazing Grace opening: G-C-E-C-E-D-C-A-G
    const melody = [
        {note: 'G', octave: 3, duration: 400},
        {note: 'C', octave: 4, duration: 800},
        {note: 'E', octave: 4, duration: 400},
        {note: 'C', octave: 4, duration: 400},
        {note: 'E', octave: 4, duration: 400},
        {note: 'D', octave: 4, duration: 400},
        {note: 'C', octave: 4, duration: 1200},
        {note: 'A', octave: 3, duration: 400},
        {note: 'G', octave: 3, duration: 800}
    ];
    
    // Rich C-F-Am-G progression  
    const chords = [
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},  // C major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 800},  // C major
        {notes: ['A', 'C', 'E'], octave: 3, duration: 400},  // A minor
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},  // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 400},  // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 400},  // G major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 1200}, // C major
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},  // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 800}   // C major
    ];
    
    playMelodyWithChords(melody, chords, 'Amazing Grace');
}

function playGreensleeves() {
    initAudio();
    // Greensleeves (A minor): A-C-D-E-F-E-D-B-G-A
    const melody = [
        {note: 'A', octave: 4, duration: 600},
        {note: 'C', octave: 5, duration: 400},
        {note: 'D', octave: 5, duration: 300},
        {note: 'E', octave: 5, duration: 500},
        {note: 'F', octave: 5, duration: 400},
        {note: 'E', octave: 5, duration: 300},
        {note: 'D', octave: 5, duration: 600},
        {note: 'B', octave: 4, duration: 400},
        {note: 'G', octave: 4, duration: 500},
        {note: 'A', octave: 4, duration: 800}
    ];
    
    // Complex minor key harmony: Am - F - G - Em - Am - F - G - Am
    const chords = [
        {notes: ['A', 'C', 'E'], octave: 3, duration: 600},  // A minor
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},  // F major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 300},  // G major
        {notes: ['E', 'G', 'B'], octave: 3, duration: 500},  // E minor
        {notes: ['F', 'A', 'C'], octave: 3, duration: 400},  // F major
        {notes: ['C', 'E', 'G'], octave: 3, duration: 300},  // C major
        {notes: ['G', 'B', 'D'], octave: 3, duration: 600},  // G major
        {notes: ['E', 'G', 'B'], octave: 3, duration: 400},  // E minor
        {notes: ['A', 'C', 'E'], octave: 3, duration: 500},  // A minor
        {notes: ['A', 'C', 'E'], octave: 3, duration: 800}   // A minor
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
                const chordOctave = Math.max(0, Math.min(4, chords[i].octave - 3));
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
            const visualOctave = Math.max(0, Math.min(4, noteData.octave - 3));
            const melodySegment = `${noteData.note}-${visualOctave}`;
            
            // Combine chord and melody highlights
            if (chords && chords[i]) {
                const chordOctave = Math.max(0, Math.min(4, chords[i].octave - 3));
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
        
        // Clear highlighting briefly before the next note
        setTimeout(() => {
            highlightedSegments = [];
            drawWheel();
        }, delay + noteData.duration - 30);
        
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
            const visualOctave = Math.max(0, Math.min(4, noteData.octave - 3)); // Map to visual rings
            highlightedSegments = [`${noteData.note}-${visualOctave}`];
            drawWheel();
            
            const noteIndex = notes.indexOf(noteData.note);
            document.getElementById('noteDisplay').textContent = `${noteData.note}${noteData.octave}`;
            document.getElementById('noteDisplay').style.color = `hsl(${noteToHue(noteIndex)}, 70%, 60%)`;
            document.getElementById('freqDisplay').textContent = `${title} - Note ${i + 1} of ${melody.length}`;
        }, delay);
        
        // Clear highlighting briefly before the next note (for repeated note flashing)
        setTimeout(() => {
            highlightedSegments = [];
            drawWheel();
        }, delay + noteData.duration - 30); // Clear 30ms before next note
        
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
    
    if (distance <= maxRadius) {
        const octave = Math.floor(distance / (maxRadius / octaves));
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
    
    if (distance <= maxRadius) {
        const octave = Math.floor(distance / (maxRadius / octaves));
        const noteIndex = Math.floor((angle / (Math.PI * 2)) * notes.length) % notes.length;
        const note = notes[noteIndex];
        
        // Map visual octave to audio octave - shifted up for better audibility
        // Ring 0 (innermost) = Octave 3 (more audible than octave 2)
        // Ring 1 = Octave 4
        // Ring 2 (middle) = Octave 5
        // Ring 3 = Octave 6
        // Ring 4 (outermost) = Octave 7
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
    
    document.getElementById('dorian-btn').addEventListener('click', () => {
        playScaleType('dorian');
    });
    
    document.getElementById('mixolydian-btn').addEventListener('click', () => {
        playScaleType('mixolydian');
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