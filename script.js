const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const statusEl = document.getElementById('status');
const emotionEl = document.getElementById('emotion');
const toggleBtn = document.getElementById('toggleBtn');
const voiceToggle = document.getElementById('voiceToggle');
const mouthOpenBar = document.getElementById('mouthOpenBar');
const mouthWidthBar = document.getElementById('mouthWidthBar');
const eyeOpenBar = document.getElementById('eyeOpenBar');
const browRaiseBar = document.getElementById('browRaiseBar');
const mouthOpenValue = document.getElementById('mouthOpenValue');
const mouthWidthValue = document.getElementById('mouthWidthValue');
const eyeOpenValue = document.getElementById('eyeOpenValue');
const browRaiseValue = document.getElementById('browRaiseValue');

let camera = null;
let running = false;
let voiceEnabled = true;
let lastSpoken = 0;
let lastEmotion = null;

function speak(text){
  if(!voiceEnabled) return;
  const now = Date.now();
  if(now - lastSpoken < 3500 && lastEmotion === text) return; // throttle similar messages
  lastSpoken = now; lastEmotion = text;
  try{
    const ut = new SpeechSynthesisUtterance(text);
    ut.lang = 'zh-TW';
    speechSynthesis.cancel();
    speechSynthesis.speak(ut);
  }catch(e){ console.warn('TTS not available', e); }
}

function resizeCanvasToVideo(){
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
}

function distance(a,b){
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function calculateMetrics(landmarks){
  const leftEyeOuter = landmarks[33];
  const rightEyeOuter = landmarks[263];
  const eyeDist = distance(leftEyeOuter, rightEyeOuter) || 0.0001;

  const mouthTop = landmarks[13];
  const mouthBottom = landmarks[14];
  const mouthOpen = distance(mouthTop, mouthBottom) / eyeDist;

  const mouthLeft = landmarks[61];
  const mouthRight = landmarks[291];
  const mouthWidth = distance(mouthLeft, mouthRight) / eyeDist;

  const leftEyeTop = landmarks[159];
  const leftEyeBottom = landmarks[145];
  const rightEyeTop = landmarks[386];
  const rightEyeBottom = landmarks[374];
  const leftEyeOpen = distance(leftEyeTop, leftEyeBottom) / eyeDist;
  const rightEyeOpen = distance(rightEyeTop, rightEyeBottom) / eyeDist;
  const eyeOpen = (leftEyeOpen + rightEyeOpen) / 2;

  const leftBrow = landmarks[105];
  const rightBrow = landmarks[334];
  const leftBrowRaise = (leftBrow && leftEyeTop) ? (leftEyeTop.y - leftBrow.y) : 0;
  const rightBrowRaise = (rightBrow && rightEyeTop) ? (rightEyeTop.y - rightBrow.y) : 0;
  const browRaise = (leftBrowRaise + rightBrowRaise) / 2;

  let emotion = '中性表情';
  if(mouthOpen > 0.22 && eyeOpen > 0.16){ emotion = '驚訝'; }
  else if(eyeOpen < 0.06){ emotion = '疲勞'; }
  else if(mouthWidth > 0.55 && mouthOpen < 0.06){ emotion = '微笑'; }
  else if(mouthOpen > 0.09 && mouthWidth < 0.45){ emotion = '難過'; }

  return { emotion, mouthOpen, mouthWidth, eyeOpen, browRaise };
}

function updateMetrics(metrics){
  const toPercent = (value, max) => Math.min(1, Math.max(0, value / max)) * 100;
  mouthOpenBar.style.width = `${toPercent(metrics.mouthOpen, 0.35)}%`;
  mouthWidthBar.style.width = `${toPercent(metrics.mouthWidth, 0.75)}%`;
  eyeOpenBar.style.width = `${toPercent(metrics.eyeOpen, 0.2)}%`;
  browRaiseBar.style.width = `${toPercent(metrics.browRaise, 0.08)}%`;
  mouthOpenValue.textContent = metrics.mouthOpen.toFixed(2);
  mouthWidthValue.textContent = metrics.mouthWidth.toFixed(2);
  eyeOpenValue.textContent = metrics.eyeOpen.toFixed(2);
  browRaiseValue.textContent = metrics.browRaise.toFixed(3);
}

function onResults(results){
  if(!results || !results.multiFaceLandmarks) return;
  if(!videoElement.videoWidth) return;

  resizeCanvasToVideo();
  canvasCtx.save();
  canvasCtx.clearRect(0,0,canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  for(const landmarks of results.multiFaceLandmarks){
    window.drawConnectors(canvasCtx, landmarks, window.FACEMESH_TESSELATION, {color: '#C0C0C0', lineWidth: 1});
    window.drawLandmarks(canvasCtx, landmarks, {color: '#FF2C6D', radius: 1});

    const metrics = calculateMetrics(landmarks);
    emotionEl.textContent = `偵測表情：${metrics.emotion}`;
    updateMetrics(metrics);
    if(Date.now() - lastSpoken > 1200 || lastEmotion !== metrics.emotion){
      let phrase = '';
      if(metrics.emotion === '微笑') phrase = '你今天看起來很開心！笑得很棒喔！';
      else if(metrics.emotion === '驚訝') phrase = '哇，你看起來很驚訝！';
      else if(metrics.emotion === '難過') phrase = '你好像有點難過，要不要深呼吸一下？';
      else if(metrics.emotion === '疲勞') phrase = '你好像有點累了，要不要休息一下？';
      else phrase = '看起來很平靜喔。';
      speak(phrase);
    }
  }
  canvasCtx.restore();
}

const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6
});
faceMesh.onResults(onResults);

async function startCamera(){
  if(camera) return;
  camera = new Camera(videoElement, {
    onFrame: async () => { await faceMesh.send({image: videoElement}); },
    width: 640,
    height: 480
  });
  await camera.start();
}

toggleBtn.addEventListener('click', async ()=>{
  if(!running){
    try{
      await startCamera();
      running = true;
      toggleBtn.textContent = '停止偵測';
      statusEl.textContent = '狀態：偵測中';
    }catch(e){
      console.error(e);
      statusEl.textContent = '狀態：無法存取攝影機';
    }
  }else{
    if(camera){ camera.stop(); camera = null; }
    running = false;
    toggleBtn.textContent = '啟動偵測';
    statusEl.textContent = '狀態：未啟動';
  }
});

voiceToggle.addEventListener('change', ()=>{
  voiceEnabled = voiceToggle.checked;
});

// auto-resize canvas when video metadata is ready
videoElement.addEventListener('loadedmetadata', ()=> resizeCanvasToVideo());
