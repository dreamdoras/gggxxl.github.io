class MouseMusicGenerator {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.oscillator = null;
        this.gainNode = null;
        this.isPlaying = false;
        this.lastNoteTime = 0;
        this.notes = [60, 62, 64, 65, 67, 69, 71, 72]; // C4 到 C5 的大调音阶
        this.currentNote = 0;
        
        // 添加混响效果
        this.reverb = this.audioContext.createConvolver();
        this.createReverb();
        
        this.init();
    }

    async createReverb() {
        // 创建混响效果
        const response = await fetch('https://raw.githubusercontent.com/cwilso/AudioRecorder/master/sounds/impulse-responses/hall-reverb.wav');
        const arrayBuffer = await response.arrayBuffer();
        this.reverb.buffer = await this.audioContext.decodeAudioData(arrayBuffer);
    }

    init() {
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseenter', this.startSound.bind(this));
        document.addEventListener('mouseleave', this.stopSound.bind(this));
    }

    // 将MIDI音符转换为频率
    midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    // 创建钢琴音色
    createPianoSound() {
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const osc3 = this.audioContext.createOscillator();
        
        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc3.type = 'sine';

        const gainOsc1 = this.audioContext.createGain();
        const gainOsc2 = this.audioContext.createGain();
        const gainOsc3 = this.audioContext.createGain();

        gainOsc1.gain.value = 0.5;
        gainOsc2.gain.value = 0.2;
        gainOsc3.gain.value = 0.1;

        osc1.connect(gainOsc1);
        osc2.connect(gainOsc2);
        osc3.connect(gainOsc3);

        const masterGain = this.audioContext.createGain();
        gainOsc1.connect(masterGain);
        gainOsc2.connect(masterGain);
        gainOsc3.connect(masterGain);

        // 添加混响
        masterGain.connect(this.reverb);
        this.reverb.connect(this.audioContext.destination);
        masterGain.connect(this.audioContext.destination);

        return {
            oscillators: [osc1, osc2, osc3],
            masterGain: masterGain,
            start: () => {
                osc1.start();
                osc2.start();
                osc3.start();
            },
            stop: () => {
                osc1.stop();
                osc2.stop();
                osc3.stop();
            },
            setFrequency: (freq) => {
                osc1.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                osc2.frequency.setValueAtTime(freq * 2, this.audioContext.currentTime);
                osc3.frequency.setValueAtTime(freq * 4, this.audioContext.currentTime);
            }
        };
    }

    startSound() {
        if (this.isPlaying) return;
        this.piano = this.createPianoSound();
        this.gainNode = this.piano.masterGain;
        this.piano.start();
        this.isPlaying = true;
    }

    stopSound() {
        if (!this.isPlaying) return;
        const stopTime = this.audioContext.currentTime + 0.1;
        this.gainNode.gain.linearRampToValueAtTime(0, stopTime);
        this.piano.stop();
        this.isPlaying = false;
    }

    handleMouseMove(e) {
        if (!this.isPlaying) return;

        const now = this.audioContext.currentTime;
        const moveSpeed = Math.sqrt(
            Math.pow(e.movementX, 2) + Math.pow(e.movementY, 2)
        );

        // 只有当鼠标移动速度超过阈值时才触发新音符
        if (moveSpeed > 5 && now - this.lastNoteTime > 0.1) {
            // 根据X位置选择音符
            const noteIndex = Math.floor((e.clientX / window.innerWidth) * this.notes.length);
            const note = this.notes[noteIndex];
            
            // 计算频率并设置
            const frequency = this.midiToFreq(note);
            this.piano.setFrequency(frequency);

            // 设置音量（基于Y位置）
            const volume = 0.8 - (e.clientY / window.innerHeight) * 0.6;
            this.gainNode.gain.setValueAtTime(volume, now);

            // 添加音符衰减
            this.gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + 0.1);

            this.lastNoteTime = now;
        }
    }
}

// 当页面加载完成后初始化
window.addEventListener('load', () => {
    new MouseMusicGenerator();
}); 