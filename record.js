let microphoneIsWiredUp = false;
let microphoneAccessIsNotAllowed = undefined;
let uploadMicrophoneData = false;
let suppressNoise = false;
let mediaStream = null;

//microfono apagado   OFF1  
let Module = null;
function stopMicrophone() {
  if (!microphoneIsWiredUp) {
    return;  
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => {
      track.stop();
    });
  }
  
  microphoneIsWiredUp = false;   



}

function getMicrophoneAccess() {
  if (microphoneIsWiredUp) {
    return;
  }
  var audioContext;
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
  } catch (e) {
    alert('Web Audio API is not supported in this browser.');
  }

  // Check if there is microphone input.
  navigator.getUserMedia = navigator.getUserMedia ||     // Pide al usuario permiso para usar un dispositivo multimedia como una cámara o micrófono.
                           navigator.webkitGetUserMedia ||
                           navigator.mozGetUserMedia ||
                           navigator.msGetUserMedia;
  if (!navigator.getUserMedia) {
    alert("getUserMedia() is not supported in your browser.");
    return;
  }
  var inputBuffer = [];
  var outputBuffer = [];
  var bufferSize = 4096;
  var sampleRate = audioContext.sampleRate;
  var processingNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
  //var noiseNode = audioContext.createScriptProcessor(bufferSize, 1, 1);

 /* noiseNode.onaudioprocess = function (e) {
    var input = e.inputBuffer.getChannelData(0);
    var output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < input.length; i++) {
        output[i] = input[i];  
          
    }
        
  };
*/
  function removeNoise(buffer) {
    let ptr = Module.ptr;
    let st = Module.st;
    for (let i = 0; i < 480; i++) {
      Module.HEAPF32[(ptr >> 2) + i] = buffer[i] * 8192;
    }
    Module._rnnoise_process_frame(st, ptr, ptr);
    for (let i = 0; i < 480; i++) {
      buffer[i] = Module.HEAPF32[(ptr >> 2) + i] / 8192;
    }
  }
  
  let frameBuffer = [];

  processingNode.onaudioprocess = function (e) {
    var input = e.inputBuffer.getChannelData(0);
    var output = e.outputBuffer.getChannelData(0);

    for (let i = 0; i < input.length; i++) {
      output[i] = input[i] + (Math.random() / 100);  // Agrega ruido  
        
  }
    // Drain input buffer.
    for (let i = 0; i < bufferSize; i++) {
      inputBuffer.push(input[i]);
    }

    

    while (inputBuffer.length >= 480) {
      for (let i = 0; i < 480; i++) {
        frameBuffer[i] = inputBuffer.shift();
      }
      // Process Frame
      if (suppressNoise) {
        removeNoise(frameBuffer);
      }
      for (let i = 0; i < 480; i++) {
        outputBuffer.push(frameBuffer[i]);
      }
    }
    // No hay suficientes datos, salir antes, de lo contrario, AnalyserNode devuelve NaN.
    if (outputBuffer.length < bufferSize) {
      return;
    }
    // Vaciar el búfer de salida.
    for (let i = 0; i < bufferSize; i++) {
      output[i] = outputBuffer.shift();
    }
  }


  // Get access to the microphone and start pumping data through the graph.
  navigator.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    }
  }, function (stream) {     // NSUP 1 
    mediaStream = stream;
    var microphone = audioContext.createMediaStreamSource(stream);
    var sourceAnalyserNode = audioContext.createAnalyser();
    var destinationAnalyserNode = audioContext.createAnalyser();
    

    microphone.connect(processingNode); 
    //noiseNode.connect(sourceAnalyserNode);
    //sourceAnalyserNode.connect(processingNode);  
    processingNode.connect(destinationAnalyserNode);

    destinationAnalyserNode.connect(audioContext.destination);
    microphoneIsWiredUp = true;

   

  }, function (e) {
    if (e.name === "PermissionDeniedError") {
      microphoneAccessIsNotAllowed = true;
      alert("You'll need to provied access to your microphone for this web page to work.");
    }
  });
}

/*function convertFloat32ToInt16(buffer) {
  let l = buffer.length;
  let buf = new Int16Array(l);
  while (l--) {
    buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
  }
  return buf;
}
*/

/*function stopStreaming() {
  return;
  
}
*/

function initializeNoiseSuppressionModule() {
  if (Module) {
    return;
  }
  Module = {
    noExitRuntime: true,
    noInitialRun: true,
    preInit: [],
    preRun: [],
    postRun: [function () {
      console.log(`Loaded Javascript Module OK`);
    }],
    memoryInitializerPrefixURL: "bin/",
    arguments: ['input.ivf', 'output.raw']
  };
  NoiseModule(Module);
  Module.st = Module._rnnoise_create();
  Module.ptr = Module._malloc(480 * 4); 
}


function liveNoiseSuppression() {

  
     
  getMicrophoneAccess();
  initializeNoiseSuppressionModule();
  //stopStreaming();
  
    suppressNoise = true;
  
}