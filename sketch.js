let video;
let detector;
let detections = [];

let glitchTimer = 0;
let glitchInterval = 5000;
let glitchActive = false;

let possessionActive = false;
let snapshot;
let ghostFigures = [];
let lastPossessionTime = 0;
let possessionCooldown = 2000;

let visitorMemories = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  video.elt.addEventListener('loadeddata', () => {
    detector = ml5.objectDetector('cocossd', () => {
      detect();
    });
  });

  glitchTimer = millis();
}

function draw() {
  if (possessionActive) {
    fill(0, 20);
    rect(0, 0, width, height);
  } else {
    background(0);
  }

  let now = millis();

  if (!possessionActive && now - glitchTimer > glitchInterval) {
    glitchActive = true;
    glitchTimer = now;
    glitchInterval = random(4000, 6000);
  }

  if (glitchActive && now - glitchTimer < 300) {
    drawGlitchFlash();
  } else if (glitchActive && now - glitchTimer >= 300) {
    glitchActive = false;
  }

  if (hasCloseFace(detections)) {
    possessionActive = true;

    drawVisitorMemories();
    drawPossessedPhoto(now - lastPossessionTime);
    drawFloatingSpirits();

    if (now - lastPossessionTime > possessionCooldown) {
      triggerPossession();
      lastPossessionTime = now;
    }
  } else {
    possessionActive = false;
  }
}

function drawGlitchFlash() {
  noStroke();
  for (let i = -3; i <= 3; i++) {
    let x = width / 2 + i * 20;
    let green = map(i, -3, 3, 80, 180);
    fill(80, green, 60, 180);
    rect(x, 0, 15, height);
  }

  for (let i = 0; i < 10; i++) {
    let y = random(height * 0.1, height * 0.5);
    let x = width / 2 + random(-100, 100);
    fill(50, random(180, 255), 50, 60);
    rect(x, y, random(30, 80), 2);
  }

  for (let i = 0; i < 5; i++) {
    let x = width / 2 + random(-80, 80);
    let y = height - random(20, 60);
    fill(random(120, 160), 80, 40, 80);
    ellipse(x, y, random(40, 80), 10);
  }
}

function drawPossessedPhoto(elapsed) {
  if (!snapshot) return;

  let ghost = snapshot.get();
  ghost.loadPixels();

  // Color channel offsets
  let rShift = int(random(-20, 20));
  let gShift = int(random(-20, 20));
  let bShift = int(random(-20, 20));

  for (let y = 0; y < ghost.height; y++) {
    for (let x = 0; x < ghost.width; x++) {
      let i = (y * ghost.width + x) * 4;

      let rIndex = ((y * ghost.width + constrain(x + rShift, 0, ghost.width - 1)) * 4);
      let gIndex = ((y * ghost.width + constrain(x + gShift, 0, ghost.width - 1)) * 4);
      let bIndex = ((y * ghost.width + constrain(x + bShift, 0, ghost.width - 1)) * 4);

      ghost.pixels[i]     = ghost.pixels[rIndex];     // R
      ghost.pixels[i + 1] = ghost.pixels[gIndex + 1]; // G
      ghost.pixels[i + 2] = ghost.pixels[bIndex + 2]; // B
    }
  }

  // Block displacement
  for (let i = 0; i < 20; i++) {
    let bx = int(random(ghost.width - 40));
    let by = int(random(ghost.height - 20));
    let bw = int(random(10, 40));
    let bh = int(random(5, 20));
    let dx = int(random(-30, 30));
    let dy = int(random(-15, 15));

    let block = ghost.get(bx, by, bw, bh);
    ghost.copy(block, 0, 0, bw, bh, bx + dx, by + dy, bw, bh);
  }

  ghost.updatePixels();

  // Fade photo before next capture
  let fadeAlpha = map(elapsed, 0, possessionCooldown, 255, 0);
  tint(255, fadeAlpha);
  image(ghost, 0, 0, width, height);

  // Color spikes
  for (let i = 0; i < 10; i++) {
    let x = random(width);
    let h = random(20, height / 2);
    let c = color(random(100, 255), random(100, 255), random(100, 255), 180);
    noStroke();
    fill(c);
    rect(x, random(height - h), 2, h);
  }

  // Scanline flicker
  for (let i = 0; i < height; i += 20) {
    stroke(255, 40);
    line(0, i + random(-1, 1), width, i + random(-1, 1));
  }
}

function drawVisitorMemories() {
  for (let i = 0; i < visitorMemories.length; i++) {
    let img = visitorMemories[i];
    let alpha = map(i, 0, visitorMemories.length, 30, 100);
    tint(255, alpha);
    image(img, 0, 0, width, height);
  }
}

function drawFloatingSpirits() {
  noStroke();
  for (let g of ghostFigures) {
    fill(30, 30, 30, 60);
    ellipse(g.x, g.y, g.w, g.h);
    g.y += sin(frameCount * 0.002 + g.offset) * 0.1;
    g.x += cos(frameCount * 0.001 + g.offset) * 0.05;
  }
}

function detect() {
  detector.detect(video, (err, results) => {
    if (err) {
      console.error(err);
      return;
    }
    detections = results;
    detect();
  });
}

function hasCloseFace(results) {
  return results.some(obj => obj.label === "person" && obj.width > width / 3);
}

function triggerPossession() {
  snapshot = video.get();
  visitorMemories.push(snapshot.get());
  if (visitorMemories.length > 10) {
    visitorMemories.shift();
  }
  generateGhostFigures();
}

function generateGhostFigures() {
  ghostFigures = [];
  let count = int(random(3, 6));
  for (let i = 0; i < count; i++) {
    ghostFigures.push({
      x: random(width * 0.2, width * 0.8),
      y: random(height * 0.3, height * 0.9),
      w: random(40, 80),
      h: random(80, 160),
      offset: random(TWO_PI)
    });
  }
}

function touchStarted() {
  if (!fullscreen()) {
    fullscreen(true);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

document.ontouchmove = function (event) {
  event.preventDefault();
};
