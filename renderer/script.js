const library = document.getElementById("library");
const slider = document.getElementById("min-hours");
const hoursLabel = document.getElementById("hours-label");
const filterToggle = document.getElementById("filter-toggle");
const filterPanel = document.getElementById("filter-panel");
const lastPlayedSelect = document.getElementById("last-played");
const reviewCheckboxes = document.querySelectorAll("#review-filters input");
const categoryInput = document.getElementById("category-input");
const createButton = document.getElementById("create-button");
let categories = {};
let activeCategory = null;

function saveCategories() {
  localStorage.setItem("vault-categories", JSON.stringify(categories));
}

function loadCategories() {
  const saved = localStorage.getItem("vault-categories");
  if (saved !== null) categories = JSON.parse(saved);
}

function createCategoryUI(name) {
  const categoryList = document.getElementById("category-list");
  const section = document.createElement("div");
  section.innerHTML = `
          <div class="category-header">
            <button class="toggle-btn">+</button>
            <span class="category-name-span">${name}</span>
            <button class="delete-btn">✕</button>
          </div>
          <div class="category-games"></div>
        `;
  categoryList.appendChild(section);

  const toggleBtn = section.querySelector(".toggle-btn");
  const gamesList = section.querySelector(".category-games");
  gamesList.style.display = "none";

  toggleBtn.addEventListener("click", function () {
    if (gamesList.style.display === "none") {
      gamesList.style.display = "block";
      toggleBtn.textContent = "-";
    } else {
      gamesList.style.display = "none";
      toggleBtn.textContent = "+";
    }
  });

  const categoryName = section.querySelector(".category-name-span");
  categoryName.addEventListener("click", function () {
    activeCategory = name;
    applyFilters();
    document
      .querySelectorAll(".category-name-span")
      .forEach((s) => (s.style.color = ""));
    categoryName.style.color = "var(--ember-bright)";
  });
  categoryName.addEventListener("dblclick", function () {
    activeCategory = null;
    applyFilters();
    document
      .querySelectorAll(".category-name-span")
      .forEach((s) => (s.style.color = ""));
  });
  const deleteBtn = section.querySelector(".delete-btn");
  deleteBtn.addEventListener("click", function () {
    delete categories[name];
    saveCategories();
    section.remove();
    if (activeCategory === name) {
      activeCategory = null;
      applyFilters();
    }
  });

  section.addEventListener("dragover", function (e) {
    e.preventDefault();
    section.classList.add("drag-over");
  });
  section.addEventListener("dragleave", function () {
    section.classList.remove("drag-over");
  });
  section.addEventListener("drop", function (e) {
    e.preventDefault();
    section.classList.remove("drag-over");
    const appid = e.dataTransfer.getData("text/plain");
    if (!categories[name].includes(appid)) {
      categories[name].push(appid);
      saveCategories();
      const card = document.querySelector(`[data-appid="${appid}"]`);
      const gameName = card ? card.querySelector("p").textContent : appid;
      const entry = document.createElement("div");
      entry.innerHTML = `
              <img src="https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg" width="28">
              <span>${gameName}</span>
            `;
      gamesList.appendChild(entry);
    }
  });

  if (categories[name] && categories[name].length > 0) {
    categories[name].forEach(function (appid) {
      const entry = document.createElement("div");
      entry.innerHTML = `
              <img src="https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg" width="28">
              <span>${appid}</span>
            `;
      gamesList.appendChild(entry);
    });
  }
}

createButton.addEventListener("click", function () {
  const name = categoryInput.value.trim();
  if (name === "") return;
  categories[name] = [];
  saveCategories();
  createCategoryUI(name);
  categoryInput.value = "";
});

filterToggle.addEventListener("click", function () {
  filterPanel.style.display =
    filterPanel.style.display === "none" ? "block" : "none";
});

function applyFilters() {
  const minHours = Number(slider.value);
  const days = Number(lastPlayedSelect.value);
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - days * 24 * 60 * 60;
  const checkedScores = Array.from(reviewCheckboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);
  const cards = document.querySelectorAll(".game-card");
  cards.forEach(function (card) {
    const hoursOk = Number(card.dataset.hours) >= minHours;
    const lastPlayedOk =
      days === 0 || Number(card.dataset.lastPlayed) >= cutoff;
    const reviewOk =
      !card.dataset.reviewScore ||
      checkedScores.includes(card.dataset.reviewScore);
    const categoryOk =
      activeCategory === null ||
      categories[activeCategory].includes(card.dataset.appid);
    card.style.display =
      hoursOk && lastPlayedOk && reviewOk && categoryOk ? "" : "none";
  });
}

slider.addEventListener("input", function () {
  hoursLabel.textContent = slider.value;
  applyFilters();
});
lastPlayedSelect.addEventListener("change", applyFilters);
reviewCheckboxes.forEach((cb) => cb.addEventListener("change", applyFilters));

loadCategories();
Object.keys(categories).forEach((name) => createCategoryUI(name));

async function loadLibrary() {
  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}&include_appinfo=true&include_played_free_games=true&format=json`;
  const response = await fetch(url);
  const data = await response.json();
  const games = data.response.games;

  slider.max = Math.max(
    ...games.map((g) => Math.round(g.playtime_forever / 60)),
  );
  games.sort(function (a, b) {
    if (a.rtime_last_played === 0) return 1;
    if (b.rtime_last_played === 0) return -1;
    return b.rtime_last_played - a.rtime_last_played;
  });

  games.forEach(function (game) {
    const card = document.createElement("div");
    card.dataset.appid = game.appid;
    card.className = "game-card";
    card.draggable = true;
    card.addEventListener("dragstart", (e) =>
      e.dataTransfer.setData("text/plain", game.appid),
    );
    card.dataset.hours = Math.round(game.playtime_forever / 60);
    card.dataset.lastPlayed = game.rtime_last_played;
    if (game.rtime_last_played === 0 || game.playtime_forever === 0)
      card.style.opacity = "0.35";
    card.innerHTML = `
            <img src="https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg">
            <p>${game.name}</p>
            <p>${Math.round(game.playtime_forever / 60)} hrs</p>
          `;
    library.appendChild(card);
    document.querySelectorAll(`.category-games span`).forEach(function (span) {
      if (span.textContent == game.appid) span.textContent = game.name;
    });

    card.addEventListener("click", async function () {
      const panel = document.getElementById("detail-panel");
      panel.style.display = "";
      panel.innerHTML = `<p>Retrieving from the archive...</p>`;
      const res = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${game.appid}&l=english`,
      );
      const d = await res.json();
      const details = d[game.appid].data;
      panel.innerHTML = `
              <h1>${game.name}</h1>
              <p>${Math.round(game.playtime_forever / 60)} hrs at the bonfire</p>
              <p>Last kindled: ${new Date(game.rtime_last_played * 1000).toLocaleDateString()}</p>
              <p>${card.dataset.reviewScore || "Unrated"}</p>
              <div class="ember-divider">— ✦ —</div>
              <p>${details?.short_description || "No lore recorded."}</p>
            `;
    });
  });

  const reviews = await Promise.all(
    games.map((game) =>
      fetch(
        `https://store.steampowered.com/appreviews/${game.appid}?json=1&language=english`,
      )
        .then((r) => r.json())
        .then((d) => ({
          appid: game.appid,
          score: d.query_summary?.review_score_desc || "No reviews",
        })),
    ),
  );
  reviews.forEach(function (review) {
    const card = document.querySelector(`[data-appid="${review.appid}"]`);
    if (card) card.dataset.reviewScore = review.score;
  });
}

loadLibrary();
