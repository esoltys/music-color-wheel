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

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
}

function playNote(frequency, duration = 200, volume = 0.3) {
    initAudio();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration / 1000);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration / 1000);
    
    return {oscillator, gainNode};
}

function playChromaticScale() {
    initAudio();
    const notesToPlay = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    let delay = 0;
    highlightedSegments = [];
    const playOctave = 2; // Middle ring
    
    notesToPlay.forEach((note) => {
        setTimeout(() => {
            const freq = noteToFrequency(note, 4);
            playNote(freq, 200, 0.25);
            highlightedSegments = [`${note}-${playOctave}`];
            drawWheel();
            const noteIndex = notes.indexOf(note);
            document.getElementById('noteDisplay').textContent = `${note}4`;
            document.getElementById('noteDisplay').style.color = `hsl(${noteToHue(noteIndex)}, 70%, 60%)`;
            document.getElementById('freqDisplay').textContent = `Chromatic scale - All 12 notes`;
        }, delay);
        delay += 120;
    });
    
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('noteDisplay').style.color = '#fff';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, delay + 200);
}

function playMajorScale() {
    initAudio();
    // C major: C-D-E-F-G-A-B-C
    const notesToPlay = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];
    const octaves = [4, 4, 4, 4, 4, 4, 4, 5];
    const visualOctaves = [2, 2, 2, 2, 2, 2, 2, 3]; // Which ring to highlight
    let delay = 0;
    highlightedSegments = [];
    
    // Show what scale is starting
    document.getElementById('noteDisplay').textContent = 'Starting C Major';
    document.getElementById('freqDisplay').textContent = 'C-D-E-F-G-A-B-C';
    
    notesToPlay.forEach((note, i) => {
        setTimeout(() => {
            const freq = noteToFrequency(note, octaves[i]);
            playNote(freq, 300, 0.25);
            highlightedSegments = [`${note}-${visualOctaves[i]}`];
            drawWheel();
            const noteIndex = notes.indexOf(note);
            document.getElementById('noteDisplay').textContent = `${note}${octaves[i]}`;
            document.getElementById('noteDisplay').style.color = `hsl(${noteToHue(noteIndex)}, 70%, 60%)`;
            document.getElementById('freqDisplay').textContent = `Major scale - Note ${i + 1} of 8`;
        }, delay);
        delay += 250;
    });
    
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('noteDisplay').style.color = '#fff';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, delay + 200);
}

function playMinorScale() {
    initAudio();
    // C natural minor: C-D-Eb-F-G-Ab-Bb-C
    const notesToPlay = ['C', 'D', 'D#', 'F', 'G', 'G#', 'A#', 'C'];
    const octaves = [4, 4, 4, 4, 4, 4, 4, 5];
    const visualOctaves = [2, 2, 2, 2, 2, 2, 2, 3];
    let delay = 0;
    highlightedSegments = [];
    
    // Let's add a visual indicator to show it's different
    document.getElementById('noteDisplay').textContent = 'Starting C Minor';
    document.getElementById('freqDisplay').textContent = 'C-D-E♭-F-G-A♭-B♭-C';
    
    notesToPlay.forEach((note, i) => {
        setTimeout(() => {
            const freq = noteToFrequency(note, octaves[i]);
            playNote(freq, 300, 0.25);
            highlightedSegments = [`${note}-${visualOctaves[i]}`];
            drawWheel();
            const noteIndex = notes.indexOf(note);
            
            // Show the actual note being played
            let displayNote = note;
            if (note === 'D#') displayNote = 'E♭';
            if (note === 'G#') displayNote = 'A♭';
            if (note === 'A#') displayNote = 'B♭';
            
            document.getElementById('noteDisplay').textContent = `${displayNote}${octaves[i]}`;
            document.getElementById('noteDisplay').style.color = `hsl(${noteToHue(noteIndex)}, 70%, 60%)`;
            document.getElementById('freqDisplay').textContent = `Minor scale - Note ${i + 1} of 8`;
        }, delay);
        delay += 250;
    });
    
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('noteDisplay').style.color = '#fff';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, delay + 200);
}

