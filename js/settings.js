"use strict";

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
document.addEventListener("DOMContentLoaded", function () {
  const defaults = {
    musicVolume: 50,
    soundEffects: 50,
    vibration: 50,
    gravity: 5,
    sensitivity: 50,
  };
  function vibrateButton() {
    ensureVibrationManager(() => {
      if (typeof VibrationManager !== "undefined") {
        VibrationManager.vibrate(VibrationManager.patterns.button);
      }
    });
  }
  const settings = {};
  for (const key in defaults) {
    settings[key] = parseInt(localStorage.getItem(key)) || defaults[key];
  }
  document.getElementById("music-volume").value = settings.musicVolume;
  document.getElementById(
    "music-volume-value"
  ).textContent = `${settings.musicVolume}%`;
  document.getElementById("sound-effects").value = settings.soundEffects;
  document.getElementById(
    "sound-effects-value"
  ).textContent = `${settings.soundEffects}%`;
  document.getElementById("vibration").value = settings.vibration;
  document.getElementById(
    "vibration-value"
  ).textContent = `${settings.vibration}%`;
  document.getElementById("gravity").value = settings.gravity;
  document.getElementById("gravity-value").textContent = (
    settings.gravity / 10
  ).toFixed(1);
  document.getElementById("sensitivity").value = settings.sensitivity;
  document.getElementById(
    "sensitivity-value"
  ).textContent = `${settings.sensitivity}%`;
  document
    .getElementById("music-volume")
    .addEventListener("input", function () {
      document.getElementById(
        "music-volume-value"
      ).textContent = `${this.value}%`;
    });
  document
    .getElementById("sound-effects")
    .addEventListener("input", function () {
      document.getElementById(
        "sound-effects-value"
      ).textContent = `${this.value}%`;
    });
  document.getElementById("vibration").addEventListener("input", function () {
    document.getElementById("vibration-value").textContent = `${this.value}%`;
  });
  document.getElementById("gravity").addEventListener("input", function () {
    document.getElementById("gravity-value").textContent = (
      this.value / 10
    ).toFixed(1);
  });
  document.getElementById("sensitivity").addEventListener("input", function () {
    document.getElementById("sensitivity-value").textContent = `${this.value}%`;
  });
  document.getElementById("save-btn").addEventListener("click", function () {
    const settingsToSave = {
      musicVolume: document.getElementById("music-volume").value,
      soundEffects: document.getElementById("sound-effects").value,
      vibration: document.getElementById("vibration").value,
      gravity: document.getElementById("gravity").value,
      sensitivity: document.getElementById("sensitivity").value,
    };
    for (const key in settingsToSave) {
      localStorage.setItem(key, settingsToSave[key]);
    }
    if (typeof updateGameSettings === "function") {
      updateGameSettings();
    }
    vibrateButton();
    window.history.back();
  });
  document.getElementById("back-btn").addEventListener("click", function () {
    vibrateButton();
    window.history.back();
  });
  document.getElementById("default-btn").addEventListener("click", function () {
    document.getElementById("music-volume").value = defaults.musicVolume;
    document.getElementById(
      "music-volume-value"
    ).textContent = `${defaults.musicVolume}%`;
    document.getElementById("sound-effects").value = defaults.soundEffects;
    document.getElementById(
      "sound-effects-value"
    ).textContent = `${defaults.soundEffects}%`;
    document.getElementById("vibration").value = defaults.vibration;
    document.getElementById(
      "vibration-value"
    ).textContent = `${defaults.vibration}%`;
    document.getElementById("gravity").value = defaults.gravity;
    document.getElementById("gravity-value").textContent = (
      defaults.gravity / 10
    ).toFixed(1);
    document.getElementById("sensitivity").value = defaults.sensitivity;
    document.getElementById(
      "sensitivity-value"
    ).textContent = `${defaults.sensitivity}%`;
    vibrateButton();
  });
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
