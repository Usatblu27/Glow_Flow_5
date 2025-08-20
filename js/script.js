"use strict";
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
const isStandalone =
  window.navigator.standalone ||
  window.matchMedia("(display-mode: standalone)").matches;
window.addEventListener("load", () => {
  const title = document.getElementById("title");
  "GLOW FLOW".split("").forEach((letter, i) => {
    const span = document.createElement("span");
    span.textContent = letter === " " ? "" : letter;
    span.style.animationDelay = `${i * 0.1}s`;
    title.appendChild(span);
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((err) => console.error("SW error", err));
  }
  if (isMobile && !isStandalone) {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
  }
});
