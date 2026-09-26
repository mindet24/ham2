window.WeaponSystem = class WeaponSystem {
  constructor(unlockedWeapons = []) {
    this.availableWeapons = new Set([
      "spinningBlade",
      "homingOrb",
      "lightningChain",
      "thornAura",
      "boomerangAxe",
      ...unlockedWeapons,
    ]);
    this.weaponLevels = {
      spinningBlade: 1,
      homingOrb: 1,
    };
    this.bladeAngle = 0;
    this.bladeOrbitRadius = 58;
    this.bladeHitCooldowns = new Map();
    this.thornHitCooldowns = new Map();
    this.lightningCooldown = 0.5;
    this.boomerangCooldown = 0.5;
    this.lightningEffects = [];
    this.projectiles = [];
    this.homingCooldown = 0.25;
    this.turretCooldown = 0.2;
    this.poisonCooldown = 1;
    this.poisonClouds = [];
    this.evolutions = {
      bladeStorm: { unlocked: false, cooldown: 10, active: 0, pulse: 0 },
      voidPull: { unlocked: false, cooldown: 10, active: 0 },
    };
  }

  getWeaponLevel(weaponId) {
    return this.weaponLevels[weaponId] || 0;
  }

  acquireOrUpgrade(weaponId) {
    const currentLevel = this.getWeaponLevel(weaponId);
    if (currentLevel >= 5) return false;
    this.weaponLevels[weaponId] = currentLevel + 1;
    return true;
  }

  resetForRoom() {
    this.projectiles = [];
    this.lightningEffects = [];
    this.bladeHitCooldowns.clear();
    this.thornHitCooldowns.clear();
    this.lightningCooldown = 0.5;
    this.boomerangCooldown = 0.5;
    this.homingCooldown = 0.25;
    this.turretCooldown = 0.2;
    this.poisonCooldown = 1;
    this.poisonClouds = [];
  }

  getAttackSpeed(player, passiveLevels) {
    let attackSpeed = Math.max(0.1, player.stats.attackSpeed);
    const adrenalineLevel = passiveLevels.adrenaline || 0;
    if (adrenalineLevel > 0 && player.stats.hp <= player.stats.maxHp * 0.3) {
      attackSpeed *= 1 + 0.25 * adrenalineLevel;
    }
    return attackSpeed;
  }

  getDamage(weaponId, baseDamage) {
    const level = this.getWeaponLevel(weaponId);
    return baseDamage * (1 + Math.max(0, level - 1) * 0.2);
  }

  getCooldown(weaponId, baseCooldown, attackSpeed) {
    const level = this.getWeaponLevel(weaponId);
    const cooldownScale = 1 + Math.max(0, level - 1) * 0.08;
    return baseCooldown / (attackSpeed * cooldownScale);
  }

  update(deltaSeconds, player, enemies, onEnemyHit, passiveLevels = {}) {
    const livingEnemies = enemies.filter((enemy) => !enemy.isDead);
    const attackSpeed = this.getAttackSpeed(player, passiveLevels);
    this.bladeAngle = (this.bladeAngle + deltaSeconds * 2.8) % (Math.PI * 2);

    this.updateBlade(deltaSeconds, player, livingEnemies, attackSpeed, onEnemyHit);
    this.updateThornAura(deltaSeconds, player, livingEnemies, attackSpeed, onEnemyHit);
    this.updateLightningChain(deltaSeconds, player, livingEnemies, attackSpeed, onEnemyHit);
    this.updateBoomerang(deltaSeconds, player, livingEnemies, attackSpeed);
    this.updateHomingOrb(deltaSeconds, player, livingEnemies, attackSpeed);
    this.updateTurretDrone(deltaSeconds, player, livingEnemies, attackSpeed);
    this.updatePoisonCloud(deltaSeconds, player, livingEnemies, attackSpeed, onEnemyHit);
    this.updateEvolutions(deltaSeconds, player, livingEnemies, passiveLevels, onEnemyHit);

    this.projectiles.forEach((projectile) => projectile.update(deltaSeconds, livingEnemies, onEnemyHit, player));
    this.projectiles = this.projectiles.filter((projectile) => !projectile.isDead);
    this.lightningEffects.forEach((effect) => {
      effect.remaining -= deltaSeconds;
    });
    this.lightningEffects = this.lightningEffects.filter((effect) => effect.remaining > 0);
  }

  updateBlade(deltaSeconds, player, enemies, attackSpeed, onEnemyHit) {
    const level = this.getWeaponLevel("spinningBlade");
    if (level <= 0) return;
    const bladeX = player.x + Math.cos(this.bladeAngle) * this.bladeOrbitRadius;
    const bladeY = player.y + Math.sin(this.bladeAngle) * this.bladeOrbitRadius;
    this.tickCooldowns(this.bladeHitCooldowns, enemies, deltaSeconds);

    enemies.forEach((enemy) => {
      if (Math.hypot(enemy.x - bladeX, enemy.y - bladeY) > enemy.radius + 9) return;
      if ((this.bladeHitCooldowns.get(enemy.id) || 0) > 0) return;
      onEnemyHit(enemy, this.getDamage("spinningBlade", 10));
      this.bladeHitCooldowns.set(
        enemy.id,
        this.getCooldown("spinningBlade", 0.55, attackSpeed),
      );
    });
  }

  updateHomingOrb(deltaSeconds, player, enemies, attackSpeed) {
    const level = this.getWeaponLevel("homingOrb");
    if (level <= 0 || enemies.length === 0) return;
    this.homingCooldown = Math.max(0, (this.homingCooldown || 0) - deltaSeconds);
    if (this.homingCooldown > 0) return;

    this.projectiles.push(new window.HomingOrb(
      player.x,
      player.y,
      this.getDamage("homingOrb", 12),
      260,
      2 + Math.floor((level - 1) / 2),
    ));
    this.homingCooldown = this.getCooldown("homingOrb", 1.2, attackSpeed);
  }

  updateTurretDrone(deltaSeconds, player, enemies, attackSpeed) {
    const level = this.getWeaponLevel("turretDrone");
    this.turretCooldown = Math.max(0, this.turretCooldown - deltaSeconds);
    if (level <= 0 || enemies.length === 0 || this.turretCooldown > 0) return;
    const target = this.findNearestEnemy(player.x, player.y, enemies);
    if (!target) return;
    this.projectiles.push(new window.HomingOrb(
      player.x + 32,
      player.y - 28,
      this.getDamage("turretDrone", 8 + level * 2),
      300,
      1 + Math.floor((level - 1) / 3),
    ));
    this.turretCooldown = this.getCooldown("turretDrone", 0.9, attackSpeed);
  }

  updatePoisonCloud(deltaSeconds, player, enemies, attackSpeed, onEnemyHit) {
    const level = this.getWeaponLevel("poisonCloud");
    this.poisonCooldown = Math.max(0, this.poisonCooldown - deltaSeconds);
    if (level > 0 && enemies.length > 0 && this.poisonCooldown <= 0) {
      const target = this.findNearestEnemy(player.x, player.y, enemies);
      if (target) {
        this.poisonClouds.push({ x: target.x, y: target.y, life: 3, tick: 0 });
        this.poisonCooldown = this.getCooldown("poisonCloud", 3.2, attackSpeed);
      }
    }
    this.poisonClouds.forEach((cloud) => {
      cloud.life -= deltaSeconds;
      cloud.tick -= deltaSeconds;
      if (cloud.tick <= 0) {
        enemies.forEach((enemy) => {
          if (Math.hypot(enemy.x - cloud.x, enemy.y - cloud.y) <= 48 + enemy.radius) {
            onEnemyHit(enemy, this.getDamage("poisonCloud", 4 + level * 2));
          }
        });
        cloud.tick = 0.6;
      }
    });
    this.poisonClouds = this.poisonClouds.filter((cloud) => cloud.life > 0);
  }

  updateEvolutions(deltaSeconds, player, enemies, passiveLevels, onEnemyHit) {
    const bladeReady = this.getWeaponLevel("spinningBlade") >= 5
      && this.getWeaponLevel("thornAura") >= 5;
    const pullReady = this.getWeaponLevel("homingOrb") >= 5
      && (passiveLevels.magnetCore || 0) >= 5;
    const bladeStorm = this.evolutions.bladeStorm;
    const voidPull = this.evolutions.voidPull;
    bladeStorm.unlocked = bladeReady;
    voidPull.unlocked = pullReady;

    if (bladeReady && enemies.length > 0) {
      bladeStorm.cooldown = Math.max(0, bladeStorm.cooldown - deltaSeconds);
      if (bladeStorm.active > 0) {
        bladeStorm.active = Math.max(0, bladeStorm.active - deltaSeconds);
        bladeStorm.pulse -= deltaSeconds;
        if (bladeStorm.pulse <= 0 && bladeStorm.active > 0) {
          enemies.forEach((enemy) => {
            if (Math.hypot(enemy.x - player.x, enemy.y - player.y) <= 280 + enemy.radius) {
              onEnemyHit(enemy, this.getDamage("spinningBlade", 10));
            }
          });
          bladeStorm.pulse = 0.5;
        }
      } else {
        if (bladeStorm.cooldown <= 0) {
          bladeStorm.active = 2;
          bladeStorm.pulse = 0;
          bladeStorm.cooldown = 10;
        }
      }
    }

    if (pullReady && enemies.length > 0) {
      voidPull.cooldown = Math.max(0, voidPull.cooldown - deltaSeconds);
      if (voidPull.active > 0) {
        voidPull.active = Math.max(0, voidPull.active - deltaSeconds);
        enemies.forEach((enemy) => {
          const dx = player.x - enemy.x;
          const dy = player.y - enemy.y;
          const distance = Math.hypot(dx, dy);
          if (distance > 0 && distance <= 160) {
            const travel = Math.min(distance, 180 * deltaSeconds);
            enemy.x += (dx / distance) * travel;
            enemy.y += (dy / distance) * travel;
          }
        });
        if (voidPull.active === 0) {
          enemies.forEach((enemy) => {
            if (Math.hypot(enemy.x - player.x, enemy.y - player.y) <= 90 + enemy.radius) {
              onEnemyHit(enemy, this.getDamage("homingOrb", 24));
            }
          });
        }
      } else {
        if (voidPull.cooldown <= 0) {
          voidPull.active = 1;
          voidPull.cooldown = 10;
        }
      }
    }
  }

  getEvolutionStatus() {
    const describe = (evolution) => {
      if (!evolution.unlocked) return "locked";
      if (evolution.active > 0) return "ACTIVE";
      if (evolution.cooldown <= 0) return "READY";
      return `${Math.ceil(evolution.cooldown)}s`;
    };
    return [
      `Blade Storm · ${describe(this.evolutions.bladeStorm)}`,
      `Void Pull · ${describe(this.evolutions.voidPull)}`,
    ];
  }

  updateLightningChain(deltaSeconds, player, enemies, attackSpeed, onEnemyHit) {
    const level = this.getWeaponLevel("lightningChain");
    this.lightningCooldown = Math.max(0, this.lightningCooldown - deltaSeconds);
    if (level <= 0 || enemies.length === 0 || this.lightningCooldown > 0) return;

    const segments = [];
    const alreadyHit = new Set();
    let from = { x: player.x, y: player.y };
    const maximumTargets = Math.min(enemies.length, 2 + level);
    let targetCount = maximumTargets;

    while (targetCount > 0) {
      let target = null;
      let nearestDistance = targetCount === maximumTargets ? 420 : 180;
      enemies.forEach((enemy) => {
        if (enemy.isDead || alreadyHit.has(enemy.id)) return;
        const distance = Math.hypot(enemy.x - from.x, enemy.y - from.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          target = enemy;
        }
      });
      if (!target) break;

      segments.push({ x1: from.x, y1: from.y, x2: target.x, y2: target.y });
      alreadyHit.add(target.id);
      onEnemyHit(target, this.getDamage("lightningChain", 8));
      from = { x: target.x, y: target.y };
      targetCount -= 1;
    }

    if (segments.length > 0) {
      this.lightningEffects.push({ segments, remaining: 0.18 });
      this.lightningCooldown = this.getCooldown("lightningChain", 2.4, attackSpeed);
    }
  }

  updateThornAura(deltaSeconds, player, enemies, attackSpeed, onEnemyHit) {
    const level = this.getWeaponLevel("thornAura");
    if (level <= 0) return;
    this.tickCooldowns(this.thornHitCooldowns, enemies, deltaSeconds);
    const auraRadius = 46 + level * 5;

    enemies.forEach((enemy) => {
      if (Math.hypot(enemy.x - player.x, enemy.y - player.y) > auraRadius + enemy.radius) return;
      if ((this.thornHitCooldowns.get(enemy.id) || 0) > 0) return;
      onEnemyHit(enemy, this.getDamage("thornAura", 5));
      this.thornHitCooldowns.set(
        enemy.id,
        this.getCooldown("thornAura", 0.8, attackSpeed),
      );
    });
  }

  updateBoomerang(deltaSeconds, player, enemies, attackSpeed) {
    const level = this.getWeaponLevel("boomerangAxe");
    this.boomerangCooldown = Math.max(0, this.boomerangCooldown - deltaSeconds);
    if (level <= 0 || enemies.length === 0 || this.boomerangCooldown > 0) return;

    const target = this.findNearestEnemy(player.x, player.y, enemies);
    if (!target) return;
    this.projectiles.push(new window.BoomerangAxe(
      player.x,
      player.y,
      target.x,
      target.y,
      this.getDamage("boomerangAxe", 9),
      320,
      260,
    ));
    this.boomerangCooldown = this.getCooldown("boomerangAxe", 2.1, attackSpeed);
  }

  findNearestEnemy(x, y, enemies) {
    return enemies.filter((enemy) => !enemy.isDead).reduce((nearest, enemy) => {
      if (!nearest) return enemy;
      return Math.hypot(enemy.x - x, enemy.y - y) < Math.hypot(nearest.x - x, nearest.y - y)
        ? enemy
        : nearest;
    }, null);
  }

  tickCooldowns(cooldowns, enemies, deltaSeconds) {
    cooldowns.forEach((cooldown, enemyId) => {
      const enemy = enemies.find((candidate) => candidate.id === enemyId);
      if (!enemy) {
        cooldowns.delete(enemyId);
      } else {
        cooldowns.set(enemyId, Math.max(0, cooldown - deltaSeconds));
      }
    });
  }

  draw(context, player) {
    const bladeLevel = this.getWeaponLevel("spinningBlade");
    if (bladeLevel > 0) {
      const bladeX = player.x + Math.cos(this.bladeAngle) * this.bladeOrbitRadius;
      const bladeY = player.y + Math.sin(this.bladeAngle) * this.bladeOrbitRadius;
      context.save();
      context.translate(bladeX, bladeY);
      context.rotate(this.bladeAngle + Math.PI / 4);
      context.beginPath();
      context.moveTo(0, -13);
      context.lineTo(7, 0);
      context.lineTo(0, 13);
      context.lineTo(-7, 0);
      context.closePath();
      context.fillStyle = "#e8d081";
      context.fill();
      context.strokeStyle = "#8c7134";
      context.lineWidth = 2;
      context.stroke();
      context.restore();
    }

    const thornLevel = this.getWeaponLevel("thornAura");
    if (thornLevel > 0) {
      context.beginPath();
      context.arc(player.x, player.y, 46 + thornLevel * 5, 0, Math.PI * 2);
      context.strokeStyle = "rgba(132, 190, 126, 0.35)";
      context.lineWidth = 2;
      context.stroke();
    }

    const turretLevel = this.getWeaponLevel("turretDrone");
    if (turretLevel > 0) {
      context.beginPath();
      context.arc(player.x + 32, player.y - 28, 9, 0, Math.PI * 2);
      context.fillStyle = "#85b9d1";
      context.fill();
      context.strokeStyle = "#d9f4ff";
      context.lineWidth = 2;
      context.stroke();
    }

    this.poisonClouds.forEach((cloud) => {
      context.save();
      context.globalAlpha = Math.min(0.42, cloud.life / 6);
      context.beginPath();
      context.arc(cloud.x, cloud.y, 48, 0, Math.PI * 2);
      context.fillStyle = "#89cc62";
      context.fill();
      context.restore();
    });

    const bladeStorm = this.evolutions.bladeStorm;
    if (bladeStorm.active > 0) {
      context.save();
      context.globalAlpha = Math.min(0.7, bladeStorm.active / 2);
      context.beginPath();
      context.arc(player.x, player.y, 280, 0, Math.PI * 2);
      context.strokeStyle = "#f3d775";
      context.lineWidth = 6;
      context.stroke();
      context.restore();
    }

    const voidPull = this.evolutions.voidPull;
    if (voidPull.active > 0) {
      context.save();
      context.globalAlpha = 0.28 + 0.18 * Math.sin(voidPull.active * 18);
      context.beginPath();
      context.arc(player.x, player.y, 160, 0, Math.PI * 2);
      context.fillStyle = "#7167bd";
      context.fill();
      context.strokeStyle = "#c9b7ff";
      context.lineWidth = 3;
      context.stroke();
      context.restore();
    }

    this.lightningEffects.forEach((effect) => {
      context.save();
      context.globalAlpha = Math.min(1, effect.remaining / 0.06);
      context.strokeStyle = "#b8e9ff";
      context.lineWidth = 3;
      effect.segments.forEach((segment) => {
        const middleX = (segment.x1 + segment.x2) / 2 + (Math.random() - 0.5) * 12;
        const middleY = (segment.y1 + segment.y2) / 2 + (Math.random() - 0.5) * 12;
        context.beginPath();
        context.moveTo(segment.x1, segment.y1);
        context.lineTo(middleX, middleY);
        context.lineTo(segment.x2, segment.y2);
        context.stroke();
      });
      context.restore();
    });

    this.projectiles.forEach((projectile) => projectile.draw(context));
  }
};
