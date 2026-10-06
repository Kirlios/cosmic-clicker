const STORAGE_KEY = "nova-forge-save-v1";

const generatorCatalog = [
  { id: "drone", name: "Pulse Drone", sprite: "drone", baseCost: 15, baseGain: 0.4 },
  { id: "forge", name: "Forge Array", sprite: "forge", baseCost: 80, baseGain: 2.2 },
  { id: "core", name: "Singularity Core", sprite: "core", baseCost: 360, baseGain: 10 },
  { id: "warp", name: "Warp Relay", sprite: "warp", baseCost: 1400, baseGain: 36 },
];

const upgradeCatalog = [
  { id: "laserLattice", name: "Laser Lattice", sprite: "lattice", cost: 50, description: "+2 tap power", type: "click" },
  { id: "fluxConduit", name: "Flux Conduit", sprite: "tool", cost: 120, description: "+25% production", type: "production" },
  { id: "quantumCrystal", name: "Quantum Crystal", sprite: "core", cost: 260, description: "+50% click multiplier", type: "click" },
  { id: "riftDriver", name: "Rift Driver", sprite: "warp", cost: 900, description: "+30% all output", type: "production" },
];

const skillCatalog = [
  { id: "ionTap", name: "Ion Tap", glyph: "✦", cost: 1, x: 25, y: 18, description: "+1 tap" },
  { id: "droneSync", name: "Drone Sync", glyph: "◈", cost: 1, x: 75, y: 18, description: "+8% output" },
  { id: "magnetPulse", name: "Magnet Pulse", glyph: "⬢", cost: 1, x: 18, y: 46, description: "+12% crit" },
  { id: "orbitalDrill", name: "Orbital Drill", glyph: "◉", cost: 1, x: 50, y: 34, description: "+2 tap power" },
  { id: "latticeFlow", name: "Lattice Flow", glyph: "△", cost: 2, x: 82, y: 46, description: "+15% production" },
  { id: "reactorBloom", name: "Reactor Bloom", glyph: "✧", cost: 2, x: 30, y: 68, description: "+20% output" },
  { id: "starKernel", name: "Star Kernel", glyph: "✹", cost: 2, x: 70, y: 68, description: "+25% tap" },
  { id: "novaVessel", name: "Nova Vessel", glyph: "✺", cost: 3, x: 50, y: 86, description: "+30% all output" },
];

const achievementCatalog = [
  { id: "firstSpark", name: "First Spark", text: "Earn 25 plasma", icon: "✦", threshold: 25, type: "total" },
  { id: "droneFleet", name: "Drone Fleet", text: "Own 12 generators", icon: "◈", threshold: 12, type: "count" },
  { id: "novaRise", name: "Nova Rise", text: "Reach 1 nova", icon: "✹", threshold: 1, type: "nova" },
  { id: "starBreath", name: "Star Breath", text: "Earn 5,000 plasma", icon: "✧", threshold: 5000, type: "total" },
  { id: "warpLords", name: "Warp Lords", text: "Reach 20 total output/sec", icon: "⬢", threshold: 20, type: "output" },
  { id: "galactic", name: "Galactic Forge", text: "Earn 250,000 plasma", icon: "✺", threshold: 250000, type: "total" },
];