function playPentatonicScale() {
    initAudio();
    const notesToPlay = ['C', 'D', 'E', 'G', 'A', 'C'];
    const octaves = [4, 4, 4, 4, 4, 5];
    const visualOctaves = [2, 2, 2, 2, 2, 3];
    let delay = 0;
    highlightedSegments = [];
    
    notesToPlay.forEach((note, i) => {
        setTimeout(() => {
            const freq = noteToFrequency(note, octaves[i]);
            playNote(freq, 300, 0.25);
            highlightedSegments = [`${note}-${visualOctaves[i]}`];
            drawWheel();
            const noteIndex = notes.indexOf(note);
            document.getElementById('noteDisplay').textContent = `${note}${octaves[i]}`;
            document.getElementById('noteDisplay').style.color = `hsl(${noteToHue(noteIndex)}, 70%, 60%)`;
            document.getElementById('freqDisplay').textContent = `Pentatonic - 5 notes`;
        }, delay);
        delay += 250;
    });
    
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('noteDisplay').style.color = '#fff';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, delay + 200);
}

function playMajorChord() {
    initAudio();
    const chordNotes = ['C', 'E', 'G'];
    const chordOctave = 2; // Middle ring
    highlightedSegments = chordNotes.map(note => `${note}-${chordOctave}`);
    drawWheel();
    
    document.getElementById('noteDisplay').textContent = 'C Major';
    document.getElementById('freqDisplay').textContent = `C - E - G (Happy chord)`;
    
    chordNotes.forEach(note => {
        const freq = noteToFrequency(note, 4);
        playNote(freq, 1500, 0.2);
    });
    
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('noteDisplay').style.color = '#fff';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, 1500);
}

function playMinorChord() {
    initAudio();
    const chordNotes = ['C', 'D#', 'G'];  // C, Eb, G
    const chordOctave = 2; // Middle ring
    highlightedSegments = chordNotes.map(note => `${note}-${chordOctave}`);
    drawWheel();
    
    document.getElementById('noteDisplay').textContent = 'C Minor';
    document.getElementById('freqDisplay').textContent = `C - E♭ - G (Sad chord)`;
    
    chordNotes.forEach(note => {
        const freq = noteToFrequency(note, 4);
        playNote(freq, 1500, 0.2);
    });
    
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('noteDisplay').style.color = '#fff';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, 1500);
}

function playDiminishedChord() {
    initAudio();
    const chordNotes = ['C', 'D#', 'F#'];  // C, Eb, Gb
    const chordOctave = 2; // Middle ring
    highlightedSegments = chordNotes.map(note => `${note}-${chordOctave}`);
    drawWheel();
    
    document.getElementById('noteDisplay').textContent = 'C Diminished';
    document.getElementById('freqDisplay').textContent = `C - E♭ - G♭ (Tense chord)`;
    
    chordNotes.forEach(note => {
        const freq = noteToFrequency(note, 4);
        playNote(freq, 1500, 0.2);
    });
    
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('noteDisplay').style.color = '#fff';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, 1500);
}

// Additional scale functions
function playDorianScale() {
    initAudio();
    const notesToPlay = ['C', 'D', 'D#', 'F', 'G', 'A', 'A#', 'C'];
    const octaves = [4, 4, 4, 4, 4, 4, 4, 5];
    const visualOctaves = [2, 2, 2, 2, 2, 2, 2, 3];
    let delay = 0;
    highlightedSegments = [];
    
    document.getElementById('noteDisplay').textContent = 'C Dorian Mode';
    document.getElementById('freqDisplay').textContent = 'Jazz/Blues flavor';
    
    notesToPlay.forEach((note, i) => {
        setTimeout(() => {
            const freq = noteToFrequency(note, octaves[i]);
            playNote(freq, 300, 0.25);
            highlightedSegments = [`${note}-${visualOctaves[i]}`];
            drawWheel();
        }, delay);
        delay += 250;
    });
    
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, delay + 200);
}

