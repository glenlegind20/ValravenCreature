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
let typeSpeed = 250; // ms per character
let lastTyped = 0;

// Eye and blink animation state
let showEye = false;
let blinking = false;
let blinkStart = 0;
let blinkDuration = 600; // ms
let blinkProgress = 0;
let nextBlink = 0;
let waitingForNext = false;

// Idle eye fade state
let idleEyeFade = false;
let idleEyeStart = 0;
let idleEyeDuration = 1000; // total fade cycle

// Buffer for past messages (visible while presence persists)
let messageBuffer = [];
let maxBufferLines = 5; // keep last N finished messages

// Layout
let margin = 40; // text side margin

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
  // Use full device screen (important for iOS standalone + landscape)
  createCanvas(displayWidth, displayHeight);

  // Camera sized to the canvas
  video = createCapture(VIDEO);
  video.size(displayWidth, displayHeight);
  video.hide();

  // Object detector init
  video.elt.addEventListener('loadeddata', () => {
    detector = ml5.objectDetector('cocossd', () => {
      detect();
    });
  });

  // Text style
  textFont("Courier");
  textSize(24);
  fill(0, 255, 70);
  textAlign(LEFT, TOP);

  nextBlink = millis() + random(10000, 20000);
}

function draw() {
  background(0);
  const now = millis();

  // Blink animation takes over while active
  if (blinking) {
    const elapsed = now - blinkStart;
    blinkProgress = constrain(elapsed / blinkDuration, 0, 1);
    drawBlink(blinkProgress);

    if (blinkProgress >= 1) {
      blinking = false;
      showEye = false;
      blinkProgress = 0;

      if (waitingForNext) {
        // When a message has finished (post-blink), add it to buffer
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

  // Presence or recent presence window
  const presenceWindowMs = 10000; // keep content alive for 10s after last seen
  const isPresent = faceDetected || (now - lastSeen < presenceWindowMs);

  if (isPresent) {
    // Typewriter
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

    // Draw wrapped text while eye is not showing
    if (!showEye) {
      drawMessages();
    }

    // After a pause, trigger blink to transition
    if (waitingForNext && !typing && now - lastTyped > 5000 && !blinking) {
      startBlink();
    }

    // Draw eye when blinking/transition state requests it
    if (showEye) drawEye();
  } else {
    // When presence is gone beyond the window, clear buffer and current text
    if (messageBuffer.length > 0 || typedMessage.length > 0) {
      messageBuffer = [];
      typedMessage = "";
      waitingForNext = false;
      typing = false;
    }

    // Idle eye: single fade in/out occasionally
    if (!idleEyeFade && now > nextBlink) {
      idleEyeFade = true;
      idleEyeStart = now;
      showEye = false;
      nextBlink = now + random(10000, 20000);
    }

    if (idleEyeFade) {
      const fadeElapsed = now - idleEyeStart;
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
      // When not close and long enough since last seen, drop presence
      if (now - lastSeen > 10000) {
        faceDetected = false;
        typing = false;
        waitingForNext = false;
        typedMessage = "";
      }
    }

    // Loop detection
    detect();
  });
}

function hasCloseFace(results) {
  // Heuristic: a "person" bounding box wider than a third of canvas width
  return results.some(obj => obj.label === "person" && obj.width > width / 3);
}

function startNewMessage() {
  const raw = random(messages);
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
  const cx = width / 2;
  const cy = height / 2;
  const w = width * 0.8;
  const h = height * 0.5;

  // Purple sclera
  fill(128, 0, 128, Math.min(alpha * 0.6, 255));
  beginShape();
  vertex(cx - w / 2, cy);
  vertex(cx - w / 4, cy - h / 2);
  vertex(cx + w / 4, cy - h / 2);
  vertex(cx + w / 2, cy);
  vertex(cx + w / 4, cy + h / 2);
  vertex(cx - w / 4, cy + h / 2);
  endShape(CLOSE);

  // Green pupil
  fill(0, 255, 70, alpha);
  ellipse(cx, cy, w * 0.1, h * 0.6);
  pop();
}

function drawBlink(progress) {
  drawEye();
  push();
  fill(0);
  const h = map(progress < 0.5 ? progress : 1 - progress, 0, 0.5, 0, height * 0.5);
  rect(0, height / 2 - h, width, h * 2);
  pop();
}

// Draw wrapped messages: previous buffered above, current typing at center
function drawMessages() {
  const maxWidth = width - margin * 2;
  const centerY = height / 2;

  // Previous finished messages (buffer), stacked upward
  for (let i = 0; i < messageBuffer.length; i++) {
    const y = centerY - (messageBuffer.length - i) * 40;
    text(messageBuffer[i], margin, y, maxWidth);
  }

  // Current typing line
  text(typedMessage, margin, centerY, maxWidth);
}

// Fullscreen triggers for touch and mouse (helpful on mobile/desktop)
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

// Robust resize handling for orientation changes
function windowResized() {
  // Re-create canvas with full device dimensions
  resizeCanvas(displayWidth, displayHeight);

  // Also ensure video matches new size
  if (video && video.size) {
    video.size(displayWidth, displayHeight);
  }
}