function createDefaultState() {
  return {
    plasma: 0,
    totalPlasma: 0,
    stellar: 0,
    nova: 0,
    skillPoints: 0,
    skillProgress: 0,
    clickPower: 1,
    clickMultiplier: 1,
    productionMultiplier: 1,
    critChance: 0.12,
    lastTick: Date.now(),
    generators: generatorCatalog.map((g) => ({ ...g, owned: 0 })),
    upgrades: upgradeCatalog.map((u) => ({ ...u, purchased: false })),
    skills: skillCatalog.map((s) => ({ ...s, unlocked: false })),
    achievements: achievementCatalog.map((a) => ({ ...a, unlocked: false })),
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createDefaultState();

  try {
    const parsed = JSON.parse(raw);
    const fallback = createDefaultState();

    return {
      ...fallback,
      ...parsed,
      generators: fallback.generators.map((g) => {
        const saved = (parsed.generators || []).find((item) => item.id === g.id);
        return { ...g, ...(saved || {}) };
      }),
      upgrades: fallback.upgrades.map((u) => {
        const saved = (parsed.upgrades || []).find((item) => item.id === u.id);
        return { ...u, ...(saved || {}) };
      }),
      skills: fallback.skills.map((s) => {
        const saved = (parsed.skills || []).find((item) => item.id === s.id);
        return { ...s, ...(saved || {}) };
      }),
      achievements: fallback.achievements.map((a) => {
        const saved = (parsed.achievements || []).find((item) => item.id === a.id);
        return { ...a, ...(saved || {}) };
      }),
      lastTick: Date.now(),
    };
  } catch (error) {
    console.error("Failed to load save:", error);
    return createDefaultState();
  }
}

let state = loadState();

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save state:", error);
  }
}

function formatNumber(value) {
  if (value >= 1000000) return (value / 1000000).toFixed(2) + "M";
  if (value >= 1000) return (value / 1000).toFixed(2) + "K";
  return value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2);
}

function computePassiveIncome() {
  const generatorOutput = state.generators.reduce((sum, generator) => {
    return sum + generator.owned * generator.baseGain;
  }, 0);

  const activeBoost = (1 + state.nova * 0.12) * state.productionMultiplier;

  return generatorOutput * activeBoost;
}

function computeClickPower() {
  return state.clickPower * state.clickMultiplier * (1 + state.nova * 0.2);
}

function checkAchievements() {
  const generatorCount = state.generators.reduce((sum, g) => sum + g.owned, 0);

  state.achievements = state.achievements.map((achievement) => {
    let unlocked = achievement.unlocked;

    if (!unlocked) {
      if (achievement.type === "total" && state.totalPlasma >= achievement.threshold) unlocked = true;
      if (achievement.type === "count" && generatorCount >= achievement.threshold) unlocked = true;
      if (achievement.type === "nova" && state.nova >= achievement.threshold) unlocked = true;
      if (achievement.type === "output" && computePassiveIncome() >= achievement.threshold) unlocked = true;
    }

    return { ...achievement, unlocked };
  });
}

function grantSkillPointsForProgress() {
  while (state.totalPlasma >= state.skillProgress + 250) {
    state.skillProgress += 250;
    state.skillPoints += 1;
  }
}

function buyGenerator(generatorId) {
  const generator = state.generators.find((g) => g.id === generatorId);
  if (!generator) return;

  const cost = Math.floor(generator.baseCost * Math.pow(1.18, generator.owned));
  if (state.plasma < cost) return;

  state.plasma -= cost;
  generator.owned += 1;
  saveState();
  render();
}

function buyUpgrade(upgradeId) {
  const upgrade = state.upgrades.find((u) => u.id === upgradeId);
  if (!upgrade || upgrade.purchased) return;

  if (state.plasma < upgrade.cost) return;

  state.plasma -= upgrade.cost;
  upgrade.purchased = true;

  if (upgrade.type === "click") {
    if (upgrade.id === "laserLattice") state.clickPower += 2;
    if (upgrade.id === "quantumCrystal") state.clickMultiplier *= 1.5;
  }

  if (upgrade.type === "production") {
    if (upgrade.id === "fluxConduit") state.productionMultiplier *= 1.25;
    if (upgrade.id === "riftDriver") state.productionMultiplier *= 1.3;
  }

  saveState();
  render();
}

function unlockSkill(skillId) {
  const skill = state.skills.find((s) => s.id === skillId);
  if (!skill || skill.unlocked) return;
  if (state.skillPoints < skill.cost) return;

  state.skillPoints -= skill.cost;
  skill.unlocked = true;

  if (skill.id === "ionTap") state.clickPower += 1;
  if (skill.id === "droneSync") state.productionMultiplier *= 1.08;
  if (skill.id === "magnetPulse") state.critChance += 0.12;
  if (skill.id === "orbitalDrill") state.clickPower += 2;
  if (skill.id === "latticeFlow") state.productionMultiplier *= 1.15;
  if (skill.id === "reactorBloom") state.productionMultiplier *= 1.2;
  if (skill.id === "starKernel") state.clickMultiplier *= 1.25;
  if (skill.id === "novaVessel") state.productionMultiplier *= 1.3;

  saveState();
  render();
}

