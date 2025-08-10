document.addEventListener("DOMContentLoaded", () => {
  const nav = document.getElementById("tool-nav");
  const panels = document.querySelectorAll(".tool-panel");

  nav.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") {
      const tool = e.target.getAttribute("data-tool");
      panels.forEach(panel => {
        panel.style.display = panel.id === `tool-${tool}` ? "block" : "none";
      });
    }
  });
});