(() => {
  const canvas = document.querySelector("#game-canvas");
  const context = canvas.getContext("2d");
  const roomStatus = document.querySelector("#room-status");
  const enemyStatus = document.querySelector("#enemy-status");
  const doorOptions = document.querySelector("#door-options");
  const runLevelLabel = document.querySelector("#run-level-label");
  const expLabel = document.querySelector("#exp-label");
  const expFill = document.querySelector("#exp-fill");
  const hpLabel = document.querySelector("#hp-label");
  const hpFill = document.querySelector("#hp-fill");
  const secondWindStatus = document.querySelector("#second-wind-status");
  const currencyLabel = document.querySelector("#currency-label");
  const levelUpPanel = document.querySelector("#level-up-panel");
  const upgradeChoices = document.querySelector("#upgrade-choices");
  const levelUpTitle = document.querySelector("#level-up-title");
  const runEndScreen = document.querySelector("#run-end-screen");
  const runEndTitle = document.querySelector("#run-end-title");
  const runEndStats = document.querySelector("#run-end-stats");
  const continueRunButton = document.querySelector("#continue-run");
  const mainMenu = document.querySelector("#main-menu");
  const menuLevelLabel = document.querySelector("#meta-level-label");
  const menuExpLabel = document.querySelector("#meta-exp-label");
  const menuExpFill = document.querySelector("#meta-exp-fill");
  const permanentUpgradeList = document.querySelector("#permanent-upgrade-list");
  const bestRunSummary = document.querySelector("#best-run-summary");
  const playButton = document.querySelector("#play-button");

  const GameState = Object.freeze({
    MAIN_MENU: "MAIN_MENU",
    PLAYING: "PLAYING",
    GAME_OVER: "GAME_OVER",
    FLOOR_CLEAR: "FLOOR_CLEAR",
  });

  const game = {
    state: GameState.MAIN_MENU,
    frameCount: 0,
    elapsedSeconds: 0,
    player: new window.Player(),
    rooms: new window.RoomSystem(),
    miniMap: new window.MiniMap(),
    enemies: new window.EnemySystem(),
    weapons: new window.WeaponSystem(),
    expCrystals: new window.ExpCrystalSystem(),
    progression: new window.RunProgression(),
    upgrades: new window.UpgradeSystem(),
    currency: new window.RunCurrency(),
    shop: new window.ShopSystem(),
    upgradeChoiceContext: "level-up",
    metaProgression: new window.MetaProgression(),
    metaRewardResult: null,
    secondWind: {
      permanentAvailable: false,
      passiveUsed: false,
    },
    damageNumbers: [],
    particles: [],
    screenShake: 0,
    audioContext: null,
    lastHitSoundAt: 0,
    hitStopFrames: 0,
    contactDamageCooldown: 0,
    levelUpPaused: false,
    ended: false,
    runStats: {
      roomsCleared: 0,
      enemiesDefeated: 0,
      elitesDefeated: 0,
      floorReached: 1,
      bossDefeated: false,
      bossDamageDealt: 0,
      experienceCollected: 0,
      metaExperienceEarned: 0,
    },
  };

  let previousFrameTime = 0;
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;

  function playFeedbackSound(kind) {
    const now = performance.now();
    if (kind === "hit" && now - game.lastHitSoundAt < 90) return;
    game.lastHitSoundAt = now;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      game.audioContext ||= new AudioContextClass();
      const audio = game.audioContext;
      if (audio.state === "suspended") audio.resume();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const startAt = audio.currentTime;
      oscillator.type = kind === "death" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(kind === "death" ? 620 : 250, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(kind === "death" ? 180 : 110, startAt + 0.09);
      gain.gain.setValueAtTime(0.035, startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.1);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.11);
    } catch (error) {
      // Sound is optional on browsers that block or omit Web Audio.
    }
  }

  function spawnDeathBurst(x, y) {
    const colors = ["#ffcf70", "#ff806e", "#fff0b3"];
    for (let index = 0; index < 12; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * 125;
      const life = 0.25 + Math.random() * 0.22;
      game.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        radius: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  function updateParticles(deltaSeconds) {
    game.particles.forEach((particle) => {
      particle.x += particle.vx * deltaSeconds;
      particle.y += particle.vy * deltaSeconds;
      particle.vx *= Math.max(0, 1 - 2.8 * deltaSeconds);
      particle.vy *= Math.max(0, 1 - 2.8 * deltaSeconds);
      particle.life -= deltaSeconds;
    });
    game.particles = game.particles.filter((particle) => particle.life > 0);
    game.screenShake = Math.max(0, game.screenShake - 30 * deltaSeconds);
  }

  function drawParticles() {
    game.particles.forEach((particle) => {
      context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fill();
    });
    context.globalAlpha = 1;
  }

  function renderRunHud() {
    const progression = game.progression;
    const percentage = Math.min(100, (progression.experience / progression.experienceToNextLevel) * 100);
    const hpPercentage = Math.max(0, Math.min(100, (game.player.stats.hp / game.player.stats.maxHp) * 100));
    hpLabel.textContent = `${Math.ceil(game.player.stats.hp)}/${Math.ceil(game.player.stats.maxHp)}`;
    hpFill.style.width = `${hpPercentage}%`;
    const permanentSecondWindUnlocked = game.metaProgression.data.permanentUpgrades.includes("secondWind");
    const passiveSecondWindOwned = game.upgrades.getPassiveLevel("secondWind") > 0;
    const windStatus = [];
    if (permanentSecondWindUnlocked) {
      windStatus.push(`Permanent ${game.secondWind.permanentAvailable ? "READY" : "USED"}`);
    }
    if (passiveSecondWindOwned) {
      windStatus.push(`Passive ${game.secondWind.passiveUsed ? "USED" : "READY"}`);
    }
    secondWindStatus.hidden = windStatus.length === 0;
    secondWindStatus.textContent = windStatus.length > 0
      ? `SECOND WIND · ${windStatus.join(" + ")}`
      : "";
    currencyLabel.textContent = game.currency.amount;
    runLevelLabel.textContent = `RUN LEVEL ${progression.level}`;
    expLabel.textContent = `EXP ${Math.floor(progression.experience)}/${progression.experienceToNextLevel}`;
    expFill.style.width = `${percentage}%`;
  }

  function renderEvolutionStatus() {
    const element = document.querySelector("#evolution-status");
    const bladeLevel = game.weapons.getWeaponLevel("spinningBlade");
    const thornLevel = game.weapons.getWeaponLevel("thornAura");
    const orbLevel = game.weapons.getWeaponLevel("homingOrb");
    const magnetLevel = game.upgrades.getPassiveLevel("magnetCore");
    const hasProgress = bladeLevel > 0 || thornLevel > 0 || orbLevel > 0 || magnetLevel > 0;
    element.hidden = !hasProgress;
    if (!hasProgress) return;

    const [bladeStatus, pullStatus] = game.weapons.getEvolutionStatus();
    const labels = [
      `${bladeStatus} · Blade ${bladeLevel}/5 + Thorn ${thornLevel}/5`,
      `${pullStatus} · Orb ${orbLevel}/5 + Magnet ${magnetLevel}/5`,
    ];
    const nextStatus = labels.join("|");
    if (element.dataset.status === nextStatus) return;
    element.dataset.status = nextStatus;
    element.replaceChildren();
    labels.forEach((label) => {
      const line = document.createElement("span");
      line.textContent = label;
      element.append(line);
    });
  }

  function renderMainMenu() {
    const meta = game.metaProgression.data;
    const required = game.metaProgression.getExperienceToNextLevel();
    menuLevelLabel.textContent = `PLAYER LEVEL ${String(meta.level).padStart(2, "0")}`;
    menuExpLabel.textContent = meta.level >= 20
      ? `META EXP ${meta.experience} · MAX LEVEL`
      : `META EXP ${meta.experience} / ${required}`;
    menuExpFill.style.width = required > 0
      ? `${Math.min(100, (meta.experience / required) * 100)}%`
      : "100%";

    const unlocked = new Set(meta.permanentUpgrades);
    permanentUpgradeList.replaceChildren();
    window.MetaProgression.getRewards().forEach((reward) => {
      const item = document.createElement("li");
      const isUnlocked = unlocked.has(reward.key);
      item.className = isUnlocked ? "unlocked-reward" : "locked-reward";
      item.textContent = `${isUnlocked ? "✓" : `Lv.${reward.level}`} ${reward.label}`;
      permanentUpgradeList.append(item);
    });

    bestRunSummary.textContent = meta.bestRunStats
      ? `BEST RUN · Floor ${meta.bestRunStats.floorReached}, ${meta.bestRunStats.roomsCleared} rooms cleared`
      : "BEST RUN · No completed runs yet";
  }

  function beginRun() {
    game.player.clearKeys();
    const permanentStats = game.metaProgression.getPermanentStats();
    game.player.stats = {
      hp: 100,
      maxHp: 100,
      moveSpeed: 220,
      damage: 1,
      attackSpeed: 1,
      projectileCount: 1,
      pickupRange: 80,
      expGain: 1,
      ...permanentStats,
      hp: permanentStats.maxHp,
    };
    game.player.x = viewportWidth / 2;
    game.player.y = viewportHeight / 2;
    game.rooms = new window.RoomSystem();
    game.miniMap = new window.MiniMap();
    game.enemies = new window.EnemySystem();
    game.weapons = new window.WeaponSystem(game.metaProgression.data.unlockedWeapons);
    game.expCrystals = new window.ExpCrystalSystem();
    game.progression = new window.RunProgression();
    game.upgrades = new window.UpgradeSystem();
    game.currency = new window.RunCurrency();
    game.shop = new window.ShopSystem();
    game.upgradeChoiceContext = "level-up";
    game.damageNumbers = [];
    game.particles = [];
    game.screenShake = 0;
    game.hitStopFrames = 0;
    game.contactDamageCooldown = 0;
    game.levelUpPaused = false;
    game.ended = false;
    game.metaRewardResult = null;
    game.secondWind = {
      permanentAvailable: game.metaProgression.data.permanentUpgrades.includes("secondWind"),
      passiveUsed: false,
    };
    game.runStats = {
      roomsCleared: 0,
      enemiesDefeated: 0,
      elitesDefeated: 0,
      floorReached: 1,
      bossDefeated: false,
      bossDamageDealt: 0,
      experienceCollected: 0,
      metaExperienceEarned: 0,
    };
    game.state = GameState.PLAYING;
    mainMenu.hidden = true;
    runEndScreen.hidden = true;
    levelUpPanel.hidden = true;
    document.querySelector("#game").classList.remove("menu-active");
    renderRunHud();
    renderEvolutionStatus();
    renderRoomUI();
  }

  function renderRoomUI() {
    const currentRoom = game.rooms.getCurrentRoom();
    const roomTitle = `${currentRoom.icon} ${currentRoom.label} — Room ${currentRoom.depth}/${game.rooms.routeLength}`;
    const roomResult = currentRoom.restResult || currentRoom.treasureResult;
    roomStatus.textContent = currentRoom.type === "REST" && !currentRoom.restChoiceMade
      ? `${roomTitle} · Choose one benefit`
      : roomResult
        ? `${roomTitle} · ${roomResult}`
        : roomTitle;
    doorOptions.replaceChildren();

    const locked = game.rooms.isCurrentRoomLocked();
    enemyStatus.hidden = !locked;
    enemyStatus.textContent = locked
      ? `🔒 ${game.enemies.getLivingCount()} enemies remaining — defeat them to unlock doors`
      : "";

    if (currentRoom.type === "REST" && !currentRoom.restChoiceMade) {
      const recoverButton = document.createElement("button");
      recoverButton.type = "button";
      recoverButton.className = "rest-choice-button";
      recoverButton.textContent = "♥ Recover · Restore 30% Max HP";
      recoverButton.addEventListener("click", () => {
        const restored = Math.round(game.player.stats.maxHp * 0.3);
        game.player.stats.hp = Math.min(
          game.player.stats.maxHp,
          game.player.stats.hp + restored,
        );
        currentRoom.restResult = `Recovered ${restored} HP`;
        currentRoom.restChoiceMade = true;
        renderRunHud();
        renderRoomUI();
      });

      const buffButton = document.createElement("button");
      buffButton.type = "button";
      buffButton.className = "rest-choice-button";
      buffButton.textContent = "⚔ Take a stand · +10% Damage this Run";
      buffButton.addEventListener("click", () => {
        game.player.stats.damage *= 1.1;
        currentRoom.restResult = "Damage increased by 10% this Run";
        currentRoom.restChoiceMade = true;
        renderRoomUI();
      });

      doorOptions.append(recoverButton, buffButton);
      return;
    }

    if (currentRoom.type === "TREASURE" && !currentRoom.treasureChoiceMade) {
      const chestButton = document.createElement("button");
      chestButton.type = "button";
      chestButton.className = "rest-choice-button treasure-choice-button";
      chestButton.textContent = currentRoom.treasureOpened
        ? "📦 Chest opened · Choose a reward"
        : "📦 Open Treasure Chest";
      chestButton.disabled = currentRoom.treasureOpened;
      chestButton.addEventListener("click", () => openTreasureChest(currentRoom));
      doorOptions.append(chestButton);
      return;
    }

    if (currentRoom.type === "SHOP") {
      if (!currentRoom.shopOffers) {
        currentRoom.shopOffers = game.shop.createOffers(game.upgrades, game.weapons);
      }
      if (currentRoom.shopOffers.length === 0) {
        const soldOut = document.createElement("div");
        soldOut.className = "shop-empty-message";
        soldOut.textContent = "No upgrades available · Leave through a door";
        doorOptions.append(soldOut);
      }
      currentRoom.shopOffers.forEach((offer) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "shop-offer-button";
        button.disabled = offer.purchased || game.currency.amount < offer.price;
        button.textContent = offer.purchased
          ? `✓ ${offer.choice.title} · SOLD`
          : `${offer.choice.icon} ${offer.choice.title} · ${offer.price} coins`;
        button.addEventListener("click", () => {
          if (offer.purchased || !game.currency.spend(offer.price)) return;
          if (!game.upgrades.apply(offer.choice, game.weapons, game.player)) {
            game.currency.amount += offer.price;
            return;
          }
          offer.purchased = true;
          renderRunHud();
          renderEvolutionStatus();
          renderRoomUI();
        });
        doorOptions.append(button);
      });
    }

    const exits = game.rooms.getDoorChoices();
    if (exits.length === 0) {
      const endMessage = document.createElement("div");
      endMessage.textContent = "Floor end";
      doorOptions.append(endMessage);
      return;
    }

    exits.forEach((room) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "door-button";
      button.disabled = locked;
      button.textContent = `${locked ? "🔒 " : ""}${room.icon} ${room.label}  ·  Room ${room.depth}/${game.rooms.routeLength}`;
      button.addEventListener("click", () => {
        markCurrentRoomCleared();
        if (!game.rooms.enterRoom(room.id)) return;
        game.player.x = viewportWidth / 2;
        game.player.y = viewportHeight / 2;
        game.player.clearKeys();
        game.contactDamageCooldown = 0;
        game.weapons.resetForRoom();
        game.expCrystals.clear();
        game.currency.clearRoomDrops();
        const enteredRoom = game.rooms.getCurrentRoom();
        game.enemies.spawnForRoom(
          enteredRoom,
          game.rooms.routeLength,
          viewportWidth,
          viewportHeight,
          game.player,
        );
        renderRoomUI();
      });
      doorOptions.append(button);
    });
  }

  function renderUpgradeChoices(choices) {
    upgradeChoices.replaceChildren();
    choices.forEach((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "upgrade-card";

      const title = document.createElement("span");
      title.className = "upgrade-card-title";
      title.textContent = `${choice.icon} ${choice.title}`;
      const subtitle = document.createElement("span");
      subtitle.className = "upgrade-card-subtitle";
      subtitle.textContent = choice.subtitle;
      const description = document.createElement("span");
      description.className = "upgrade-card-description";
      description.textContent = choice.description;

      button.append(title, subtitle, description);
      button.addEventListener("click", () => {
        if (!game.upgrades.apply(choice, game.weapons, game.player)) return;
        if (choice.kind === "passive" && choice.id === "secondWind") {
          game.secondWind.passiveUsed = false;
        }
        game.player.clearKeys();
        levelUpPanel.hidden = true;
        game.levelUpPaused = false;
        if (game.upgradeChoiceContext === "treasure") {
          game.upgradeChoiceContext = "level-up";
          const room = game.rooms.getCurrentRoom();
          room.treasureChoiceMade = true;
          room.treasureResult = `${choice.title} claimed`;
          renderRunHud();
          renderEvolutionStatus();
          renderRoomUI();
          return;
        }
        renderRunHud();
        renderEvolutionStatus();
        openLevelUpIfReady();
      });
      upgradeChoices.append(button);
    });
  }

  function openTreasureChest(room) {
    if (room.treasureOpened || room.treasureChoiceMade) return;
    room.treasureOpened = true;
    const choices = game.upgrades.getChoices(game.weapons);
    if (choices.length === 0) {
      room.treasureChoiceMade = true;
      room.treasureResult = "Build complete · no upgrades available";
      renderRoomUI();
      return;
    }

    game.upgradeChoiceContext = "treasure";
    game.levelUpPaused = true;
    game.player.clearKeys();
    levelUpTitle.textContent = "TREASURE CHEST · CHOOSE A REWARD";
    renderUpgradeChoices(choices);
    levelUpPanel.hidden = false;
  }

  function openLevelUpIfReady(guaranteed = false) {
    if (game.levelUpPaused || game.ended) return;
    if (!guaranteed && game.progression.experience < game.progression.experienceToNextLevel) return;
    const choices = game.upgrades.getChoices(game.weapons);
    if (choices.length === 0) return;
    const levelGranted = guaranteed
      ? game.progression.grantLevelUp()
      : game.progression.consumeLevelUp();
    if (!levelGranted) return;

    game.levelUpPaused = true;
    game.player.clearKeys();
    levelUpTitle.textContent = guaranteed
      ? `ELITE REWARD · LEVEL UP ${game.progression.level}`
      : `LEVEL UP · ${game.progression.level}`;
    renderUpgradeChoices(choices);
    levelUpPanel.hidden = false;
    renderRunHud();
  }

  function resizeCanvas() {
    const pixelRatio = window.devicePixelRatio || 1;
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    const width = Math.floor(viewportWidth * pixelRatio);
    const height = Math.floor(viewportHeight * pixelRatio);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    game.player.clampToViewport(viewportWidth, viewportHeight);
  }

  function addDamageNumber(text, x, y, color) {
    game.damageNumbers.push(new window.DamageNumber(text, x, y, color));
  }

  function applyEnemyDamage(enemy, damage) {
    const fullDamage = damage * game.player.stats.damage;
    const wasDead = enemy.isDead;
    let dealt = enemy.takeDamage(fullDamage);
    if (dealt <= 0) return;
    const mirrorLevel = game.upgrades.getPassiveLevel("mirrorShard");
    if (!enemy.isDead && mirrorLevel > 0 && Math.random() < mirrorLevel * 0.1) {
      dealt += enemy.takeDamage(fullDamage);
      addDamageNumber("Mirror!", enemy.x, enemy.y - enemy.radius - 18, "#b9d8ff");
    }
    if (enemy.isBoss) game.runStats.bossDamageDealt += dealt;
    addDamageNumber(dealt, enemy.x, enemy.y - enemy.radius - 7, "#fff0b3");
    game.hitStopFrames = Math.max(game.hitStopFrames, 2);
    if (!wasDead && enemy.isDead) {
      spawnDeathBurst(enemy.x, enemy.y);
      playFeedbackSound("death");
    } else {
      playFeedbackSound("hit");
    }
  }

  function markCurrentRoomCleared() {
    const room = game.rooms.getCurrentRoom();
    if (room.cleared || game.rooms.isCurrentRoomLocked()) return;
    room.cleared = true;
    game.runStats.roomsCleared += 1;
  }

  function finishRun(outcome) {
    if (game.ended) return;
    game.ended = true;
    game.levelUpPaused = false;
    game.state = outcome;
    levelUpPanel.hidden = true;

    const stats = game.runStats;
    const bossBonus = stats.bossDefeated
      ? 20
      : Math.floor(stats.bossDamageDealt / 10);
    stats.metaExperienceEarned = 3 * stats.roomsCleared
      + 5 * stats.elitesDefeated
      + Math.floor(stats.experienceCollected / 5)
      + 10 * stats.floorReached
      + bossBonus;

    game.metaProgression.recordRun(stats);
    game.metaRewardResult = game.metaProgression.addExperience(stats.metaExperienceEarned);
    renderMainMenu();

    runEndTitle.textContent = outcome === GameState.FLOOR_CLEAR ? "FLOOR CLEAR" : "GAME OVER";
    runEndStats.replaceChildren();
    const rows = [
      ["Rooms Cleared", stats.roomsCleared],
      ["Enemies Defeated", stats.enemiesDefeated],
      ["Elites Defeated", stats.elitesDefeated],
      ["Floor Reached", stats.floorReached],
      ["Boss Defeated", stats.bossDefeated ? "Yes" : "No"],
      ["Boss Damage", Math.floor(stats.bossDamageDealt)],
      ["Meta EXP Earned", stats.metaExperienceEarned],
      ["Meta Level", game.metaRewardResult.level],
    ];
    game.metaRewardResult.unlocked.forEach((reward) => rows.push(["Reward Unlocked", reward.label]));
    rows.forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "run-stat";
      const labelElement = document.createElement("span");
      labelElement.textContent = label;
      const valueElement = document.createElement("strong");
      valueElement.textContent = value;
      row.append(labelElement, valueElement);
      runEndStats.append(row);
    });
    runEndScreen.hidden = false;
  }

  function applyContactDamage() {
    if (game.contactDamageCooldown > 0) return;
    const player = game.player;
    const touchingEnemy = game.enemies.getTargets().find((enemy) => {
      if (enemy.isDead) return false;
      return Math.hypot(enemy.x - player.x, enemy.y - player.y) <= enemy.radius + player.radius;
    });
    if (!touchingEnemy) return;

    damagePlayer(touchingEnemy.contactDamage, "Contact");
  }

  function damagePlayer(damage, source) {
    if (game.ended) return;
    const dealt = game.player.takeDamage(damage);
    game.contactDamageCooldown = 0.8;
    if (dealt > 0) {
      addDamageNumber(`-${dealt}`, game.player.x, game.player.y - game.player.radius - 8, "#ff8178");
      game.hitStopFrames = Math.max(game.hitStopFrames, 2);
      game.screenShake = Math.max(game.screenShake, 5);
      playFeedbackSound("hit");
      renderRunHud();
    }
    if (game.player.stats.hp <= 0) {
      if (game.secondWind.permanentAvailable) {
        game.secondWind.permanentAvailable = false;
        reviveWithSecondWind("Permanent Second Wind");
      } else if (game.upgrades.getPassiveLevel("secondWind") > 0 && !game.secondWind.passiveUsed) {
        game.secondWind.passiveUsed = true;
        reviveWithSecondWind("Second Wind");
      } else {
        finishRun(GameState.GAME_OVER);
      }
    }
  }

  function reviveWithSecondWind(label) {
    game.player.stats.hp = Math.ceil(game.player.stats.maxHp * 0.5);
    game.contactDamageCooldown = 1;
    addDamageNumber(label, game.player.x, game.player.y - game.player.radius - 25, "#f0d782");
    renderRunHud();
  }

  function processDefeatedEnemies() {
    game.enemies.getAllTargets().forEach((enemy) => {
      if (!enemy.isDead || enemy.statsCounted) return;
      enemy.statsCounted = true;
      game.runStats.enemiesDefeated += 1;
      if (enemy.type === "ELITE") game.runStats.elitesDefeated += 1;
      if (enemy.isBoss) game.runStats.bossDefeated = true;
      game.currency.dropForEnemy(enemy, game.upgrades.getPassiveLevel("luckyCoin"));
      if (!enemy.experienceDropped && enemy.expValue > 0) {
        enemy.experienceDropped = true;
        game.expCrystals.drop(enemy.x, enemy.y, enemy.expValue);
      }
    });
  }

  function updateSimulation(deltaSeconds) {
    if (game.state !== GameState.PLAYING || game.ended || game.levelUpPaused) return;
    if (game.hitStopFrames > 0) {
      game.hitStopFrames -= 1;
      return;
    }

    game.player.update(deltaSeconds, viewportWidth, viewportHeight);
    game.contactDamageCooldown = Math.max(0, game.contactDamageCooldown - deltaSeconds);

    const currentRoom = game.rooms.getCurrentRoom();
    const hasEncounter = ["COMBAT", "ELITE", "BOSS"].includes(currentRoom.type)
      && !currentRoom.encounterCleared;
    const enemiesBeforeUpdate = game.enemies.getLivingCount();

    if (hasEncounter) {
      game.enemies.update(deltaSeconds, game.player);
      game.enemies.updateBoss(
        deltaSeconds,
        game.player,
        viewportWidth,
        viewportHeight,
        (damage, source) => damagePlayer(damage, source),
      );
      if (game.ended) return;

      game.weapons.update(
        deltaSeconds,
        game.player,
        game.enemies.getTargets(),
        applyEnemyDamage,
        game.upgrades.passiveLevels,
      );
      processDefeatedEnemies();
      game.enemies.removeDefeated();
      applyContactDamage();
      if (game.ended) return;

      const enemiesRemaining = game.enemies.getLivingCount();
      if (enemiesRemaining !== enemiesBeforeUpdate) {
        if (enemiesRemaining === 0) {
          game.rooms.markCurrentRoomEncounterCleared();
          markCurrentRoomCleared();
          if (currentRoom.type === "ELITE") {
            openLevelUpIfReady(true);
          }
          if (currentRoom.type === "BOSS") {
            finishRun(GameState.FLOOR_CLEAR);
          }
        }
        renderRoomUI();
      }
    } else {
      game.weapons.update(
        deltaSeconds,
        game.player,
        [],
        applyEnemyDamage,
        game.upgrades.passiveLevels,
      );
    }

    renderEvolutionStatus();

    const collected = game.expCrystals.collectNearby(game.player);
    const coinsCollected = game.currency.collectNearby(game.player);
    if (coinsCollected > 0) renderRunHud();
    if (collected.experience > 0) {
      game.progression.addExperience(collected.experience);
      game.runStats.experienceCollected += collected.experience;
      renderRunHud();
      openLevelUpIfReady();
    }

    game.damageNumbers.forEach((damageNumber) => damageNumber.update(deltaSeconds));
    game.damageNumbers = game.damageNumbers.filter((damageNumber) => damageNumber.life > 0);
    updateParticles(deltaSeconds);
  }

  function frame(timestamp) {
    const deltaSeconds = previousFrameTime === 0
      ? 0
      : Math.min((timestamp - previousFrameTime) / 1000, 0.05);
    previousFrameTime = timestamp;
    game.elapsedSeconds = timestamp / 1000;
    game.frameCount += 1;
    updateSimulation(deltaSeconds);
    context.clearRect(0, 0, viewportWidth, viewportHeight);
    context.save();
    if (game.screenShake > 0) {
      context.translate(
        (Math.random() - 0.5) * game.screenShake,
        (Math.random() - 0.5) * game.screenShake,
      );
    }
    game.miniMap.draw(context, game.rooms, viewportWidth, viewportHeight);
    game.enemies.draw(context);
    game.expCrystals.draw(context, game.elapsedSeconds);
    game.currency.draw(context);
    game.weapons.draw(context, game.player);
    game.player.draw(context);
    drawParticles();
    game.damageNumbers.forEach((damageNumber) => damageNumber.draw(context));
    context.restore();

    if (game.frameCount % 60 === 0) {
      console.log(`[Game Loop] frames: ${game.frameCount}; state: ${game.state}`);
    }

    window.requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resizeCanvas);
  playButton.addEventListener("click", beginRun);
  continueRunButton.addEventListener("click", () => {
    runEndScreen.hidden = true;
    game.state = GameState.MAIN_MENU;
    document.querySelector("#game").classList.add("menu-active");
    renderMainMenu();
    mainMenu.hidden = false;
  });
  document.querySelector("#game").classList.add("menu-active");
  renderMainMenu();
  mainMenu.hidden = false;
  resizeCanvas();
  renderRunHud();
  renderRoomUI();
  window.requestAnimationFrame(frame);
})();