function handleClick() {
  const power = computeClickPower();
  const critRoll = Math.random() < state.critChance;
  const gain = critRoll ? power * 2.5 : power;

  state.plasma += gain;
  state.totalPlasma += gain;
  state.stellar += gain * 0.08;

  grantSkillPointsForProgress();
  checkAchievements();
  saveState();
  render();
}

function prestige() {
  const gain = Math.max(0, Math.floor(state.totalPlasma / 3200));
  if (gain <= 0) return;

  state.nova += gain;
  state.plasma = 0;
  state.totalPlasma = 0;
  state.stellar = 0;
  state.skillPoints = 0;
  state.skillProgress = 0;

  state.clickPower = 1 + state.nova * 0.22;
  state.clickMultiplier = 1;
  state.productionMultiplier = 1;
  state.critChance = 0.12;

  state.generators = generatorCatalog.map((g) => ({ ...g, owned: 0 }));
  state.upgrades = upgradeCatalog.map((u) => ({ ...u, purchased: false }));
  state.skills = skillCatalog.map((s) => ({ ...s, unlocked: false }));
  state.achievements = achievementCatalog.map((a) => ({ ...a, unlocked: false }));

  saveState();
  render();
}

function getGeneratorCost(generator) {
  return Math.floor(generator.baseCost * Math.pow(1.18, generator.owned));
}

function getSpriteGlyph(sprite) {
  const glyphs = {
    drone: "◈",
    forge: "⬢",
    core: "✦",
    warp: "✧",
    lattice: "△",
    tool: "◉",
  };
  return glyphs[sprite] || "✦";
}

function renderGenerators() {
  const list = document.getElementById("generatorsList");
  list.innerHTML = state.generators
    .map((generator) => {
      const currentCost = getGeneratorCost(generator);
      const ownedText = generator.owned === 0 ? "No units" : `${generator.owned} owned`;
      const canAfford = state.plasma >= currentCost;

      return `
        <div class="generator-item">
          <div class="sprite ${generator.sprite}">${getSpriteGlyph(generator.sprite)}</div>
          <div class="item-meta">
            <h3>${generator.name}</h3>
            <div class="item-sub">${ownedText} · +${formatNumber(generator.baseGain)}/s</div>
          </div>
          <button class="item-cta buy" data-generator-id="${generator.id}" ${!canAfford ? "disabled" : ""}>
            ${formatNumber(currentCost)}
          </button>
        </div>
      `;
    })
    .join("");
}

function renderUpgrades() {
  const list = document.getElementById("upgradesList");
  list.innerHTML = state.upgrades
    .map((upgrade) => {
      const isUnlocked = upgrade.purchased;
      const canAfford = state.plasma >= upgrade.cost;
      const buttonLabel = isUnlocked ? "Owned" : `${formatNumber(upgrade.cost)}`;

      return `
        <div class="upgrade-item">
          <div class="sprite ${upgrade.sprite}">${getSpriteGlyph(upgrade.sprite)}</div>
          <div class="item-meta">
            <h3>${upgrade.name}</h3>
            <div class="item-sub">${upgrade.description}</div>
          </div>
          <button class="item-cta ${isUnlocked ? "locked" : "buy"}" data-upgrade-id="${upgrade.id}" ${isUnlocked || !canAfford ? "disabled" : ""}>
            ${buttonLabel}
          </button>
        </div>
      `;
    })
    .join("");
}

