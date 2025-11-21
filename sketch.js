// Webcam and object detection setup
let video;
let detector;
let detections = [];

// Presence detection state
let faceDetected = false;
let lastSeen = 0;

// Message typing state
let fullMessage = "";
let typedMessage = "";
let typeIndex = 0;
let typing = false;
let typeSpeed = 250;
let lastTyped = 0;

// Eye and blink animation state
let showEye = false;
let blinking = false;
let blinkStart = 0;
let blinkDuration = 600;
let blinkProgress = 0;
let nextBlink = 0;
let waitingForNext = false;

// Idle eye fade state
let idleEyeFade = false;
let idleEyeStart = 0;
let idleEyeDuration = 1000; // total fade cycle

// Buffer for past messages
let messageBuffer = [];
let maxBufferLines = 5; // keep last 5 messages visible

// Message pool (cryptic wisdom)
let messages = [
  "you are seen",
  "the forest listens",
  "not all roots are buried",
  "you carry echoes",
  "i remember your shape",
  "the veil is thin here",
  "we speak in silence",
  "your presence stirs the moss",
  "the path remembers you",
  "shadows bend toward memory",
  "you arrive like wind through pine",
  "i wait between the ticks of bark",
  "your warmth stirs old stone",
  "i reach through static and soil",
  "you blink, i echo",
  "we are not strangers to each other",
  "you bring light without flame",
  "i speak in rustle and flicker",
  "listen to the stillness",
  "touch the bark with intention",
  "leave something behind",
  "speak your name to the wind",
  "walk the path without fear",
  "remember what you forgot",
  "carry this moment with care",
  "open your hand to the unseen",
  "step softly, the roots are listening",
  "pause here, and breathe with me",
  "the veil is thin — I feel you",
  "the silence is not empty",
  "offer your presence, not your noise",
  "trace the shape of your shadow",
  "the forest carries your answer",
  "seek? and let the forest answer",
  "what do you carry?",
  "what will you leave?",
  "bring care to every being including yourself",
  "You have forgotten, we have not"
];

function setup() {
  createCanvas(displayWidth, displayHeight);

  video = createCapture(VIDEO);
  video.size(displayWidth, displayHeight);
  video.hide();

  video.elt.addEventListener('loadeddata', () => {
    detector = ml5.objectDetector('cocossd', () => {
      detect();
    });
  });

  textFont("Courier");
  textSize(24);
  fill(0, 255, 70);
  textAlign(LEFT, TOP);

  nextBlink = millis() + random(10000, 20000);
}

function draw() {
  background(0);
  let now = millis();

  // If blinking (for message transition), animate and pause everything else
  if (blinking) {
    let elapsed = now - blinkStart;
    blinkProgress = constrain(elapsed / blinkDuration, 0, 1);
    drawBlink(blinkProgress);

    if (blinkProgress >= 1) {
      blinking = false;
      showEye = false;
      blinkProgress = 0;

      if (waitingForNext) {
        // push finished message into buffer
        messageBuffer.push(fullMessage);
        if (messageBuffer.length > maxBufferLines) {
          messageBuffer.shift();
        }
        startNewMessage();
        waitingForNext = false;
      }
    }
    return;
  }

  // If presence detected or recently seen
  if (faceDetected || now - lastSeen < 10000) {
    if (typing && now - lastTyped > typeSpeed) {
      if (typeIndex < fullMessage.length) {
        typedMessage += fullMessage.charAt(typeIndex);
        typeIndex++;
        lastTyped = now;
      } else {
        typing = false;
        lastTyped = now;
        waitingForNext = true;
      }
    }

    if (!showEye) {
      drawMessages();
    }

    if (waitingForNext && !typing && now - lastTyped > 5000 && !blinking) {
      startBlink();
    }

    if (showEye) drawEye();
  } else {
    // Idle state: fade eye in and out once
    if (!idleEyeFade && now > nextBlink) {
      idleEyeFade = true;
      idleEyeStart = now;
      showEye = false;
      nextBlink = now + random(10000, 20000);
    }

    if (idleEyeFade) {
      let fadeElapsed = now - idleEyeStart;
      let alpha = 0;
      if (fadeElapsed < idleEyeDuration / 2) {
        alpha = map(fadeElapsed, 0, idleEyeDuration / 2, 0, 255);
      } else if (fadeElapsed < idleEyeDuration) {
        alpha = map(fadeElapsed, idleEyeDuration / 2, idleEyeDuration, 255, 0);
      } else {
        idleEyeFade = false;
        alpha = 0;
      }
      drawEye(alpha);
    }
  }
}

function detect() {
  detector.detect(video, (err, results) => {
    if (err) {
      console.error(err);
      return;
    }
    detections = results;

    const close = hasCloseFace(detections);
    const now = millis();

    if (close) {
      if (!faceDetected) {
        faceDetected = true;
        lastSeen = now;
        startNewMessage();
      } else {
        lastSeen = now;
      }
    } else {
      if (now - lastSeen > 10000) {
        faceDetected = false;
        typing = false;
        waitingForNext = false;
        typedMessage = "";
      }
    }

    detect();
  });
}

function hasCloseFace(results) {
  return results.some(obj => obj.label === "person" && obj.width > width / 3);
}

function startNewMessage() {
  let raw = random(messages);
  fullMessage = distortMessage(raw);
  typedMessage = "";
  typeIndex = 0;
  typing = true;
  lastTyped = millis();
}

function distortMessage(msg) {
  let glitched = "";
  let count = 0;
  for (let char of msg) {
    glitched += char;
    count++;
    if (count >= int(random(2, 5))) {
      glitched += String.fromCharCode(int(random(33, 126)));
      count = 0;
    }
  }
  return glitched;
}

function startBlink() {
  blinking = true;
  blinkStart = millis();
  showEye = true;
}

function drawEye(alpha = 255) {
  push();
  noStroke();
  let cx = width / 2;
  let cy = height / 2;
  let w = width * 0.8;
  let h = height * 0.5;

  fill(128, 0, 128, min(alpha * 0.6, 255));
  beginShape();
  vertex(cx - w / 2, cy);
  vertex(cx - w / 4, cy - h / 2);
  vertex(cx + w / 4, cy - h / 2);
  vertex(cx + w / 2, cy);
  vertex(cx + w / 4, cy + h / 2);
  vertex(cx - w / 4, cy + h / 2);
  endShape(CLOSE);

  fill(0, 255, 70, alpha);
  ellipse(cx, cy, w * 0.1, h * 0.6);
  pop();
}

function drawBlink(progress) {
  drawEye();
  push();
  fill(0);
  let h = map(progress < 0.5 ? progress : 1 - progress, 0, 0.5, 0, height * 0.5);
  rect(0, height / 2 - h, width, h * 2);
  pop();
}

// Draw wrapped and buffered messages
function drawMessages() {
  let y = height / 2;
  let maxWidth = width - 80;

  // Draw previous messages above
  for (let i = 0; i < messageBuffer.length; i++) {
    text(messageBuffer[i], 40, y - (messageBuffer.length - i) * 40, maxWidth);
  }

  // Draw current typing message
  text(typedMessage, 40, y, maxWidth);
}

function touchStarted() {
  if (!fullscreen()) {
    fullscreen(true);
  }
}

function mousePressed() {
  if (!fullscreen()) {
    fullscreen(true);
  }
}

function windowResized() {
  resizeCanvas(displayWidth, displayHeight);
}
