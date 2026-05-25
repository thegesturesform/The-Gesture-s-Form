let handPose;
let video;
let hands = [];
let textTexture;
let instructionDiv; // The text overlay element

// --- Game State Variables ---
let gameState = 'idle'; // 'idle', 'playing_missing', 'reveal_missing', 'playing_continuous', 'reveal_continuous', 'victory'
let currentPhase = 0; // 0 to 3 for 'Missing Words'
const PHASE_WORDS = ["Handwriting", "gestural", "letters’", "human"];
let targets = [];
let revealStartTime = 0;

// Colors for the 4 fingers: [R, G, B]
const FINGER_COLORS = {
  leftThumb: [215, 254, 82],  // #D7FE52
  leftIndex: [58, 83, 69],    // #3A5345
  rightThumb: [136, 149, 172], // #8895AC
  rightIndex: [227, 208, 252]  // #E3D0FC
};

let vScale = 1;
let vOffsetX = 0;
let vOffsetY = 0;

function preload() {
  handPose = ml5.handPose({ maxHands: 2 });
}

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  canvas.parent('canvas-container');

  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  updateCameraDimensions();

  // Create the initial text texture using the default value
  updateTextTexture("The Gesture's Form");

  textureMode(NORMAL);

  // Create the instruction text overlay dynamically so it sits perfectly on top
  instructionDiv = createDiv("Loading camera...");
  instructionDiv.parent('canvas-container');
  instructionDiv.style('position', 'absolute');
  instructionDiv.style('top', '30px');
  instructionDiv.style('width', '100%');
  instructionDiv.style('text-align', 'center');
  instructionDiv.style('color', 'white');
  instructionDiv.style('font-family', "'PT Mono', monospace");
  instructionDiv.style('font-size', '1.05rem');
  instructionDiv.style('font-weight', '600');
  instructionDiv.style('pointer-events', 'none');
  instructionDiv.style('z-index', '100'); // Force it to the very front

  // Listen to input changes on the custom word card
  const inputEl = document.getElementById('custom-word-input');
  if (inputEl) {
    inputEl.addEventListener('input', (e) => {
      if (gameState === 'idle') {
        updateTextTexture(e.target.value);
      }
    });
  }

  // Hook UI button listeners
  const btnMissing = document.getElementById('btn-missing-words');
  if (btnMissing) btnMissing.addEventListener('click', startMissingWords);

  const btnContinuous = document.getElementById('btn-continuous');
  if (btnContinuous) btnContinuous.addEventListener('click', startContinuous);

  const btnBack = document.getElementById('btn-back-menu');
  if (btnBack) btnBack.addEventListener('click', exitToMenu);

  const btnVictoryBack = document.getElementById('btn-victory-back');
  if (btnVictoryBack) btnVictoryBack.addEventListener('click', exitToMenu);

  const btnAbout = document.getElementById('btn-about');
  const btnCloseAbout = document.getElementById('btn-close-about');
  const aboutOverlay = document.getElementById('about-overlay');

  if (btnAbout && aboutOverlay) {
    btnAbout.addEventListener('click', () => {
      aboutOverlay.style.display = 'flex';
    });
  }
  if (btnCloseAbout && aboutOverlay) {
    btnCloseAbout.addEventListener('click', () => {
      aboutOverlay.style.display = 'none';
    });
  }
  if (aboutOverlay) {
    aboutOverlay.addEventListener('click', (e) => {
      if (e.target === aboutOverlay) {
        aboutOverlay.style.display = 'none';
      }
    });
  }

  handPose.detectStart(video, gotHands);
}

// --- Menu State and UI Transition Handlers ---

function startMissingWords() {
  gameState = 'playing_missing';
  currentPhase = 0;
  updateTextTexture(PHASE_WORDS[currentPhase]);
  generateTargets();
  toggleUI(false);
}

function startContinuous() {
  gameState = 'playing_continuous';
  const inputEl = document.getElementById('custom-word-input');
  updateTextTexture(inputEl ? inputEl.value : "The Gesture's Form");
  generateTargets();
  toggleUI(false);
}

