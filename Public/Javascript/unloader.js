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

  outputDiv.textContent = "Thank You for your patience...";

  try {
    const response = await fetch("http://localhost:5500/api/unloader", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });

    const data = await response.json();

    let json;
    if (typeof data.result === "string") {
      try {
        json = JSON.parse(data.result);
      } catch (err) {
        json = { raw: data.result };
      }
    } else {
      json = data.result;
    }

    outputDiv.innerHTML = "";
    // Display categories
    ["do_now", "can_wait", "delegate", "drop_entirely"].forEach((category) => {
      if (json[category] && json[category].length) {
        const section = document.createElement("div");
        section.innerHTML = `<h3>${category.replace(/_/g, " ")}</h3><ul>${json[
          category
        ]
          .map(
            (item) =>
              `<li>${
                typeof item === "string" ? item : JSON.stringify(item)
              }</li>`
          )
          .join("")}</ul>`;
        outputDiv.appendChild(section);
      }
    });

    if (json.raw) {
      outputDiv.innerHTML += `<pre>${json.raw}</pre>`;
    }
  } catch (err) {
    outputDiv.textContent = "⚠️ Something went wrong.";
    console.error(err);
  }
}
