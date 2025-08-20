"use strict";
class VibrationManager {
  static vibrate(duration = 15, pattern = null) {
    try {
      if (!this.isVibrationSupported()) return;
      const vibrationValue = parseInt(localStorage.getItem("vibration")) || 50;
      if (vibrationValue <= 0) return;
      let vibrationPattern;
      if (pattern) {
        vibrationPattern = pattern.map((ms) =>
          Math.min(ms * (vibrationValue / 100), 100)
        );
      } else {
        vibrationPattern = Math.min(duration * (vibrationValue / 100), 100);
      }
      navigator.vibrate(vibrationPattern);
    } catch (e) {
      console.debug("Vibration not supported", e);
    }
  }
  static isVibrationSupported() {
    return "vibrate" in navigator;
  }
  static patterns = {
    button: 15,
    collision: 20,
    explosion: [30, 10, 30],
    score: [50, 10, 50],
    gameOver: [40, 10, 40, 10, 40],
    menu: 10,
    error: [100, 50, 100],
  };
}
function getBasePath() {
  const scripts = document.getElementsByTagName("script");
  for (let i = 0; i < scripts.length; i++) {
    if (scripts[i].src.includes("vibration.js")) {
      const url = new URL(scripts[i].src);
      return url.pathname.replace("/js/vibration.js", "");
    }
  }
  const path = window.location.pathname;
  if (path.includes("/html/")) {
    return "..";
  }
  return ".";
}
window.ensureVibrationManager = function (callback) {
  if (!("vibrate" in navigator)) {
    console.log("Vibration not supported by browser");
    if (callback) callback();
    return;
  }
  if (typeof VibrationManager !== "undefined") {
    if (callback) callback();
    return;
  }
  const existingScript = document.querySelector('script[src*="vibration.js"]');
  if (existingScript) {
    const onLoad = function () {
      console.log("Vibration script loaded successfully");
      if (callback) setTimeout(callback, 100);
    };
    if (existingScript.complete) {
      onLoad();
    } else {
      existingScript.addEventListener("load", onLoad);
    }
    return;
  }
  const basePath = getBasePath();
  const scriptPath = `${basePath}/js/vibration.js`;
  console.log("Loading vibration script:", scriptPath);
  const script = document.createElement("script");
  script.src = scriptPath;
  script.onload = function () {
    console.log("Vibration script loaded successfully");
    if (callback) setTimeout(callback, 100);
  };
  script.onerror = function (error) {
    console.error("Failed to load vibration script:", error);
    if (callback) callback();
  };
  document.head.appendChild(script);
};
