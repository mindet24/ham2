(() => {
  const SAVE_KEY = "miniRoguelike.meta.v1";
  const MAX_META_LEVEL = 20;

  const REWARDS = [
    { level: 1, key: "startingLevel", label: "Starting Level" },
    { level: 2, key: "maxHp5a", label: "+5 Max HP" },
    { level: 3, key: "expGain5", label: "+5% EXP Gain" },
    { level: 4, key: "damage2", label: "+2% Damage" },
    { level: 5, key: "turretDrone", label: "Unlock: Turret Drone", weapon: "turretDrone" },
    { level: 6, key: "moveSpeed5a", label: "+5% Move Speed" },
    { level: 7, key: "maxHp5b", label: "+5 Max HP" },
    { level: 8, key: "pickup5", label: "+5% Pickup Range" },
    { level: 9, key: "attackSpeed3", label: "+3% Attack Speed" },
    { level: 10, key: "character1", label: "Unlock: Character 1 (details pending)" },
    { level: 11, key: "startingBoon", label: "Unlock: Starting Boon" },
    { level: 12, key: "restBonus", label: "Unlock: Rest Room healing bonus" },
    { level: 13, key: "damage5", label: "+5% Damage" },
    { level: 14, key: "shopDiscount", label: "Unlock: Shop discount" },
    { level: 15, key: "poisonCloud", label: "Unlock: Poison Cloud", weapon: "poisonCloud" },
    { level: 16, key: "moveSpeed5b", label: "+5% Move Speed" },
    { level: 17, key: "reroll", label: "Unlock: Upgrade Reroll" },
    { level: 18, key: "allStats5", label: "+5% All Stats (small)" },
    { level: 19, key: "secondWind", label: "Unlock: Permanent Second Wind" },
    { level: 20, key: "character2", label: "Unlock: Character 2 (details pending)" },
  ];

  function freshSave() {
    return {
      level: 1,
      experience: 0,
      permanentUpgrades: ["startingLevel"],
      unlockedWeapons: [],
      unlockedCharacters: [],
      bestRunStats: null,
    };
  }

  window.MetaProgression = class MetaProgression {
    constructor() {
      this.data = this.load();
      this.normalize();
    }

    load() {
      try {
        const stored = window.localStorage.getItem(SAVE_KEY);
        if (!stored) return freshSave();
        return { ...freshSave(), ...JSON.parse(stored) };
      } catch (error) {
        console.warn("Meta save could not be loaded; starting with a fresh profile.", error);
        return freshSave();
      }
    }

    normalize() {
      this.data.level = Math.max(1, Math.min(MAX_META_LEVEL, Math.floor(Number(this.data.level) || 1)));
      this.data.experience = Math.max(0, Math.floor(Number(this.data.experience) || 0));
      this.data.permanentUpgrades = Array.isArray(this.data.permanentUpgrades)
        ? this.data.permanentUpgrades
        : [];
      this.data.unlockedWeapons = Array.isArray(this.data.unlockedWeapons)
        ? this.data.unlockedWeapons
        : [];
      this.data.unlockedCharacters = Array.isArray(this.data.unlockedCharacters)
        ? this.data.unlockedCharacters
        : [];
      if (!this.data.permanentUpgrades.includes("startingLevel")) {
        this.data.permanentUpgrades.unshift("startingLevel");
      }
      REWARDS.filter((reward) => reward.level <= this.data.level).forEach((reward) => this.unlockReward(reward));
      this.save();
    }

    getExperienceToNextLevel() {
      return this.data.level >= MAX_META_LEVEL ? 0 : 20 + 10 * (this.data.level - 1);
    }

    unlockReward(reward) {
      if (!this.data.permanentUpgrades.includes(reward.key)) {
        this.data.permanentUpgrades.push(reward.key);
      }
      if (reward.weapon && !this.data.unlockedWeapons.includes(reward.weapon)) {
        this.data.unlockedWeapons.push(reward.weapon);
      }
      if (reward.key === "character1" && !this.data.unlockedCharacters.includes("character1")) {
        this.data.unlockedCharacters.push("character1");
      }
      if (reward.key === "character2" && !this.data.unlockedCharacters.includes("character2")) {
        this.data.unlockedCharacters.push("character2");
      }
    }

    addExperience(amount) {
      const gained = Math.max(0, Math.floor(Number(amount) || 0));
      this.data.experience += gained;
      const unlocked = [];
      while (this.data.level < MAX_META_LEVEL && this.data.experience >= this.getExperienceToNextLevel()) {
        this.data.experience -= this.getExperienceToNextLevel();
        this.data.level += 1;
        const reward = REWARDS.find((entry) => entry.level === this.data.level);
        if (reward) {
          this.unlockReward(reward);
          unlocked.push(reward);
        }
      }
      this.save();
      return { gained, unlocked, level: this.data.level };
    }

    getPermanentStats() {
      const keys = new Set(this.data.permanentUpgrades);
      const allStats = keys.has("allStats5") ? 1.05 : 1;
      return {
        maxHp: (100 + (keys.has("maxHp5a") ? 5 : 0) + (keys.has("maxHp5b") ? 5 : 0)) * allStats,
        moveSpeed: 220 * allStats * (keys.has("moveSpeed5a") ? 1.05 : 1) * (keys.has("moveSpeed5b") ? 1.05 : 1),
        damage: allStats * (keys.has("damage2") ? 1.02 : 1) * (keys.has("damage5") ? 1.05 : 1),
        attackSpeed: allStats * (keys.has("attackSpeed3") ? 1.03 : 1),
        pickupRange: 80 * allStats * (keys.has("pickup5") ? 1.05 : 1),
        expGain: allStats * (keys.has("expGain5") ? 1.05 : 1),
      };
    }

    recordRun(stats) {
      const current = this.data.bestRunStats;
      const isBetter = !current
        || stats.floorReached > current.floorReached
        || (stats.floorReached === current.floorReached && stats.roomsCleared > current.roomsCleared);
      if (isBetter) this.data.bestRunStats = { ...stats };
      this.save();
    }

    save() {
      try {
        window.localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
        return true;
      } catch (error) {
        console.warn("Meta save could not be written.", error);
        return false;
      }
    }

    static getRewards() {
      return REWARDS.map((reward) => ({ ...reward }));
    }
  };
})();
