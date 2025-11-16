export function showEndings({ onPick }) {
  const root = document.getElementById("ending");
  if (!root) return;
  root.classList.remove("hidden");

  root.innerHTML = `
    <div class="card">
      <h2>Acte IV — Le Jugement</h2>
      <p>Le cœur du Labyrinthe gronde. Trois chemins se dessinent…</p>
      <div class="choices">
        <button data-id="sacrifice">Sauver Aëlya, sacrifier ton esprit</button>
        <button data-id="guardian">Tuer Kael, prendre son lien</button>
        <button data-id="release">Libérer les deux — risquer l’extérieur</button>
      </div>
    </div>
  `;

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

  const text = {
    sacrifice: `Tu brises la sphère. Aëlya retombe, libre — toi, tu restes. 
    Le Labyrinthe te salue d’un murmure : “Gardien d’un souvenir qui ne sortira jamais.”`,
    guardian: `La lame traverse Kael. Le lien d’âme t’inonde. Les murs s’inclinent : “Bienvenue, immortel.” 
    Aëlya s’éteint en souriant — ou était-ce une illusion ?`,
    release: `Vous fuyez ensemble. Le monde, dehors, s’effrite sous la lumière divine. 
    Pendant un instant, vous êtes enfin dehors — puis il n’y a plus de dehors.`,
  }[id];

  root.innerHTML = `
    <div class="card">
      <h2>Fin — “ On ne sort jamais vraiment d’un labyrinthe. ”</h2>
      <p>${text ?? ""}</p>
      <div class="choices"><button data-retry>Recommencer</button></div>
    </div>
  `;

  root.querySelector("[data-retry]")?.addEventListener(
    "click",
    () => location.reload(),
    { once: true }
  );
}