function playMixolydianScale() {
    initAudio();
    const notesToPlay = ['C', 'D', 'E', 'F', 'G', 'A', 'A#', 'C'];
    const octaves = [4, 4, 4, 4, 4, 4, 4, 5];
    const visualOctaves = [2, 2, 2, 2, 2, 2, 2, 3];
    let delay = 0;
    highlightedSegments = [];
    
    document.getElementById('noteDisplay').textContent = 'C Mixolydian';
    document.getElementById('freqDisplay').textContent = 'Dominant sound';
    
    notesToPlay.forEach((note, i) => {
        setTimeout(() => {
            const freq = noteToFrequency(note, octaves[i]);
            playNote(freq, 300, 0.25);
            highlightedSegments = [`${note}-${visualOctaves[i]}`];
            drawWheel();
        }, delay);
        delay += 250;
    });
    
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, delay + 200);
}

function playBluesScale() {
    initAudio();
    const notesToPlay = ['C', 'D#', 'F', 'F#', 'G', 'A#', 'C'];
    const octaves = [4, 4, 4, 4, 4, 4, 5];
    const visualOctaves = [2, 2, 2, 2, 2, 2, 3];
    let delay = 0;
    highlightedSegments = [];
    
    document.getElementById('noteDisplay').textContent = 'C Blues Scale';
    document.getElementById('freqDisplay').textContent = 'The blue note creates tension';
    
    notesToPlay.forEach((note, i) => {
        setTimeout(() => {
            const freq = noteToFrequency(note, octaves[i]);
            playNote(freq, 300, 0.25);
            highlightedSegments = [`${note}-${visualOctaves[i]}`];
            drawWheel();
        }, delay);
        delay += 250;
    });
    
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, delay + 200);
}

function playWholeToneScale() {
    initAudio();
    const notesToPlay = ['C', 'D', 'E', 'F#', 'G#', 'A#', 'C'];
    const octaves = [4, 4, 4, 4, 4, 4, 5];
    const visualOctaves = [2, 2, 2, 2, 2, 2, 3];
    let delay = 0;
    highlightedSegments = [];
    
    document.getElementById('noteDisplay').textContent = 'Whole Tone Scale';
    document.getElementById('freqDisplay').textContent = 'Dreamlike, no resolution';
    
    notesToPlay.forEach((note, i) => {
        setTimeout(() => {
            const freq = noteToFrequency(note, octaves[i]);
            playNote(freq, 300, 0.25);
            highlightedSegments = [`${note}-${visualOctaves[i]}`];
            drawWheel();
        }, delay);
        delay += 250;
    });
    
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, delay + 200);
}

function playGlissando() {
    initAudio();
    const startFreq = noteToFrequency('C', 4);
    const endFreq = noteToFrequency('C', 6);
    
    document.getElementById('noteDisplay').textContent = 'Glissando';
    document.getElementById('freqDisplay').textContent = 'Continuous frequency sweep';
    
    // Create a continuous sweep
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + 3);
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime + 2.9);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 3);
    
    // Visual sweep
    let sweepTime = 0;
    const sweepInterval = setInterval(() => {
        sweepTime += 50;
        const progress = sweepTime / 3000;
        if (progress >= 1) {
            clearInterval(sweepInterval);
            highlightedSegments = [];
            drawWheel();
            document.getElementById('noteDisplay').textContent = 'Click to hear notes';
            document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
            return;
        }
        
        // Calculate current frequency and note
        const currentFreq = startFreq * Math.pow(endFreq/startFreq, progress);
        const noteIndex = Math.floor((12 * Math.log2(currentFreq / noteToFrequency('C', 0))) % 12);
        const octaveLevel = Math.floor(progress * 3); // Visual octave
        
        highlightedSegments = [`${notes[noteIndex]}-${octaveLevel + 1}`];
        drawWheel();
    }, 50);
}

// Additional chord functions
function playAugmentedChord() {
    initAudio();
    const chordNotes = ['C', 'E', 'G#'];
    const chordOctave = 2;
    highlightedSegments = chordNotes.map(note => `${note}-${chordOctave}`);
    drawWheel();
    
    document.getElementById('noteDisplay').textContent = 'C Augmented';
    document.getElementById('freqDisplay').textContent = 'C - E - G# (Mysterious)';
    
    chordNotes.forEach(note => {
        const freq = noteToFrequency(note, 4);
        playNote(freq, 1500, 0.2);
    });
    
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, 1500);
}

