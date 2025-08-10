# Music Color Wheel

An interactive visualization that maps musical notes to colors in a circular interface. Explore the fascinating relationships between sound frequencies and the visual spectrum through scales, chords, and familiar melodies with full harmonic accompaniment.

**🎵 [Try it live](https://esoltys.github.io/music-color-wheel/)**

## Features

### Interactive Interface
- **5-octave color wheel** with chromatic notes mapped to HSL color space
- **Click to play** individual notes across different octaves
- **Hover for information** - see note names, frequencies, and octave ranges
- **Responsive design** that works on desktop, tablet, and mobile

### Music Theory Exploration
- **Scales**: Major, minor, pentatonic, blues, dorian, mixolydian, whole-tone, and glissando
- **Chord progressions**: Triads, 7th chords, suspended chords, augmented and diminished
- **Enhanced melodies** with full harmonic accompaniment:
  - Twinkle, Twinkle, Little Star (I-V-vi-IV progression)
  - Mary Had a Little Lamb (simple I-V progression) 
  - Happy Birthday (classic phrase-based harmony)
  - Amazing Grace (rich C-F-Am-G progression)
  - Greensleeves (complex minor key harmony)
  - Ode to Joy (classical progression with extensive chord movement)

### Audio & Visual
- **Real-time audio synthesis** using Web Audio API with envelope shaping
- **Synchronized visual highlighting** showing both melody and chord relationships
- **Flashing notes** for repeated pitches in melodies
- **Frequency display** showing exact Hz values for each note

## Music & Color Theory

This visualization explores the fascinating relationship between musical and color harmonies:

**Frequency Relationships:**
- Musical octaves follow a 2:1 frequency ratio (C4 = 261.6Hz, C5 = 523.2Hz)
- Color octaves in light follow similar doubling patterns in wavelength
- Just as musical notes repeat every octave, colors cycle around the visible spectrum

**Harmonic Intervals:**
- **Perfect Fifth (3:2 ratio)**: C to G maps to complementary colors across the wheel
- **Major Third (5:4 ratio)**: Creates color triads similar to musical major chords
- **Minor Third (6:5 ratio)**: Produces more subtle, harmonious color relationships

**The Circle of Fifths:**
- Moving clockwise by 7 semitones (perfect fifths) creates the sequence: C-G-D-A-E-B-F#
- This maps to colors that create natural, pleasing progressions around the wheel
- Both music and color theory use circular representations for these relationships

## How it works

Each musical note is mapped to a specific color around the wheel:
- **C = Red (0°)**, C# = Orange-Red (30°), D = Orange (45°), etc.
- **Inner rings** represent lower octaves, **outer rings** represent higher octaves
- **Visual octaves 0-4** map to **audio octaves 3-7** for optimal audibility
- **Hover** to see note names, frequencies, and octave information
- **Click** to play individual notes with 500ms duration
- **Control panel** provides organized access to scales, chords, and melodies

## Technical Implementation

- **Pure vanilla JavaScript** - no external dependencies
- **HTML5 Canvas** for high-performance circular visualization
- **Web Audio API** for real-time sound synthesis with gain envelopes
- **Equal temperament tuning** with A4 = 440Hz standard
- **HSL color mapping** for perceptually uniform color relationships
- **Modular code structure** with separate CSS, JavaScript, and HTML files
- **GitHub Pages deployment** with social sharing meta tags

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Feel free to open issues or submit pull requests. The codebase is designed to be readable and extensible for educational purposes.