function exitToMenu() {
  gameState = 'idle';
  const inputEl = document.getElementById('custom-word-input');
  updateTextTexture(inputEl ? inputEl.value : "The Gesture's Form");
  
  const aboutOverlay = document.getElementById('about-overlay');
  if (aboutOverlay) aboutOverlay.style.display = 'none';
  
  toggleUI(true);
}

function toggleUI(showMenu) {
  const mainMenu = document.getElementById('main-menu');
  const customCard = document.getElementById('custom-word-card');
  const backBtn = document.getElementById('btn-back-menu');
  const victoryCard = document.getElementById('victory-overlay');
  const aboutBtn = document.getElementById('btn-about');

  if (showMenu) {
    if (mainMenu) mainMenu.style.display = 'grid';
    if (customCard) customCard.style.display = 'flex';
    if (aboutBtn) aboutBtn.style.display = 'block';
    if (backBtn) backBtn.style.display = 'none';
    if (victoryCard) victoryCard.style.display = 'none';
  } else {
    if (mainMenu) mainMenu.style.display = 'none';
    if (customCard) customCard.style.display = 'none';
    if (aboutBtn) aboutBtn.style.display = 'none';
    if (gameState === 'victory') {
      if (backBtn) backBtn.style.display = 'none';
      if (victoryCard) victoryCard.style.display = 'flex';
    } else {
      if (backBtn) backBtn.style.display = 'block';
      if (victoryCard) victoryCard.style.display = 'none';
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateCameraDimensions();
}

function updateCameraDimensions() {
  // Calculate scale and offset to 'cover' the canvas with the video feed
  let vw = 640;
  let vh = 480;

  vScale = max(width / vw, height / vh);
  vOffsetX = (width - vw * vScale) / 2;
  vOffsetY = (height - vh * vScale) / 2;
}

// Update the dynamic text graphics buffer texture
function updateTextTexture(word) {
  let textVal = word || " ";

  let temp = createGraphics(10, 10);
  temp.textFont('PT Mono');
  temp.textSize(120);
  temp.textStyle(BOLD);
  let tw = temp.textWidth(textVal);
  temp.remove();

  let padding = 30;
  let w = max(50, tw + padding * 2);
  let h = 120 + padding * 2;

  if (textTexture) {
    textTexture.remove();
  }

  textTexture = createGraphics(w, h);
  textTexture.clear();
  textTexture.fill(255);
  textTexture.textAlign(CENTER, CENTER);
  textTexture.textFont('PT Mono');
  textTexture.textSize(120);
  textTexture.textStyle(BOLD);
  textTexture.text(textVal, textTexture.width / 2, textTexture.height / 2);
}

// Map a point from video space (640x480) to screen space with "cover" and mirror
function mapHandPoint(kp) {
  let vw = 640;
  let vh = 480;

  let sx = vOffsetX + kp.x * vScale;
  let sy = vOffsetY + kp.y * vScale;
  let mx = width - sx;

  let zScale = 2.0;
  let mz = kp.z ? -kp.z * zScale : 0;

  return { x: mx, y: sy, z: mz };
}

function generateTargets() {
  // Generate targets in quadrants so the mesh doesn't easily cross over itself
  targets = [
    { id: 'leftIndex', x: random(50, width / 2 - 50), y: random(50, height / 2 - 50), col: FINGER_COLORS.leftIndex, hit: false },
    { id: 'leftThumb', x: random(50, width / 2 - 50), y: random(height / 2 + 50, height - 50), col: FINGER_COLORS.leftThumb, hit: false },
    { id: 'rightIndex', x: random(width / 2 + 50, width - 50), y: random(50, height / 2 - 50), col: FINGER_COLORS.rightIndex, hit: false },
    { id: 'rightThumb', x: random(width / 2 + 50, width - 50), y: random(height / 2 + 50, height - 50), col: FINGER_COLORS.rightThumb, hit: false }
  ];
}

// Logic to detect if a hand is closed into a fist
function isHandClosed(hand) {
  let kp = hand.keypoints;
  if (!kp || kp.length < 21) return false;

  let wrist = kp[0];
  let indexMCP = kp[5];
  let middleMCP = kp[9];
  let ringMCP = kp[13];
  let pinkyMCP = kp[17];

  let indexTip = kp[8];
  let middleTip = kp[12];
  let ringTip = kp[16];
  let pinkyTip = kp[20];

  // Distances to wrist
  let dIndex = dist(indexTip.x, indexTip.y, wrist.x, wrist.y);
  let dIndexBase = dist(indexMCP.x, indexMCP.y, wrist.x, wrist.y);

  let dMiddle = dist(middleTip.x, middleTip.y, wrist.x, wrist.y);
  let dMiddleBase = dist(middleMCP.x, middleMCP.y, wrist.x, wrist.y);

  let dRing = dist(ringTip.x, ringTip.y, wrist.x, wrist.y);
  let dRingBase = dist(ringMCP.x, ringMCP.y, wrist.x, wrist.y);

  let dPinky = dist(pinkyTip.x, pinkyTip.y, wrist.x, wrist.y);
  let dPinkyBase = dist(pinkyMCP.x, pinkyMCP.y, wrist.x, wrist.y);

  // If a fingertip is curled inward closer to the wrist than the knuckle base
  let countFolded = 0;
  if (dIndex < dIndexBase * 0.85) countFolded++;
  if (dMiddle < dMiddleBase * 0.85) countFolded++;
  if (dRing < dRingBase * 0.85) countFolded++;
  if (dPinky < dPinkyBase * 0.85) countFolded++;

  return countFolded >= 3;
}

// Detect if both hands are closed
function detectClosedHands(hands) {
  if (hands.length < 2) return false;
  return isHandClosed(hands[0]) && isHandClosed(hands[1]);
}

function draw() {
  background(15, 23, 42);

  push();
  // Move origin to top-left to match 2D coordinates
  translate(-width / 2, -height / 2);

  // 1. Manually mirror the video and apply cover scaling
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, vOffsetX, vOffsetY, 640 * vScale, 480 * vScale);
  pop();

  // --- Game State Transitions & Expiration ---
  
  // 1. Missing Words reveal expiration
  if (gameState === 'reveal_missing' && millis() - revealStartTime > 2500) {
    if (currentPhase < 3) {
      currentPhase++;
      gameState = 'playing_missing';
      updateTextTexture(PHASE_WORDS[currentPhase]);
      generateTargets();
    } else {
      gameState = 'victory';
      toggleUI(false); // will show victory-overlay and hide gameplay buttons

      const inputEl = document.getElementById('custom-word-input');
      updateTextTexture(inputEl ? inputEl.value : "The Gesture's Form");
    }
  }

  // 2. Continuous Exploration reveal expiration
  if (gameState === 'reveal_continuous' && millis() - revealStartTime > 2500) {
    gameState = 'playing_continuous';
    generateTargets();
  }

  // Reset target hit statuses every frame
  if (gameState === 'playing_missing' || gameState === 'playing_continuous') {
    for (let t of targets) t.hit = false;
  }

  // --- Hand Mesh & Finger Tracking Logic ---
  if (hands.length === 2) {
    let h1 = hands[0];
    let h2 = hands[1];

    // Ensure the needed fingers are on screen
    if (h1.keypoints[4] && h1.keypoints[8] && h2.keypoints[4] && h2.keypoints[8]) {

      // Figure out which hand is left vs right
      let p1 = mapHandPoint(h1.keypoints[8]);
      let p2 = mapHandPoint(h2.keypoints[8]);
      let leftHand = p1.x < p2.x ? h1 : h2;
      let rightHand = p1.x < p2.x ? h2 : h1;

      // Structure the 4 active points using mapping
      let tl = { id: 'leftIndex', ...mapHandPoint(leftHand.keypoints[8]) };
      let bl = { id: 'leftThumb', ...mapHandPoint(leftHand.keypoints[4]) };
      let tr = { id: 'rightIndex', ...mapHandPoint(rightHand.keypoints[8]) };
      let br = { id: 'rightThumb', ...mapHandPoint(rightHand.keypoints[4]) };

      // Draw Mesh (Wireframe during Missing Words gameplay, Text Texture in all other states)
      if (gameState === 'playing_missing') {
        stroke(227, 208, 252, 100);
        strokeWeight(1.5);
        fill(227, 208, 252, 20); // semi-transparent wireframe fill
      } else {
        noStroke();
        texture(textTexture);
      }

      let res = 10;
      beginShape(TRIANGLES);
      for (let i = 0; i < res; i++) {
        for (let j = 0; j < res; j++) {
          let u1 = i / res;
          let v1 = j / res;
          let u2 = (i + 1) / res;
          let v2 = (j + 1) / res;

          let pA = getBilinearInterpolation(tl, tr, br, bl, u1, v1);
          let pB = getBilinearInterpolation(tl, tr, br, bl, u2, v1);
          let pC = getBilinearInterpolation(tl, tr, br, bl, u2, v2);
          let pD = getBilinearInterpolation(tl, tr, br, bl, u1, v2);

          if (gameState === 'playing_missing') {
            vertex(pA.x, pA.y, pA.z);
            vertex(pB.x, pB.y, pB.z);
            vertex(pC.x, pC.y, pC.z);

            vertex(pA.x, pA.y, pA.z);
            vertex(pC.x, pC.y, pC.z);
            vertex(pD.x, pD.y, pD.z);
          } else {
            vertex(pA.x, pA.y, pA.z, u1, v1);
            vertex(pB.x, pB.y, pB.z, u2, v1);
            vertex(pC.x, pC.y, pC.z, u2, v2);

            vertex(pA.x, pA.y, pA.z, u1, v1);
            vertex(pC.x, pC.y, pC.z, u2, v2);
            vertex(pD.x, pD.y, pD.z, u1, v2);
          }
        }
      }
      endShape();

      // Draw dotted lines connecting the fingers
      push();
      translate(0, 0, 5);
      let lineAlpha = (gameState === 'reveal_missing' || gameState === 'reveal_continuous' || gameState === 'victory') ? 255 : 120;
      drawDottedLine3D(tl, tr, 15, lineAlpha);
      drawDottedLine3D(tr, br, 15, lineAlpha);
      drawDottedLine3D(br, bl, 15, lineAlpha);
      drawDottedLine3D(bl, tl, 15, lineAlpha);
      pop();

      // Process and Draw Fingertips & Run Game Collision Logic
      let allFingers = [tl, bl, tr, br];
      let hitsThisFrame = 0;

      for (let finger of allFingers) {
        let fingerCol = [255, 255, 255]; // Default white

        if (gameState === 'playing_missing' || gameState === 'playing_continuous') {
          fingerCol = FINGER_COLORS[finger.id];

          // Check collision with its target
          let target = targets.find(t => t.id === finger.id);
          if (target) {
            let d = dist(finger.x, finger.y, target.x, target.y);
            if (d < 40) { // Hit distance threshold
              target.hit = true;
              hitsThisFrame++;
            }
          }
        } else if (gameState === 'reveal_missing' || gameState === 'reveal_continuous' || gameState === 'victory') {
          fingerCol = [255, 255, 255]; // Turn fingers white during success
        }

        // Draw the fingertip
        push();
        translate(finger.x, finger.y, finger.z + 5);
        noFill();
        let strokeAlpha = (gameState === 'reveal_missing' || gameState === 'reveal_continuous' || gameState === 'victory') ? 255 : 180;
        stroke(fingerCol[0], fingerCol[1], fingerCol[2], strokeAlpha);
        strokeWeight(6);
        ellipse(0, 0, 24, 24);
        pop();
      }

      // Trigger reveal states if all 4 target points are hit simultaneously
      if (gameState === 'playing_missing' && hitsThisFrame === 4) {
        gameState = 'reveal_missing';
        revealStartTime = millis();
        updateTextTexture(PHASE_WORDS[currentPhase]);
      } else if (gameState === 'playing_continuous' && hitsThisFrame === 4) {
        gameState = 'reveal_continuous';
        revealStartTime = millis();
        const inputEl = document.getElementById('custom-word-input');
        updateTextTexture(inputEl ? inputEl.value : "The Gesture's Form");
      }
    }
  } else {
    // Generic tracking if less than 2 hands are detected
    for (let hand of hands) {
      for (let p of [4, 8]) {
        if (hand.keypoints[p]) {
          let pt = mapHandPoint(hand.keypoints[p]);

          push();
          translate(pt.x, pt.y, pt.z + 5);
          noFill();
          stroke(255, 120);
          strokeWeight(4);
          ellipse(0, 0, 20, 20);
          pop();
        }
      }
    }
  }

  // --- Draw Game Targets ---
  if (gameState === 'playing_missing' || gameState === 'playing_continuous' || 
      gameState === 'reveal_missing' || gameState === 'reveal_continuous') {
    push();
    translate(0, 0, 2); // Ensure targets render on top of video but below mesh
    for (let t of targets) {
      if (gameState === 'reveal_missing' || gameState === 'reveal_continuous') {
        fill(255, 255, 255, 255);
        noStroke();
        ellipse(t.x, t.y, 60, 60);
      } else if (t.hit) {
        // Target is filled and solid when your finger correctly touches it
        fill(t.col[0], t.col[1], t.col[2], 200);
        noStroke();
        ellipse(t.x, t.y, 60, 60);
      } else {
        // Target is transparent and smaller when untouched
        fill(t.col[0], t.col[1], t.col[2], 120);
        noStroke();
        ellipse(t.x, t.y, 40, 40);

        // Inner target dot
        fill(255);
        ellipse(t.x, t.y, 8, 8);
      }
    }
    pop();
  }

  pop();

  updateInstructions();
}

function gotHands(results) {
  hands = results;

  const loader = document.getElementById('loading');
  if (loader && loader.style.display !== 'none') {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
    }, 500);
  }
}