function playMaj7Chord() {
    initAudio();
    const chordNotes = ['C', 'E', 'G', 'B'];
    const chordOctave = 2;
    highlightedSegments = chordNotes.map(note => `${note}-${chordOctave}`);
    drawWheel();
    
    document.getElementById('noteDisplay').textContent = 'CMaj7';
    document.getElementById('freqDisplay').textContent = 'C - E - G - B (Jazzy)';
    
    chordNotes.forEach(note => {
        const freq = noteToFrequency(note, 4);
        playNote(freq, 2000, 0.15);
    });
    
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, 2000);
}

function playMin7Chord() {
    initAudio();
    const chordNotes = ['C', 'D#', 'G', 'A#'];
    const chordOctave = 2;
    highlightedSegments = chordNotes.map(note => `${note}-${chordOctave}`);
    drawWheel();
    
    document.getElementById('noteDisplay').textContent = 'Cm7';
    document.getElementById('freqDisplay').textContent = 'C - E♭ - G - B♭ (Smooth)';
    
    chordNotes.forEach(note => {
        const freq = noteToFrequency(note, 4);
        playNote(freq, 2000, 0.15);
    });
    
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, 2000);
}

function playDom7Chord() {
    initAudio();
    const chordNotes = ['C', 'E', 'G', 'A#'];
    const chordOctave = 2;
    highlightedSegments = chordNotes.map(note => `${note}-${chordOctave}`);
    drawWheel();
    
    document.getElementById('noteDisplay').textContent = 'C7';
    document.getElementById('freqDisplay').textContent = 'C - E - G - B♭ (Bluesy)';
    
    chordNotes.forEach(note => {
        const freq = noteToFrequency(note, 4);
        playNote(freq, 2000, 0.15);
    });
    
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, 2000);
}

function playSus2Chord() {
    initAudio();
    const chordNotes = ['C', 'D', 'G'];
    const chordOctave = 2;
    highlightedSegments = chordNotes.map(note => `${note}-${chordOctave}`);
    drawWheel();
    
    document.getElementById('noteDisplay').textContent = 'Csus2';
    document.getElementById('freqDisplay').textContent = 'C - D - G (Open sound)';
    
    chordNotes.forEach(note => {
        const freq = noteToFrequency(note, 4);
        playNote(freq, 1500, 0.2);
    });
    
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, 1500);
}

function playSus4Chord() {
    initAudio();
    const chordNotes = ['C', 'F', 'G'];
    const chordOctave = 2;
    highlightedSegments = chordNotes.map(note => `${note}-${chordOctave}`);
    drawWheel();
    
    document.getElementById('noteDisplay').textContent = 'Csus4';
    document.getElementById('freqDisplay').textContent = 'C - F - G (Suspended tension)';
    
    chordNotes.forEach(note => {
        const freq = noteToFrequency(note, 4);
        playNote(freq, 1500, 0.2);
    });
    
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, 1500);
}

function playAdd9Chord() {
    initAudio();
    const chordNotes = ['C', 'E', 'G', 'D'];
    const chordOctaves = [4, 4, 4, 5];
    const visualOctave = 2;
    
    highlightedSegments = ['C', 'E', 'G'].map(note => `${note}-${visualOctave}`);
    highlightedSegments.push(`D-${visualOctave + 1}`);
    drawWheel();
    
    document.getElementById('noteDisplay').textContent = 'Cadd9';
    document.getElementById('freqDisplay').textContent = 'C - E - G - D (Colorful)';
    
    chordNotes.forEach((note, i) => {
        const freq = noteToFrequency(note, chordOctaves[i]);
        playNote(freq, 1500, 0.15);
    });
    
    setTimeout(() => {
        highlightedSegments = [];
        drawWheel();
        document.getElementById('noteDisplay').textContent = 'Click to hear notes';
        document.getElementById('freqDisplay').textContent = 'Hover over the wheel';
    }, 1500);
}

