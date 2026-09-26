(() => {
  const canvas = document.querySelector("#game-canvas");
  const context = canvas.getContext("2d");
  const roomStatus = document.querySelector("#room-status");
  const enemyStatus = document.querySelector("#enemy-status");
  const doorOptions = document.querySelector("#door-options");
  const runLevelLabel = document.querySelector("#run-level-label");
  const expLabel = document.querySelector("#exp-label");
  const expFill = document.querySelector("#exp-fill");
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
    metaProgression: new window.MetaProgression(),
    metaRewardResult: null,
    damageNumbers: [],
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

  function renderRunHud() {
    const progression = game.progression;
    const percentage = Math.min(100, (progression.experience / progression.experienceToNextLevel) * 100);
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
    game.damageNumbers = [];
    game.hitStopFrames = 0;
    game.contactDamageCooldown = 0;
    game.levelUpPaused = false;
    game.ended = false;
    game.metaRewardResult = null;
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
    roomStatus.textContent = `${currentRoom.icon} ${currentRoom.label} — Room ${currentRoom.depth}/${game.rooms.routeLength}`;
    doorOptions.replaceChildren();

    const locked = game.rooms.isCurrentRoomLocked();
    enemyStatus.hidden = !locked;
    enemyStatus.textContent = locked
      ? `🔒 ${game.enemies.getLivingCount()} enemies remaining — defeat them to unlock doors`
      : "";

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
        game.player.clearKeys();
        levelUpPanel.hidden = true;
        game.levelUpPaused = false;
        renderRunHud();
        renderEvolutionStatus();
        openLevelUpIfReady();
      });
      upgradeChoices.append(button);
    });
  }

  function openLevelUpIfReady() {
    if (game.levelUpPaused || game.ended) return;
    if (game.progression.experience < game.progression.experienceToNextLevel) return;
    const choices = game.upgrades.getChoices(game.weapons);
    if (choices.length === 0 || !game.progression.consumeLevelUp()) return;

    game.levelUpPaused = true;
    game.player.clearKeys();
    levelUpTitle.textContent = `LEVEL UP · ${game.progression.level}`;
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
    const dealt = enemy.takeDamage(damage * game.player.stats.damage);
    if (dealt <= 0) return;
    if (enemy.isBoss) game.runStats.bossDamageDealt += dealt;
    addDamageNumber(dealt, enemy.x, enemy.y - enemy.radius - 7, "#fff0b3");
    game.hitStopFrames = Math.max(game.hitStopFrames, 2);
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
    }
    if (game.player.stats.hp <= 0) finishRun(GameState.GAME_OVER);
  }

  function processDefeatedEnemies() {
    game.enemies.getAllTargets().forEach((enemy) => {
      if (!enemy.isDead || enemy.statsCounted) return;
      enemy.statsCounted = true;
      game.runStats.enemiesDefeated += 1;
      if (enemy.type === "ELITE") game.runStats.elitesDefeated += 1;
      if (enemy.isBoss) game.runStats.bossDefeated = true;
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
    if (collected.experience > 0) {
      game.progression.addExperience(collected.experience);
      game.runStats.experienceCollected += collected.experience;
      renderRunHud();
      openLevelUpIfReady();
    }

    game.damageNumbers.forEach((damageNumber) => damageNumber.update(deltaSeconds));
    game.damageNumbers = game.damageNumbers.filter((damageNumber) => damageNumber.life > 0);
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

    game.miniMap.draw(context, game.rooms, viewportWidth, viewportHeight);
    game.enemies.draw(context);
    game.expCrystals.draw(context, game.elapsedSeconds);
    game.weapons.draw(context, game.player);
    game.player.draw(context);
    game.damageNumbers.forEach((damageNumber) => damageNumber.draw(context));

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