// Helper function to bilinearly interpolate between 4 points in 3D
function getBilinearInterpolation(p1, p2, p3, p4, u, v) {
  let topX = lerp(p1.x, p2.x, u);
  let topY = lerp(p1.y, p2.y, u);
  let topZ = lerp(p1.z, p2.z, u);

  let botX = lerp(p4.x, p3.x, u);
  let botY = lerp(p4.y, p3.y, u);
  let botZ = lerp(p4.z, p3.z, u);

  return {
    x: lerp(topX, botX, v),
    y: lerp(topY, botY, v),
    z: lerp(topZ, botZ, v)
  };
}

// Helper function to draw a dotted line between two 3D points
function drawDottedLine3D(p1, p2, dotSpacing = 15, colAlpha = 120) {
  let d = dist(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
  let steps = Math.floor(d / dotSpacing);

  if (steps === 0) return;

  for (let i = 0; i <= steps; i++) {
    let u = i / steps;
    let x = lerp(p1.x, p2.x, u);
    let y = lerp(p1.y, p2.y, u);
    let z = lerp(p1.z, p2.z, u);

    push();
    translate(x, y, z);
    noStroke();
    fill(255, colAlpha);
    circle(0, 0, 6);
    pop();
  }
}

// Function to update the on-screen instructional text
function updateInstructions() {
  if (!instructionDiv) return;

  const isPlayingOrSuccess = (gameState !== 'idle' && gameState !== 'victory');
  if (hands.length < 2 && !isPlayingOrSuccess && gameState !== 'victory') {
    instructionDiv.html("Show both hands to the camera");
    return;
  }

  if (gameState === 'idle') {
    instructionDiv.html("Choose one of the interaction modes bellow and start exploring! (click)");
  } else if (gameState === 'playing_missing') {
    instructionDiv.html("Word " + (currentPhase + 1) + " of 4: Connect the colored dots with the ones in your fingers!");
  } else if (gameState === 'reveal_missing') {
    instructionDiv.html("Revealed: <span style='color: #D7FE52; font-size: 1.3rem; font-weight: bold;'>" + PHASE_WORDS[currentPhase] + "</span>! Loading next word...");
  } else if (gameState === 'playing_continuous') {
    instructionDiv.html("Continuous Exploration: Connect the colored dots with the ones in your fingers!");
  } else if (gameState === 'reveal_continuous') {
    const inputEl = document.getElementById('custom-word-input');
    const word = inputEl ? inputEl.value : "The Gesture's Form";
    instructionDiv.html("<span style='color: #E3D0FC; font-size: 1.3rem; font-weight: bold;'>" + word + "</span>! Generating next targets...");
  } else if (gameState === 'victory') {
    instructionDiv.html("Congratulations! You revealed all the missing words!");
  }
}