// Song/Melody functions
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
    
    playMelody(melody, 'Twinkle, Twinkle, Little Star');
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
    
    playMelody(melody, 'Mary Had a Little Lamb');
}

function playHappyBirthday() {
    initAudio();
    // Happy Birthday: C-C-D-C-F-E-C-C-D-C-G-F-C-C-C-A-F-E-D
    const melody = [
        {note: 'C', octave: 4, duration: 300},
        {note: 'C', octave: 4, duration: 200},
        {note: 'D', octave: 4, duration: 500},
        {note: 'C', octave: 4, duration: 500},
        {note: 'F', octave: 4, duration: 500},
        {note: 'E', octave: 4, duration: 1000},
        {note: 'C', octave: 4, duration: 300},
        {note: 'C', octave: 4, duration: 200},
        {note: 'D', octave: 4, duration: 500},
        {note: 'C', octave: 4, duration: 500},
        {note: 'G', octave: 4, duration: 500},
        {note: 'F', octave: 4, duration: 1000},
        {note: 'C', octave: 4, duration: 300},
        {note: 'C', octave: 4, duration: 200},
        {note: 'C', octave: 5, duration: 500},
        {note: 'A', octave: 4, duration: 500},
        {note: 'F', octave: 4, duration: 500},
        {note: 'E', octave: 4, duration: 500},
        {note: 'D', octave: 4, duration: 1000}
    ];
    
    playMelody(melody, 'Happy Birthday');
}

function playAmazingGrace() {
    initAudio();
    // Amazing Grace (first line): G-C-E-C-E-D-C-G
    const melody = [
        {note: 'G', octave: 4, duration: 600},
        {note: 'C', octave: 5, duration: 400},
        {note: 'E', octave: 5, duration: 300},
        {note: 'C', octave: 5, duration: 500},
        {note: 'E', octave: 5, duration: 400},
        {note: 'D', octave: 5, duration: 800},
        {note: 'C', octave: 5, duration: 400},
        {note: 'G', octave: 4, duration: 1200}
    ];
    
    playMelody(melody, 'Amazing Grace');
}

function playGreensleeves() {
    initAudio();
    // Greensleeves (opening): A-C-D-E-F-E-D-C-A-G-A
    const melody = [
        {note: 'A', octave: 4, duration: 600},
        {note: 'C', octave: 5, duration: 400},
        {note: 'D', octave: 5, duration: 300},
        {note: 'E', octave: 5, duration: 500},
        {note: 'F', octave: 5, duration: 400},
        {note: 'E', octave: 5, duration: 400},
        {note: 'D', octave: 5, duration: 400},
        {note: 'C', octave: 5, duration: 600},
        {note: 'A', octave: 4, duration: 400},
        {note: 'G', octave: 4, duration: 400},
        {note: 'A', octave: 4, duration: 800}
    ];
    
    playMelody(melody, 'Greensleeves');
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
    
    playMelody(melody, 'Ode to Joy');
}

function playJingleBells() {
    initAudio();
    // Jingle Bells: E-E-E-E-E-E-E-G-C-D-E
    const melody = [
        {note: 'E', octave: 4, duration: 400},
        {note: 'E', octave: 4, duration: 400},
        {note: 'E', octave: 4, duration: 800},
        {note: 'E', octave: 4, duration: 400},
        {note: 'E', octave: 4, duration: 400},
        {note: 'E', octave: 4, duration: 800},
        {note: 'E', octave: 4, duration: 400},
        {note: 'G', octave: 4, duration: 400},
        {note: 'C', octave: 4, duration: 400},
        {note: 'D', octave: 4, duration: 400},
        {note: 'E', octave: 4, duration: 1200}
    ];
    
    playMelody(melody, 'Jingle Bells');
}

