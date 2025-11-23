export function showEndings({ onPick }) {
  const root = document.getElementById("ending");
  if (!root) return;
  root.classList.remove("hidden");


  root.querySelectorAll("[data-id]").forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        const id = btn.getAttribute("data-id");
        root.classList.add("hidden");
        onPick?.(id);
      },
      { once: true }
    );
  });
}

export function renderEpilogue(id) {
  const root = document.getElementById("ending");
  if (!root) return;
  root.classList.remove("hidden");

  const resultText = {
    
    release:
      "Vous fuyez ensemble. Le monde sombre sous les ténèbres… Aelya et Lioran devront s'entraider afin de le sauver.",
  }[id];

  root.innerHTML = `
    <div class="card ending-card ending-final">
      <div class="ending-title">Le jeu est terminé</div>
      <p class="ending-message">${resultText ?? "Merci d'avoir parcouru le Labyrinthe."}</p>
      <p class="ending-note">Merci d'avoir joué.</p>
      <div class="choices">
        <button data-retry>Retour à l'accueil</button>
      </div>
    </div>
  `;

  root
    .querySelector("[data-retry]")
    ?.addEventListener("click", () => location.reload(), { once: true });
}
