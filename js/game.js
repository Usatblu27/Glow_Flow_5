"use strict";
// Uses Matter.js (https://brm.io/matter-js/)
if (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
) {
  if (
    window.navigator.standalone === false ||
    window.matchMedia("(display-mode: browser)").matches
  ) {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
  }
}
if (
  window.innerWidth > 768 &&
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
) {
  window.location.href = window.location.href;
}
const Engine = Matter.Engine,
  Render = Matter.Render,
  Runner = Matter.Runner,
  World = Matter.World,
  Bodies = Matter.Bodies,
  Body = Matter.Body,
  Events = Matter.Events,
  Composite = Matter.Composite,
  Query = Matter.Query;
const engine = Matter.Engine.create({
  positionIterations: 20,
  velocityIterations: 20,
  constraintIterations: 20,
});
engine.gravity.y = 0.3;
const pieceMaterial = {
  friction: 0.3,
  restitution: 0.2,
  frictionStatic: 0.5,
  slop: 0.1,
  chamfer: { radius: 5 },
  stiffness: 0.9,
};
let isProcessingCollision = false;
let touchStartX = 0;
let touchStartY = 0;
let lastTouchX = 0;
let rotationActive = false;
const gameWrapper = document.getElementById("game-wrapper");
const gameContainer = document.getElementById("game-container");
const gameOverDisplay = document.getElementById("game-over");
const restartBtn = document.getElementById("restart-btn");
const bgMusic = document.getElementById("bg-music");
const collisionSound = document.getElementById("collision-sound");
const explosionSound = document.getElementById("explosion-sound");
const gameWidth = gameWrapper.clientWidth;
const gameHeight = gameWrapper.clientHeight;
let fallenPiecesCount = 0;
const colorUnlockThresholds = [
  16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536,
  131072, 262144, 524288, 1048576,
];
function releaseCurrentPiece() {
  if (currentPiece) {
    currentPiece.isControlled = false;
    currentPiece = null;
  }
  canSpawnNewPiece = true;
}
const render = Matter.Render.create({
  element: gameContainer,
  engine: engine,
  options: {
    wireframes: false,
    antialias: false,
    width: gameWidth,
    height: gameHeight,
    wireframes: false,
    background: "transparent",
    showSleeping: true,
    showStats: false,
    showPerformance: false,
    enabled: false,
  },
});
let pieceIntervalId = null;
let checkLinesIntervalId = null;
let autoSaveIntervalId = null;
const pieces = [];
const allColors = [
  "#FE0000",
  "#3FFF0F",
  "#005DFF",
  "#F5FF00",
  "#FF009C",
  "#01FFE5",
  "#FF9C00",
  "#C500FF",
  "#960000",
  "#259609",
  "#00389C",
  "#999E00",
  "#99005E",
  "#019C8C",
  "#965C00",
  "#770099",
];
const shapes = [
  "circle",
  "square",
  "rectangle",
  "triangle",
  "pentagon",
  "hexagon",
  "trapezoid",
  "rhombus",
  "oval",
];
let colors = [];
let score = 0;
let displayedScore = 0;
let gameActive = true;
let currentPiece = null;
let canSpawnNewPiece = true;
let scoreAnimationFrame;
let pieceInterval;
let checkLinesInterval;
let baseArea = 1500;
let unlockedColors = 4;
let isCheckingLines = false;
let bestScore = parseInt(localStorage.getItem("bestScore")) || 0;
let displayedBestScore = bestScore;
let hasNewRecordInThisGame = false;
let autoSaveInterval;
let gameStartTime = Date.now();
let currentCombo = 0;
let maxCombo = 0;
let shapesCollected = 0;
let duration = 15;
let isPaused = false;
let runner = null;
const pauseBtn = document.getElementById("pause-btn");
const pauseOverlay = document.createElement("div");
pauseOverlay.id = "pause-overlay";
pauseOverlay.textContent = "PAUSED";
gameContainer.appendChild(pauseOverlay);
function initColors() {
  colors = allColors.slice(0, unlockedColors);
}
function loadGameSettings() {
  const defaults = {
    musicVolume: 50,
    soundEffects: 50,
    vibration: 50,
    gravity: 5,
    sensitivity: 50,
  };
  const settings = {};
  for (const key in defaults) {
    const value = localStorage.getItem(key);
    settings[key] = value !== null ? parseInt(value) : defaults[key];
  }
  return settings;
}
const gameSettings = loadGameSettings();
engine.gravity.y = gameSettings.gravity / 10;
bgMusic.volume = gameSettings.musicVolume / 100;
collisionSound.volume = gameSettings.soundEffects / 100;
explosionSound.volume = gameSettings.soundEffects / 100;
window.updateGameSettings = function () {
  const settings = loadGameSettings();
  gameSettings.musicVolume = settings.musicVolume;
  gameSettings.soundEffects = settings.soundEffects;
  gameSettings.gravity = settings.gravity;
  gameSettings.sensitivity = settings.sensitivity;
  engine.gravity.y = gameSettings.gravity / 10;
  bgMusic.volume = gameSettings.musicVolume / 100;
  collisionSound.volume = gameSettings.soundEffects / 100;
  explosionSound.volume = gameSettings.soundEffects / 100;
};
function applyGlowEffect(color) {
  return {
    fillStyle: color,
    strokeStyle: "#FFFFFF",
    lineWidth: 2 + Math.floor(3),
    shadowColor: color,
    shadowBlur: 15 + Math.floor(25),
    shadowOffset: { x: 0, y: 0 },
  };
}
function triggerVibration(patternName) {
  ensureVibrationManager(() => {
    if (
      typeof VibrationManager !== "undefined" &&
      VibrationManager.isVibrationSupported()
    ) {
      VibrationManager.vibrate(VibrationManager.patterns[patternName]);
    }
  });
}
function togglePause() {
  isPaused = !isPaused;
  if (!gameActive) return;
  const pauseIcon = document.querySelector("#pause-icon");
  if (isPaused) {
    pauseIcon.innerHTML = '<path d="M15 5 L30 20 L15 35 Z" fill="#00ffff"/>';
  } else {
    pauseIcon.innerHTML =
      '<rect x="10" y="5" width="8" height="30" rx="2" fill="#00ffff"/><rect x="22" y="5" width="8" height="30" rx="2" fill="#00ffff"/>';
  }
  if (isPaused) {
    if (runner) Runner.stop(runner);
    pauseOverlay.style.display = "flex";
    bgMusic.pause();
    if (pieceIntervalId) clearInterval(pieceIntervalId);
    if (checkLinesIntervalId) clearInterval(checkLinesIntervalId);
    if (autoSaveIntervalId) clearInterval(autoSaveIntervalId);
    pieceIntervalId = null;
    checkLinesIntervalId = null;
    autoSaveIntervalId = null;
  } else {
    if (!runner) runner = Runner.create();
    Runner.run(runner, engine);
    pauseOverlay.style.display = "none";
    if (localStorage.getItem("musicSetting") !== "off") {
      bgMusic.play().catch((e) => console.log("Play prevented:", e));
    }
    pieceIntervalId = setInterval(() => {
      if (canSpawnNewPiece) createPiece();
    }, 1000);
    checkLinesInterval = setInterval(checkLines, 100);
    autoSaveIntervalId = setInterval(() => {
      if (gameActive) saveStatistics();
    }, 30000);
  }
}
bgMusic.volume = (localStorage.getItem("musicVolume") || 50) / 100;
collisionSound.volume = 0.3;
explosionSound.volume = 0.3;
function playSound(sound) {
  const soundSetting = localStorage.getItem("soundEnabled") !== "false";
  if (soundSetting) {
    sound.currentTime = 0;
    sound.play().catch((e) => console.log("Sound play prevented:", e));
  }
}
function updateBestScore() {
  if (score > bestScore) {
    const oldBest = bestScore;
    bestScore = score;
    localStorage.setItem("bestScore", bestScore.toString());
    displayedBestScore = bestScore;
    document.getElementById("best-score").textContent = `BEST: ${bestScore}`;
    if (!hasNewRecordInThisGame && oldBest > 0) {
      hasNewRecordInThisGame = true;
      const centerX = gameWidth / 2;
      const centerY = gameHeight * 0.3;
      createBestScorePopup(bestScore, centerX, centerY);
      playSound(explosionSound);
      createExplosion(centerX, centerY, "#ff00ff");
      ensureVibrationManager(() => {
        if (typeof VibrationManager !== "undefined") {
          VibrationManager.vibrate(VibrationManager.patterns.score);
        }
      });
    }
  }
}
function createBestScorePopup(points, x, y) {
  const popup = document.createElement("div");
  popup.className = "best-score-popup";
  popup.textContent = `NEW BEST: ${points}`;
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
  gameContainer.appendChild(popup);
  setTimeout(() => {
    popup.remove();
  }, 1500);
}
function checkFieldOverflow() {
  if (!gameActive || isCheckingLines) return false;
  const totalArea = gameWidth * gameHeight;
  let occupiedArea = 0;
  const staticPieces = pieces.filter((piece) => piece !== currentPiece);
  staticPieces.forEach((piece) => {
    if (piece.bounds) {
      const width = piece.bounds.max.x - piece.bounds.min.x;
      const height = piece.bounds.max.y - piece.bounds.min.y;
      occupiedArea += width * height;
    }
  });
  const fillRatio = occupiedArea / totalArea;
  if (fillRatio < 0.5) return false;
  const sortedPieces = [...staticPieces].sort(
    (a, b) => b.position.y - a.position.y
  );
  const bottomPieces = sortedPieces.slice(
    0,
    Math.floor(sortedPieces.length * 0.4)
  );
  if (bottomPieces.length < 3) return false;
  const minDistance = 50;
  const maxDistance = 250;
  const adaptiveDistance =
    minDistance +
    (maxDistance - minDistance) * Math.max(0, (fillRatio - 0.5) / 0.4);
  const piecesToRemove = new Set();
  for (let i = 0; i < bottomPieces.length; i++) {
    for (let j = i + 1; j < bottomPieces.length; j++) {
      const dist = getDistance(bottomPieces[i], bottomPieces[j]);
      if (dist <= adaptiveDistance) {
        piecesToRemove.add(bottomPieces[i]);
        piecesToRemove.add(bottomPieces[j]);
      }
    }
  }
  if (piecesToRemove.size === 0) return false;
  removePiecesWithEffect(Array.from(piecesToRemove));
  const centerX = gameWidth / 2;
  const centerY = gameHeight * 0.7;
  const clearScore = Math.floor(100 * piecesToRemove.size * fillRatio);
  addScore(clearScore, "#FF5555", centerX, centerY);
  playSound(explosionSound);
  createExplosion(centerX, centerY, "#FF5555");
  return true;
}
function findClusters(piecesArray, maxDistance) {
  const clusters = [];
  const processed = new Set();
  for (const piece of piecesArray) {
    if (processed.has(piece)) continue;
    const cluster = [];
    const queue = [piece];
    processed.add(piece);
    while (queue.length > 0) {
      const current = queue.shift();
      cluster.push(current);
      for (const other of piecesArray) {
        if (processed.has(other)) continue;
        const dist = getDistance(current, other);
        if (dist <= maxDistance) {
          processed.add(other);
          queue.push(other);
        }
      }
    }
    if (cluster.length > 0) clusters.push(cluster);
  }
  return clusters;
}
const ground = Bodies.rectangle(
  gameWidth / 2,
  gameHeight + 50,
  gameWidth,
  100,
  {
    isStatic: true,
    render: { fillStyle: "#FF00FF" },
    friction: 0.1,
  }
);
const leftWall = Bodies.rectangle(-50, gameHeight / 2, 100, gameHeight, {
  isStatic: true,
  render: { visible: false },
  friction: 0,
  frictionStatic: 0,
  frictionAir: 0,
});
const rightWall = Bodies.rectangle(
  gameWidth + 50,
  gameHeight / 2,
  100,
  gameHeight,
  {
    isStatic: true,
    render: { visible: false },
    friction: 0,
    frictionStatic: 0,
    frictionAir: 0,
  }
);
const gameOverLine = Bodies.rectangle(
  gameWidth / 2,
  gameHeight * 0.2,
  gameWidth,
  2,
  {
    isStatic: true,
    isSensor: true,
    render: { visible: false },
  }
);
World.add(engine.world, [ground, leftWall, rightWall, gameOverLine]);
function animateScore() {
  if (Math.abs(displayedScore - score) < 1) {
    displayedScore = score;
    cancelAnimationFrame(scoreAnimationFrame);
  } else {
    displayedScore += (score - displayedScore) * 0.1;
    scoreAnimationFrame = requestAnimationFrame(animateScore);
  }
  document.getElementById("score").textContent = `SCORE: ${Math.floor(
    displayedScore
  )}`;
  updateBestScore();
  checkColorUnlocks();
}
function createExplosion(x, y, color) {
  const explosion = document.createElement("div");
  explosion.className = "explosion";
  explosion.style.left = `${x - 50}px`;
  explosion.style.top = `${y - 50}px`;
  explosion.style.boxShadow = `0 0 30px ${color}`;
  gameContainer.appendChild(explosion);
  setTimeout(() => {
    explosion.remove();
  }, 500);
}
function createScorePopup(x, y, points, color) {
  const popup = document.createElement("div");
  popup.className = "score-popup";
  popup.textContent = `+${points}`;
  popup.style.color = color;
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
  gameContainer.appendChild(popup);
  setTimeout(() => {
    popup.remove();
  }, 1000);
}
function createPiece() {
  if (!gameActive || !canSpawnNewPiece || isCheckingLines) return;
  canSpawnNewPiece = false;
  const x = gameWidth / 2;
  const shape = shapes[Math.floor(Math.random() * shapes.length)];
  const color = colors[Math.floor(Math.random() * colors.length)];
  let piece;
  const targetArea = baseArea;
  if (shape === "circle") {
    const radius = Math.sqrt(targetArea / Math.PI);
    piece = Bodies.circle(x, 50, radius, {
      ...pieceMaterial,
      sleepThreshold: 10,
      render: applyGlowEffect(color),
    });
  } else if (shape === "square") {
    const side = Math.sqrt(targetArea);
    piece = Bodies.rectangle(x, 50, side, side, {
      ...pieceMaterial,
      sleepThreshold: 10,
      render: applyGlowEffect(color),
    });
  } else if (shape === "rectangle") {
    const width = Math.sqrt(targetArea) * 2;
    const height = targetArea / width;
    piece = Bodies.rectangle(x, 50, width, height, {
      ...pieceMaterial,
      sleepThreshold: 10,
      render: applyGlowEffect(color),
    });
  } else if (shape === "triangle") {
    const side = Math.sqrt((4 * targetArea * 0.8) / Math.sqrt(3));
    piece = Bodies.polygon(x, 50, 3, side / (2 * Math.sin(Math.PI / 3)), {
      ...pieceMaterial,
      sleepThreshold: 10,
      render: applyGlowEffect(color),
    });
  } else if (shape === "pentagon") {
    const side = Math.sqrt((4 * targetArea * Math.tan(Math.PI / 5)) / 5);
    piece = Bodies.polygon(x, 50, 5, side / (2 * Math.sin(Math.PI / 5)), {
      ...pieceMaterial,
      sleepThreshold: 10,
      render: applyGlowEffect(color),
    });
  } else if (shape === "hexagon") {
    const side = Math.sqrt((2 * targetArea) / (3 * Math.sqrt(3)));
    piece = Bodies.polygon(x, 50, 6, side, {
      ...pieceMaterial,
      sleepThreshold: 10,
      render: applyGlowEffect(color),
    });
  } else if (shape === "trapezoid") {
    const width = Math.sqrt(targetArea * 1.5);
    const height = (targetArea / width) * 1.2;
    const vertices = [
      { x: -width / 2, y: -height / 2 },
      { x: width / 2, y: -height / 2 },
      { x: width / 3, y: height / 2 },
      { x: -width / 3, y: height / 2 },
    ];
    piece = Bodies.fromVertices(x, 50, [vertices], {
      ...pieceMaterial,
      sleepThreshold: 10,
      render: applyGlowEffect(color),
    });
  } else if (shape === "rhombus") {
    const width = Math.sqrt(targetArea * 3.5);
    const height = (targetArea / width) * 2;
    const vertices = [
      { x: 0, y: -height / 2 },
      { x: width / 2, y: 0 },
      { x: 0, y: height / 2 },
      { x: -width / 2, y: 0 },
    ];
    piece = Bodies.fromVertices(x, 50, [vertices], {
      ...pieceMaterial,
      sleepThreshold: 10,
      render: applyGlowEffect(color),
    });
  } else if (shape === "oval") {
    const width = Math.sqrt(targetArea * 3);
    const height = (targetArea / width) * 1.2;
    const vertices = [];
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      vertices.push({
        x: (width / 2) * Math.cos(angle),
        y: (height / 2) * Math.sin(angle),
      });
    }
    piece = Bodies.fromVertices(x, 50, [vertices], {
      ...pieceMaterial,
      sleepThreshold: 10,
      render: applyGlowEffect(color),
    });
  }
  piece.color = color;
  piece.shapeType = shape;
  World.add(engine.world, piece);
  pieces.push(piece);
  currentPiece = piece;
}
function saveStatistics() {
  if (!gameActive) return;
  const playTimeSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
  localStorage.setItem("lastScore", score.toString());
  localStorage.setItem(
    "totalShapes",
    parseInt(localStorage.getItem("totalShapes") || 0) + shapesCollected
  );
  shapesCollected = 0;
  localStorage.setItem(
    "totalPlayTime",
    parseInt(localStorage.getItem("totalPlayTime") || 0) + playTimeSeconds
  );
  if (maxCombo > parseInt(localStorage.getItem("highestCombo") || 0)) {
    localStorage.setItem("highestCombo", maxCombo.toString());
  }
  if (playTimeSeconds >= 10) {
    localStorage.setItem(
      "totalGames",
      (parseInt(localStorage.getItem("totalGames") || 0) + 1).toString()
    );
  }
  gameStartTime = Date.now();
}
function addScore(points, color, x, y) {
  if (points <= 0) return;
  score += points;
  shapesCollected++;
  currentCombo++;
  if (currentCombo > maxCombo) {
    maxCombo = currentCombo;
  }
  if (score % 10 === 0) {
    saveStatistics();
  }
  createScorePopup(x, y, points, color);
  animateScore();
}
function resetCombo() {
  currentCombo = 0;
}
function checkLines() {
  if (!gameActive || isCheckingLines) return;
  isCheckingLines = true;
  const colorGroups = {};
  const piecesToCheck = pieces.filter((piece) => piece !== currentPiece);
  piecesToCheck.forEach((piece) => {
    if (!colorGroups[piece.color]) {
      colorGroups[piece.color] = [];
    }
    colorGroups[piece.color].push(piece);
  });
  for (const color in colorGroups) {
    const piecesOfColor = colorGroups[color];
    const clusters = [];
    const processedPieces = new Set();
    for (let i = 0; i < piecesOfColor.length; i++) {
      const piece = piecesOfColor[i];
      if (processedPieces.has(piece)) continue;
      const cluster = [];
      const queue = [piece];
      processedPieces.add(piece);
      while (queue.length > 0) {
        const currentPiece = queue.shift();
        cluster.push(currentPiece);
        for (let j = 0; j < piecesOfColor.length; j++) {
          const neighborPiece = piecesOfColor[j];
          if (
            !processedPieces.has(neighborPiece) &&
            arePiecesConnected(currentPiece, neighborPiece)
          ) {
            processedPieces.add(neighborPiece);
            queue.push(neighborPiece);
          }
        }
      }
      if (cluster.length > 0) {
        clusters.push(cluster);
      }
    }
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      if (cluster.length >= 5) {
        let playerPieceInCluster = false;
        if (currentPiece) {
          playerPieceInCluster = cluster.includes(currentPiece);
        }
        if (!playerPieceInCluster) {
          const centerX =
            cluster.reduce((sum, piece) => sum + piece.position.x, 0) /
            cluster.length;
          const centerY =
            cluster.reduce((sum, piece) => sum + piece.position.y, 0) /
            cluster.length;
          cluster.forEach((piece) => {
            World.remove(engine.world, piece);
            const index = pieces.indexOf(piece);
            if (index > -1) pieces.splice(index, 1);
          });
          const clusterScore = Math.floor(400 + Math.random() * 200);
          addScore(clusterScore, color, centerX, centerY);
          playSound(explosionSound);
          createExplosion(centerX, centerY, color);
        }
      }
    }
  }
  isCheckingLines = false;
  checkGameOver();
}
function arePiecesConnected(pieceA, pieceB) {
  const boundsA = pieceA.bounds;
  const boundsB = pieceB.bounds;
  const dx = pieceA.position.x - pieceB.position.x;
  const dy = pieceA.position.y - pieceB.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const sizeA = Math.max(
    boundsA.max.x - boundsA.min.x,
    boundsA.max.y - boundsA.min.y
  );
  const sizeB = Math.max(
    boundsB.max.x - boundsB.min.x,
    boundsB.max.y - boundsB.min.y
  );
  const connectionThreshold = 5;
  return distance < (sizeA + sizeB) / 2 + connectionThreshold;
}
function getDistance(pieceA, pieceB) {
  const dx = pieceA.position.x - pieceB.position.x;
  const dy = pieceA.position.y - pieceB.position.y;
  return Math.sqrt(dx * dx + dy * dy);
}
function checkGameOver() {
  if (!gameActive) return;
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    if (piece === currentPiece) continue;
    if (piece.position.y < gameHeight * 0.2) {
      endGame();
      break;
    }
  }
}
function endGame() {
  const playTimeSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
  gameActive = false;
  gameOverDisplay.style.display = "block";
  restartBtn.style.display = "block";
  saveStatistics();
  if (playTimeSeconds >= 10) {
    const totalGames = parseInt(localStorage.getItem("totalGames") || "0") + 1;
    localStorage.setItem("totalGames", totalGames.toString());
  }
  clearInterval(pieceInterval);
  clearInterval(checkLinesInterval);
  clearInterval(autoSaveInterval);
  saveStatistics();
}
window.addEventListener("beforeunload", () => {
  if (gameActive) {
    const playTimeSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
    if (playTimeSeconds >= 10) {
      const totalGames =
        parseInt(localStorage.getItem("totalGames") || "0") + 1;
      localStorage.setItem("totalGames", totalGames.toString());
    }
    saveStatistics();
  }
});
window.addEventListener("pagehide", () => {
  if (gameActive) {
    saveStatistics();
  }
});
function restartGame() {
  clearInterval(pieceInterval);
  clearInterval(checkLinesInterval);
  clearInterval(autoSaveInterval);
  if (runner) Runner.stop(runner);
  runner = Runner.create();
  fallenPiecesCount = 0;
  gameStartTime = Date.now();
  currentCombo = 0;
  shapesCollected = 0;
  isPaused = false;
  pauseOverlay.style.display = "none";
  Composite.clear(engine.world, false);
  pieces.length = 0;
  hasNewRecordInThisGame = false;
  bestScore = parseInt(localStorage.getItem("bestScore")) || 0;
  document.getElementById("best-score").textContent = `BEST: ${bestScore}`;
  World.add(engine.world, [ground, leftWall, rightWall, gameOverLine]);
  score = 0;
  displayedScore = 0;
  unlockedColors = 4;
  document.getElementById("score").textContent = `SCORE: ${score}`;
  gameOverDisplay.style.display = "none";
  restartBtn.style.display = "none";
  gameActive = true;
  currentPiece = null;
  canSpawnNewPiece = true;
  initColors();
  clearInterval(pieceInterval);
  clearInterval(checkLinesInterval);
  pieceInterval = setInterval(() => {
    if (canSpawnNewPiece) {
      createPiece();
    }
  }, 1000);
  checkLinesInterval = setInterval(checkLines, 100);
  autoSaveInterval = setInterval(() => {
    if (gameActive) {
      saveStatistics();
    }
  }, 30000);
  Runner.run(runner, engine);
}
document.addEventListener("keydown", (e) => {
  if (!gameActive || !currentPiece || currentPiece.isSleeping) return;
  if (e.key === "ArrowLeft") {
    Body.setVelocity(currentPiece, { x: -5, y: currentPiece.velocity.y });
  } else if (e.key === "ArrowRight") {
    Body.setVelocity(currentPiece, { x: 5, y: currentPiece.velocity.y });
  } else if (e.key === "ArrowUp") {
    Body.setAngularVelocity(currentPiece, 0.05);
  } else if (e.key === "ArrowDown") {
    Body.setAngularVelocity(currentPiece, -0.05);
  }
});
gameContainer.addEventListener(
  "touchstart",
  (e) => {
    if (!gameActive || !currentPiece || currentPiece.isSleeping) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();
  },
  { passive: false }
);
gameContainer.addEventListener(
  "touchmove",
  (e) => {
    if (!gameActive || !currentPiece || currentPiece.isSleeping) return;
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const diffX = touchX - touchStartX;
    const diffY = touchY - touchStartY;
    if (Math.abs(diffX) > Math.abs(diffY)) {
      const sensitivity = gameSettings.sensitivity / 40;
      Body.setVelocity(currentPiece, {
        x: diffX * 0.2 * sensitivity,
        y: currentPiece.velocity.y,
      });
    } else {
      Body.setAngularVelocity(currentPiece, diffY * 0.002);
    }
    touchStartX = touchX;
    touchStartY = touchY;
    e.preventDefault();
  },
  { passive: false }
);
Events.on(engine, "collisionStart", (event) => {
  if (!gameActive || isCheckingLines || isProcessingCollision) return;
  isProcessingCollision = true;
  const pairs = event.pairs;
  let currentPieceCollided = false;
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const isCurrentPieceA = pair.bodyA === currentPiece;
    const isCurrentPieceB = pair.bodyB === currentPiece;
    if ((isCurrentPieceA || isCurrentPieceB) && currentPiece) {
      const otherBody = isCurrentPieceA ? pair.bodyB : pair.bodyA;
      if (
        otherBody === ground ||
        (pieces.includes(otherBody) && otherBody !== currentPiece)
      ) {
        currentPieceCollided = true;
        break;
      }
    }
  }
  if (currentPieceCollided && currentPiece) {
    playSound(collisionSound);
    resetCombo();
    fallenPiecesCount++;
    checkColorUnlocks();
    const collisionScore = Math.floor(1 + Math.random() * 5);
    addScore(
      collisionScore,
      currentPiece.color,
      currentPiece.position.x,
      currentPiece.position.y
    );
    releaseCurrentPiece();
    setTimeout(() => {
      isProcessingCollision = false;
    }, 50);
  } else {
    isProcessingCollision = false;
  }
});
restartBtn.addEventListener("click", () => {
  triggerVibration("button");
  restartGame();
});
function checkColorUnlocks() {
  for (let i = 0; i < colorUnlockThresholds.length; i++) {
    if (
      fallenPiecesCount >= colorUnlockThresholds[i] &&
      unlockedColors < i + 4
    ) {
      unlockedColors = i + 4;
      initColors();
      const centerX = gameWidth / 2;
      const centerY = gameHeight * 0.3;
      const unlockedColor = allColors[unlockedColors - 1];
      createScorePopup(centerX, centerY, `New color unlocked!`, unlockedColor);
      break;
    }
  }
}
window.addEventListener("resize", () => {
  render.options.width = gameWrapper.clientWidth;
  render.options.height = gameWrapper.clientHeight;
  Render.setPixelRatio(render, window.devicePixelRatio);
});
window.addEventListener("beforeunload", () => {
  if (gameActive) {
    const totalGames = parseInt(localStorage.getItem("totalGames") || "0") + 1;
    localStorage.setItem("totalGames", totalGames.toString());
  }
});
gameContainer.addEventListener(
  "touchmove",
  (e) => {
    if (!gameActive || !currentPiece) return;
    if (Math.abs(e.touches[0].clientX - touchStartX) > 10) {
      e.preventDefault();
    }
  },
  { passive: false }
);
initColors();
bestScore = parseInt(localStorage.getItem("bestScore")) || 0;
displayedBestScore = bestScore;
document.getElementById("best-score").textContent = `BEST: ${bestScore}`;
const musicSetting = localStorage.getItem("musicSetting") || "on";
if (musicSetting === "on") {
  bgMusic.play().catch((e) => console.log("Autoplay prevented:", e));
}
runner = Runner.create();
Runner.run(runner, engine);
Render.run(render);
render.options.hasShadows = true;

pieceInterval = setInterval(() => {
  if (canSpawnNewPiece) {
    createPiece();
  }
}, 1000);
checkLinesInterval = setInterval(checkLines, 100);
autoSaveInterval = setInterval(() => {
  if (gameActive) {
    saveStatistics();
  }
}, 30000);
pauseBtn.addEventListener("click", () => {
  triggerVibration("button");
  togglePause();
});
window.addEventListener("load", function () {
  setTimeout(function () {
    window.scrollTo(0, 1);
  }, 0);
  if (
    window.navigator.standalone ||
    window.matchMedia("(display-mode: standalone)").matches
  ) {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
});