function playSilentNight() {
    initAudio();
    // Silent Night: G-A-G-E-G-A-G-E-D-D-B-C-C-G
    const melody = [
        {note: 'G', octave: 4, duration: 600},
        {note: 'A', octave: 4, duration: 300},
        {note: 'G', octave: 4, duration: 500},
        {note: 'E', octave: 4, duration: 1000},
        {note: 'G', octave: 4, duration: 600},
        {note: 'A', octave: 4, duration: 300},
        {note: 'G', octave: 4, duration: 500},
        {note: 'E', octave: 4, duration: 1000},
        {note: 'D', octave: 5, duration: 600},
        {note: 'D', octave: 5, duration: 400},
        {note: 'B', octave: 4, duration: 1200},
        {note: 'C', octave: 5, duration: 600},
        {note: 'C', octave: 5, duration: 400},
        {note: 'G', octave: 4, duration: 1200}
    ];
    
    playMelody(melody, 'Silent Night');
}

// Helper function to play a melody with visual feedback
function playMelody(melody, title) {
    let delay = 0;
    highlightedSegments = [];
    
    document.getElementById('noteDisplay').textContent = `Playing: ${title}`;
    document.getElementById('freqDisplay').textContent = 'Watch the notes light up!';
    
    melody.forEach((noteData, i) => {
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

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width) - centerX;
    const y = (e.clientY - rect.top) * (canvas.height / rect.height) - centerY;
    
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
    
    // Scale button listeners
    document.getElementById('chromatic-btn').addEventListener('click', () => {
        playChromaticScale();
    });
    
    document.getElementById('major-btn').addEventListener('click', () => {
        playMajorScale();
    });
    
    document.getElementById('minor-btn').addEventListener('click', () => {
        playMinorScale();
    });
    
    document.getElementById('pentatonic-btn').addEventListener('click', () => {
        playPentatonicScale();
    });
    
    document.getElementById('dorian-btn').addEventListener('click', () => {
        playDorianScale();
    });
    
    document.getElementById('mixolydian-btn').addEventListener('click', () => {
        playMixolydianScale();
    });
    
    document.getElementById('blues-btn').addEventListener('click', () => {
        playBluesScale();
    });
    
    document.getElementById('wholetone-btn').addEventListener('click', () => {
        playWholeToneScale();
    });
    
    document.getElementById('glissando-btn').addEventListener('click', () => {
        playGlissando();
    });
    
    // Chord button listeners
    document.getElementById('major-chord-btn').addEventListener('click', () => {
        playMajorChord();
    });
    
    document.getElementById('minor-chord-btn').addEventListener('click', () => {
        playMinorChord();
    });
    
    document.getElementById('diminished-btn').addEventListener('click', () => {
        playDiminishedChord();
    });
    
    document.getElementById('augmented-btn').addEventListener('click', () => {
        playAugmentedChord();
    });
    
    document.getElementById('maj7-btn').addEventListener('click', () => {
        playMaj7Chord();
    });
    
    document.getElementById('min7-btn').addEventListener('click', () => {
        playMin7Chord();
    });
    
    document.getElementById('dom7-btn').addEventListener('click', () => {
        playDom7Chord();
    });
    
    document.getElementById('sus2-btn').addEventListener('click', () => {
        playSus2Chord();
    });
    
    document.getElementById('sus4-btn').addEventListener('click', () => {
        playSus4Chord();
    });
    
    document.getElementById('add9-btn').addEventListener('click', () => {
        playAdd9Chord();
    });
    
    // Melody button listeners
    const melodyButtons = [
        { id: 'twinkle-btn', func: playTwinkleTwinkle },
        { id: 'mary-lamb-btn', func: playMaryLittleLamb },
        { id: 'happy-birthday-btn', func: playHappyBirthday },
        { id: 'amazing-grace-btn', func: playAmazingGrace },
        { id: 'greensleeves-btn', func: playGreensleeves },
        { id: 'ode-to-joy-btn', func: playOdeToJoy },
        { id: 'jingle-bells-btn', func: playJingleBells },
        { id: 'silent-night-btn', func: playSilentNight }
    ];
    
    melodyButtons.forEach(({ id, func }) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', func);
        } else {
            console.warn(`Melody button not found: ${id}`);
        }
    });
});

// Redraw on resize - outside of load event
window.addEventListener('resize', () => {
    size = setCanvasSize();
    centerX = size / 2;
    centerY = size / 2;
    maxRadius = size / 2 - 10;
    drawWheel();
});