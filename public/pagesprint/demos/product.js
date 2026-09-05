(() => {
  "use strict";
  const preview = document.getElementById("color-preview");
  const name = document.getElementById("color-name");
  const buttons = document.querySelectorAll(".swatch");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!["blue", "clay", "cream"].includes(button.dataset.color)) return;
      preview.dataset.color = button.dataset.color;
      preview.setAttribute("aria-label", `Concept lamp in ${button.dataset.name}`);
      name.textContent = button.dataset.name;
      buttons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    });
  });
})();
