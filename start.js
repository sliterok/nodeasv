const wfuncs = require('window-function');
const portAudio = require('naudiodon');
const Analyser = require('audio-analyser');
const SerialPort = require("serialport");

// COM port of arduino
const COMPORT = 21;

// Sample rate of sound device
const SAMPLERATE = 44100;

const port = new SerialPort("COM" + COMPORT, {
  baudRate: 44800
});
const minDb = 100;

// FFT sample size
const fftSize = 32;

// Maximal amplitude of sound
const amp = 8;

// Refresh rate of screen
const FPS = 120;

// Smoothing, or the priority of the old data over the new data
const smoothingTimeConstant = 0.3

let analyser = new Analyser({
    // Magnitude diapasone, in dB
    minDecibels: -minDb-8,
    maxDecibels: -30,

    // Number of time samples to transform to frequency
    fftSize: fftSize*2,

    // Number of frequencies, twice less than fftSize
    frequencyBinCount: fftSize,

    // Smoothing, or the priority of the old data over the new data
    smoothingTimeConstant: smoothingTimeConstant,

    // Number of channel to analyse
    channel: 0,

    // Size of time data to buffer
    bufferSize: SAMPLERATE,

    // Windowing function for fft, https://github.com/scijs/window-functions
    applyWindow: wfuncs.exactBlackman
});

// Show available sound devices
//console.log(portAudio.getDevices());

// Create an instance of AudioInput, which is a ReadableStream
let ai = new portAudio.AudioInput({
    channelCount: 1,
    sampleFormat: portAudio.SampleFormat16Bit,
    sampleRate: SAMPLERATE,
    deviceId: 4 // Use -1 or omit the deviceId to select microphone
});

// Handle errors from the AudioInput
ai.on('error', err => console.error);
// Pipe audioinput to audio analyser
ai.pipe(analyser)
//Start streaming
ai.start();

// Read data that is available but keep the stream from entering "flowing mode"
port.on('readable', function () {
  console.log(`COM${COMPORT} data:`, port.read().toString('utf8'));
});

// On port open event
port.on('open', function() {
    console.log(`COM${COMPORT} has been opened successfully`)
});

// On port error event
port.on('error', function(err) {
    console.log('Error: ', err.message);
})

function reconnectToPort(){
    if(!port.isOpen)
        port.open()
}

setInterval(reconnectToPort, 1000)

function getBeat(out){
    let narr = out.map(val => {
        let arr = Array(val).fill(1);
        for(let i = 0; i < 8; i ++){
            arr[i] = arr[i] === 1 ? 1 : 0
        }
        return arr;
    });

    let narr2 = [];
    for(let i = 0; i < 4; i++){
        narr2[i] = []
        for(let j = 0; j < 8; j++){
            narr2[i][j] = narr[i * 8 + j];
        }
    }

    for(let i = 0; i < 4; i++){
        rotateCounterClockwise(narr2[i])
    }


    narr2 = [].concat(...narr2.reduce((r, a) => {
        a.forEach((v, i) => (r[i] = r[i] || []).push(v));
        return r;
    }, []));

    for(let j = 0; j < 32; j++){
        narr2[j] = parseInt(narr2[j].join(''), 2)
    }

    return narr2;
}

function getTime(){
    let date = new Date();
    let n = date.getHours().toString() + date.getMinutes().toString().padStart(2, 0);

    return numberToData(n, true);
}

function numberToData(n, clock){
    let res = [];

    for (let i = 1; i <= 8; i++){
        for (let j = 3; j >= 0; j--) {
            let k = Math.floor(n / Math.pow(10, j));
            let r = alf[Math.floor(i + (k % 10) * 8)];

            // Add blinking colon every so often
            if(clock && ((i == 3 || i == 7) && j == 1)) {
                if (r < 128 && Math.floor(Date.now() / 700) % 2 == 1)
                    r += 128;
            }

            res.push(r)
        }
    }

    return res;
}

let lastTimeSound = 0;
function send() {
    let avg2 = 0;
    let res;

    let data = analyser.getFrequencyData().map(val => val+8)
    let out = data
    // Exponential algorithm
    //.map(val => Math.round((Math.exp((val + 50) / 50) - 0.3679) * 3.4037))
    .map(val => (minDb+val) / minDb)
    .map(val => (avg2 = (avg2 + val)/2, Math.round(val * amp)))

    if(avg2 < 0.2){
        if((Date.now() - lastTimeSound) > 10000)
            res = getTime();
        else
            res = getBeat(out);
    } else {
        res = getBeat(out)
        lastTimeSound = Date.now()
    }

    // Debug freq info in console
    //console.log(out.map(val => "=".repeat(val) + '>'))

    // Signaling bytes
    res.unshift(0xAA);
    res.unshift(0xAA);

    // Intensity of sound
    res.push(Math.round(((avgArray(data) + 100) * 0.15)));

    // Create buffer from array and write it to COM port
    let buf = Buffer.from(res)
    port.write(buf);
};

setInterval(send, 1000/FPS)

function rotateCounterClockwise(a){
    const n = a.length;
    for (let i = 0; i < n/2; i++) {
        for (let j = i; j < n-i-1; j++) {
            const tmp = a[i][j];
            a[i][j] = a[j][n-i-1];
            a[j][n-i-1] = a[n-i-1][n-j-1];
            a[n-i-1][n-j-1] = a[n-j-1][i];
            a[n-j-1][i] = tmp;
        }
    }
    return a;
}

function avgArray(arr) {
    return arr.reduce((acc, val) => acc+val)/arr.length
}


const alf = [0,
    28, 34, 34, 34, 34, 34, 34, 28,
    8, 24, 8, 8, 8, 8, 8, 28,
    28, 34, 2, 4, 8, 16, 32, 62,
    28, 34, 2, 4, 2, 2, 34, 28,
    34, 34, 34, 34, 62, 2, 2, 2,
    62, 32, 32, 60, 2, 2, 2, 60,
    28, 32, 32, 60, 34, 34, 34, 28,
    62, 2, 2, 4, 8, 16, 32, 32,
    28, 34, 34, 28, 34, 34, 34, 28,
    28, 34, 34, 30, 2, 2, 2, 28
];
