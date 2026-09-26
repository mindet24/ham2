(() => {
  const WEAPON_POOL = [
    { id: "spinningBlade", name: "Spinning Blade", icon: "🗡️" },
    { id: "homingOrb", name: "Homing Orb", icon: "🔮" },
    { id: "lightningChain", name: "Lightning Chain", icon: "⚡" },
    { id: "thornAura", name: "Thorn Aura", icon: "🌿" },
    { id: "boomerangAxe", name: "Boomerang Axe", icon: "🪓" },
    { id: "turretDrone", name: "Turret Drone", icon: "🛸" },
    { id: "poisonCloud", name: "Poison Cloud", icon: "☠️" },
  ];

  const PASSIVE_POOL = [
    { id: "magnetCore", name: "Magnet Core", icon: "🧲" },
    { id: "bloodPact", name: "Blood Pact", icon: "🩸" },
    { id: "adrenaline", name: "Adrenaline", icon: "💉" },
  ];

  function shuffle(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const otherIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[otherIndex]] = [shuffled[otherIndex], shuffled[index]];
    }
    return shuffled;
  }

  window.RunProgression = class RunProgression {
    constructor() {
      this.level = 1;
      this.experience = 0;
      this.experienceToNextLevel = 15;
    }

    addExperience(amount) {
      this.experience += amount;
    }

    consumeLevelUp() {
      if (this.experience < this.experienceToNextLevel) return false;
      this.experience -= this.experienceToNextLevel;
      this.level += 1;
      this.experienceToNextLevel = 15 + (this.level - 1) * 10;
      return true;
    }
  };

  window.ExpCrystalSystem = class ExpCrystalSystem {
    constructor() {
      this.crystals = [];
      this.nextCrystalId = 1;
    }

    drop(x, y, value) {
      this.crystals.push({
        id: this.nextCrystalId,
        x,
        y,
        value,
        radius: 6,
        phase: Math.random() * Math.PI * 2,
      });
      this.nextCrystalId += 1;
    }

    clear() {
      this.crystals = [];
    }

    collectNearby(player) {
      let baseExperience = 0;
      let crystalCount = 0;
      this.crystals = this.crystals.filter((crystal) => {
        const distance = Math.hypot(crystal.x - player.x, crystal.y - player.y);
        if (distance <= player.stats.pickupRange + crystal.radius) {
          baseExperience += crystal.value;
          crystalCount += 1;
          return false;
        }
        return true;
      });

      const experience = Math.round(baseExperience * player.stats.expGain);
      return { experience, crystalCount };
    }

    draw(context, elapsedSeconds) {
      this.crystals.forEach((crystal) => {
        const bob = Math.sin(elapsedSeconds * 4 + crystal.phase) * 2;
        context.save();
        context.shadowColor = "#8be2ff";
        context.shadowBlur = 10;
        context.beginPath();
        context.arc(crystal.x, crystal.y + bob, crystal.radius, 0, Math.PI * 2);
        context.fillStyle = "#73d7ee";
        context.fill();
        context.restore();
      });
    }
  };

  window.UpgradeSystem = class UpgradeSystem {
    constructor() {
      this.passiveLevels = {};
    }

    getPassiveLevel(passiveId) {
      return this.passiveLevels[passiveId] || 0;
    }

    getChoices(weaponSystem) {
      const candidates = [];
      WEAPON_POOL.filter((weapon) => weaponSystem.availableWeapons.has(weapon.id)).forEach((weapon) => {
        const currentLevel = weaponSystem.getWeaponLevel(weapon.id);
        if (currentLevel >= 5) return;
        const isNew = currentLevel === 0;
        candidates.push({
          kind: "weapon",
          id: weapon.id,
          icon: weapon.icon,
          title: weapon.name,
          subtitle: isNew ? "New Weapon · Lv. 1" : `Weapon Upgrade · Lv. ${currentLevel} → ${currentLevel + 1}`,
          description: isNew
            ? "Add this auto-attacking weapon to your build."
            : "Damage +20%; attack cooldown -8%.",
        });
      });

      PASSIVE_POOL.forEach((passive) => {
        const currentLevel = this.getPassiveLevel(passive.id);
        if (currentLevel >= 5) return;
        const nextLevel = currentLevel + 1;
        candidates.push({
          kind: "passive",
          id: passive.id,
          icon: passive.icon,
          title: passive.name,
          subtitle: currentLevel === 0
            ? "New Passive · Lv. 1"
            : `Passive Upgrade · Lv. ${currentLevel} → ${nextLevel}`,
          description: this.getPassiveDescription(passive.id, nextLevel),
        });
      });

      return shuffle(candidates).slice(0, 3);
    }

    getPassiveDescription(passiveId, level) {
      if (passiveId === "magnetCore") return `Pickup Range +20% per level (Lv. ${level}).`;
      if (passiveId === "bloodPact") return `Max HP +10 and Move Speed -3% per level (Lv. ${level}).`;
      return `When HP is below 30%, Attack Speed +25% per level (Lv. ${level}).`;
    }

    apply(choice, weaponSystem, player) {
      if (choice.kind === "weapon") {
        return weaponSystem.acquireOrUpgrade(choice.id);
      }

      const nextLevel = this.getPassiveLevel(choice.id) + 1;
      if (nextLevel > 5) return false;
      this.passiveLevels[choice.id] = nextLevel;

      if (choice.id === "magnetCore") {
        player.stats.pickupRange += 16;
      } else if (choice.id === "bloodPact") {
        player.stats.maxHp += 10;
        player.stats.moveSpeed *= 0.97;
      }
      return true;
    }
  };
})();