function renderSkills() {
  const tree = document.getElementById("skillTree");
  const svg = document.getElementById("skillLines");
  const layout = skillCatalog.map((skill) => ({ ...skill }));
  const connectionLines = [
    ["ionTap", "droneSync"],
    ["ionTap", "orbitalDrill"],
    ["droneSync", "latticeFlow"],
    ["magnetPulse", "orbitalDrill"],
    ["orbitalDrill", "reactorBloom"],
    ["latticeFlow", "starKernel"],
    ["reactorBloom", "novaVessel"],
    ["starKernel", "novaVessel"],
  ];

  const lineMarkup = connectionLines
    .map(([from, to]) => {
      const fromSkill = layout.find((s) => s.id === from);
      const toSkill = layout.find((s) => s.id === to);

      const x1 = fromSkill.x;
      const y1 = fromSkill.y;
      const x2 = toSkill.x;
      const y2 = toSkill.y;

      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(143,175,255,0.42)" stroke-width="1.2" />`;
    })
    .join("");

  svg.innerHTML = lineMarkup;

  tree.innerHTML = state.skills
    .map((skill) => {
      const className = skill.unlocked ? "skill-node unlocked" : "skill-node locked";
      const left = skill.x;
      const top = skill.y;

      return `
        <button
          class="${className}"
          data-skill-id="${skill.id}"
          style="left:${left}%; top:${top}%"
          title="${skill.description}"
          aria-label="${skill.name}"
        >
          <span class="skill-glyph">${skill.glyph}</span>
          <span class="skill-name">${skill.name}</span>
        </button>
      `;
    })
    .join("");
}

function renderAchievements() {
  const list = document.getElementById("achievementList");
  list.innerHTML = state.achievements
    .map((achievement) => {
      const unlocked = achievement.unlocked ? "unlocked" : "";
      const icon = achievement.unlocked ? "✓" : achievement.icon;

      return `
        <div class="achievement ${unlocked}">
          <div class="achievement-icon">${icon}</div>
          <div>
            <h4>${achievement.name}</h4>
            <p>${achievement.text}</p>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderStats() {
  document.getElementById("plasmaDisplay").textContent = formatNumber(state.plasma);
  document.getElementById("novaDisplay").textContent = formatNumber(state.nova);
  document.getElementById("skillPointsDisplay").textContent = formatNumber(state.skillPoints);

  document.getElementById("clickPowerDisplay").textContent = formatNumber(computeClickPower());
  document.getElementById("critChanceDisplay").textContent = `${(state.critChance * 100).toFixed(0)}%`;
  document.getElementById("productionDisplay").textContent = formatNumber(computePassiveIncome());

  document.getElementById("plasmaCard").textContent = formatNumber(state.plasma);
  document.getElementById("stellarDisplay").textContent = formatNumber(state.stellar);

  const prestigeButton = document.getElementById("prestigeButton");
  const prestigeGain = Math.max(0, Math.floor(state.totalPlasma / 3200));
  prestigeButton.textContent = prestigeGain > 0 ? `Collapse (+${prestigeGain})` : "Collapse";
}

function render() {
  checkAchievements();
  renderStats();
  renderGenerators();
  renderUpgrades();
  renderSkills();
  renderAchievements();
}

document.addEventListener("click", (event) => {
  const generatorButton = event.target.closest("[data-generator-id]");
  if (generatorButton) {
    buyGenerator(generatorButton.dataset.generatorId);
    return;
  }

  const upgradeButton = event.target.closest("[data-upgrade-id]");
  if (upgradeButton) {
    buyUpgrade(upgradeButton.dataset.upgradeId);
    return;
  }

  const skillButton = event.target.closest("[data-skill-id]");
  if (skillButton) {
    unlockSkill(skillButton.dataset.skillId);
    return;
  }

  if (event.target.closest("#clickButton")) {
    handleClick();
  }

  if (event.target.closest("#prestigeButton")) {
    prestige();
  }
});

function gameLoop() {
  const now = Date.now();
  const dt = (now - state.lastTick) / 1000;
  state.lastTick = now;

  const income = computePassiveIncome() * dt;
  state.plasma += income;
  state.totalPlasma += income;
  state.stellar += income * 0.05;

  grantSkillPointsForProgress();
  checkAchievements();

  render();
  saveState();
}

setInterval(gameLoop, 100);

render();
saveState();