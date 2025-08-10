document.addEventListener("DOMContentLoaded", () => {
  const nav = document.getElementById("tool-nav");
  if (!nav) return;

  nav.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") {
      const tool = e.target.getAttribute("data-tool");
      // Map tool names to HTML files
      const pageMap = {
        chat: "index.html",
        decoder: "unloader.html",
        planner: "planner.html",
        checklist: "calculator.html",
      };
      if (pageMap[tool]) {
        window.location.href = pageMap[tool];
      }
    }
  });
});
