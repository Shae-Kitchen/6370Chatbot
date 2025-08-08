document.addEventListener("DOMContentLoaded", () => {
  const unloadBtn = document.getElementById("unloader-submit");
  if (unloadBtn) unloadBtn.addEventListener("click", handleUnloader);
});

async function handleUnloader() {
  const input = document.getElementById("unloader-input").value.trim();
  const outputDiv = document.getElementById("unloader-output");
  outputDiv.innerHTML = "";

  if (!input) {
    outputDiv.textContent = "Please enter some thoughts first.";
    return;
  }

  outputDiv.textContent = "🔄 Unjumbling...";

  try {
    const response = await fetch("http://localhost:5500/api/unloader", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });

    const data = await response.json();
    outputDiv.textContent = "";

    if (data.error) {
      outputDiv.textContent = `⚠️ ${data.error}`;
    } else {
      const json = JSON.parse(data.result); // Expecting stringified JSON
      Object.entries(json).forEach(([category, items]) => {
        const section = document.createElement("div");
        section.innerHTML = `<h3>${category}</h3><ul>${items
          .map((item) => `<li>${item}</li>`)
          .join("")}</ul>`;
        outputDiv.appendChild(section);
      });
    }
  } catch (err) {
    outputDiv.textContent = "⚠️ Something went wrong.";
    console.error(err);
  }
}
