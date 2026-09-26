(() => {
  const ENEMY_STATS = Object.freeze({
    BASIC: { hp: 30, speed: 58, contactDamage: 8, radius: 12, color: "#bc655b" },
    FAST: { hp: 16, speed: 96, contactDamage: 6, radius: 9, color: "#dc9155" },
    ELITE: { hp: 100, speed: 44, contactDamage: 12, radius: 22, color: "#c58c42" },
  });

  class Enemy {
    constructor(type, x, y, id) {
      const stats = ENEMY_STATS[type];
      this.id = id;
      this.type = type;
      this.x = x;
      this.y = y;
      this.hp = stats.hp;
      this.maxHp = stats.hp;
      this.speed = stats.speed;
      this.contactDamage = stats.contactDamage;
      this.radius = stats.radius;
      this.color = stats.color;
      this.isDead = false;
      this.expValue = type === "FAST" ? 8 : type === "ELITE" ? 10 : 5;
      this.experienceDropped = false;
      this.statsCounted = false;
    }

    update(deltaSeconds, player) {
      if (this.isDead) return;
      const deltaX = player.x - this.x;
      const deltaY = player.y - this.y;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance === 0) return;

      const travel = this.speed * deltaSeconds;
      this.x += (deltaX / distance) * travel;
      this.y += (deltaY / distance) * travel;
    }

    takeDamage(amount) {
      if (this.isDead) return 0;
      const previousHp = this.hp;
      this.hp = Math.max(0, this.hp - amount);
      if (this.hp === 0) this.isDead = true;
      return previousHp - this.hp;
    }

    draw(context) {
      if (this.isDead) return;

      context.beginPath();
      context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      context.fillStyle = this.color;
      context.fill();
      context.strokeStyle = this.type === "FAST"
        ? "#f2d2a8"
        : this.type === "ELITE"
          ? "#ffe08d"
          : "#e5aaa1";
      context.lineWidth = this.type === "ELITE" ? 4 : 2;
      context.stroke();

      if (this.type === "ELITE") {
        context.beginPath();
        context.arc(this.x, this.y, this.radius + 7, 0, Math.PI * 2);
        context.strokeStyle = "rgba(255, 210, 115, 0.45)";
        context.lineWidth = 2;
        context.stroke();
      }

      if (this.hp < this.maxHp) {
        const barWidth = 28;
        const barY = this.y - this.radius - 8;
        context.fillStyle = "#291e20";
        context.fillRect(this.x - barWidth / 2, barY, barWidth, 4);
        context.fillStyle = "#d65e55";
        context.fillRect(this.x - barWidth / 2, barY, barWidth * (this.hp / this.maxHp), 4);
      }
    }
  }

  class BossController {
    constructor(width, height, routeLength) {
      this.id = "floor-boss";
      this.type = "BOSS";
      this.isBoss = true;
      this.isDead = false;
      this.x = width / 2;
      this.y = Math.max(48, Math.min(height - 48, height * 0.28));
      this.radius = 34;
      this.maxHp = 300 + 12 * routeLength;
      this.hp = this.maxHp;
      this.speed = 42;
      this.contactDamage = 12;
      this.expValue = 30;
      this.experienceDropped = false;
      this.statsCounted = false;
      this.attackPattern = 0;
      this.state = "approach";
      this.stateTimer = 1.4;
      this.slamRadius = 140;
      this.chargeHit = false;
      this.chargeDirection = { x: 0, y: 0 };
      this.chargeTarget = { x: this.x, y: this.y };
    }

    takeDamage(amount) {
      if (this.isDead) return 0;
      const previousHp = this.hp;
      this.hp = Math.max(0, this.hp - amount);
      if (this.hp === 0) this.isDead = true;
      return previousHp - this.hp;
    }

    update(deltaSeconds, player, width, height, onAttackHit) {
      if (this.isDead) return;
      this.stateTimer -= deltaSeconds;

      if (this.state === "approach") {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 100) {
          this.x += (dx / distance) * this.speed * deltaSeconds;
          this.y += (dy / distance) * this.speed * deltaSeconds;
        }
        if (this.stateTimer <= 0) {
          if (this.attackPattern % 2 === 0) {
            this.state = "slamTell";
            this.stateTimer = 0.8;
          } else {
            this.state = "chargeTell";
            this.stateTimer = 0.6;
            const targetDx = player.x - this.x;
            const targetDy = player.y - this.y;
            const targetDistance = Math.hypot(targetDx, targetDy) || 1;
            this.chargeDirection = { x: targetDx / targetDistance, y: targetDy / targetDistance };
            this.chargeTarget = { x: player.x, y: player.y };
          }
        }
        return;
      }

      if (this.state === "slamTell") {
        if (this.stateTimer <= 0) {
          if (Math.hypot(player.x - this.x, player.y - this.y) <= this.slamRadius) {
            onAttackHit(20, "Ground Slam");
          }
          this.state = "recover";
          this.stateTimer = 0.9;
        }
        return;
      }

      if (this.state === "chargeTell") {
        if (this.stateTimer <= 0) {
          this.state = "charge";
          this.stateTimer = 0.6;
          this.chargeHit = false;
        }
        return;
      }

      if (this.state === "charge") {
        const travel = 250 * deltaSeconds;
        this.x = Math.max(this.radius, Math.min(width - this.radius, this.x + this.chargeDirection.x * travel));
        this.y = Math.max(this.radius, Math.min(height - this.radius, this.y + this.chargeDirection.y * travel));
        if (!this.chargeHit && Math.hypot(player.x - this.x, player.y - this.y) <= this.radius + player.radius) {
          this.chargeHit = true;
          onAttackHit(16, "Charge");
        }
        if (this.stateTimer <= 0) {
          this.state = "recover";
          this.stateTimer = 0.9;
        }
        return;
      }

      if (this.state === "recover" && this.stateTimer <= 0) {
        this.attackPattern += 1;
        this.state = "approach";
        this.stateTimer = 1.4;
      }
    }

    draw(context) {
      if (this.isDead) return;
      if (this.state === "slamTell") {
        context.save();
        context.globalAlpha = 0.28 + (1 - Math.max(0, this.stateTimer) / 0.8) * 0.35;
        context.beginPath();
        context.arc(this.x, this.y, this.slamRadius, 0, Math.PI * 2);
        context.fillStyle = "#d54e48";
        context.fill();
        context.strokeStyle = "#ff8a72";
        context.lineWidth = 3;
        context.stroke();
        context.restore();
      } else if (this.state === "chargeTell") {
        context.save();
        context.strokeStyle = "rgba(255, 103, 80, 0.85)";
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(this.x, this.y);
        context.lineTo(this.chargeTarget.x, this.chargeTarget.y);
        context.stroke();
        context.restore();
      }

      context.beginPath();
      context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      context.fillStyle = this.state === "charge" ? "#f06c54" : "#853e4c";
      context.fill();
      context.strokeStyle = "#e4bd72";
      context.lineWidth = 4;
      context.stroke();

      const barWidth = 110;
      const barX = this.x - barWidth / 2;
      const barY = this.y - this.radius - 17;
      context.fillStyle = "#291e20";
      context.fillRect(barX, barY, barWidth, 7);
      context.fillStyle = "#dc5e57";
      context.fillRect(barX, barY, barWidth * (this.hp / this.maxHp), 7);
      context.fillStyle = "#f2ead7";
      context.font = "700 11px system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "bottom";
      context.fillText("BOSS", this.x, barY - 2);
    }
  }

  function randomSpawnPosition(width, height, player) {
    const margin = 22;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const side = Math.floor(Math.random() * 4);
      const x = side < 2
        ? (side === 0 ? margin : Math.max(margin, width - margin))
        : margin + Math.random() * Math.max(0, width - margin * 2);
      const y = side >= 2
        ? (side === 2 ? margin : Math.max(margin, height - margin))
        : margin + Math.random() * Math.max(0, height - margin * 2);

      if (Math.hypot(x - player.x, y - player.y) >= 90) return { x, y };
    }

    return { x: margin, y: margin };
  }

  function getCombatSpawnCounts(progress) {
    if (progress >= 0.75) return { basicCount: 6, fastCount: 3 };
    if (progress >= 0.5) return { basicCount: 5, fastCount: 2 };
    if (progress >= 0.25) return { basicCount: 4, fastCount: 1 };
    return { basicCount: 3, fastCount: 0 };
  }

  function getCombatExperienceReward(progress) {
    const { basicCount, fastCount } = getCombatSpawnCounts(progress);
    return basicCount * 5 + fastCount * 8;
  }

  window.EnemySystem = class EnemySystem {
    constructor() {
      this.enemies = [];
      this.nextEnemyId = 1;
      this.boss = null;
    }

    clear() {
      this.enemies = [];
      this.boss = null;
    }

    spawnForRoom(room, routeLength, width, height, player) {
      this.clear();
      if (room.type === "BOSS") {
        this.boss = new BossController(width, height, routeLength);
        return;
      }
      if (room.type === "ELITE") {
        const eliteCount = Math.random() < 0.5 ? 1 : 2;
        const totalExperience = getCombatExperienceReward(room.depth / routeLength) * 2;
        for (let index = 0; index < eliteCount; index += 1) {
          const elite = this.spawnOne("ELITE", width, height, player);
          elite.expValue = totalExperience / eliteCount;
        }
        return;
      }
      if (room.type !== "COMBAT") return;

      const progress = room.depth / routeLength;
      const { basicCount, fastCount } = getCombatSpawnCounts(progress);

      for (let index = 0; index < basicCount; index += 1) {
        this.spawnOne("BASIC", width, height, player);
      }
      for (let index = 0; index < fastCount; index += 1) {
        this.spawnOne("FAST", width, height, player);
      }
    }

    spawnOne(type, width, height, player) {
      const position = randomSpawnPosition(width, height, player);
      const enemy = new Enemy(type, position.x, position.y, this.nextEnemyId);
      this.enemies.push(enemy);
      this.nextEnemyId += 1;
      return enemy;
    }

    update(deltaSeconds, player) {
      this.enemies.forEach((enemy) => enemy.update(deltaSeconds, player));
    }

    updateBoss(deltaSeconds, player, width, height, onAttackHit) {
      if (this.boss) this.boss.update(deltaSeconds, player, width, height, onAttackHit);
    }

    getTargets() {
      const targets = this.enemies.filter((enemy) => !enemy.isDead);
      if (this.boss && !this.boss.isDead) targets.push(this.boss);
      return targets;
    }

    getAllTargets() {
      return this.boss ? [...this.enemies, this.boss] : [...this.enemies];
    }

    getLivingCount() {
      return this.getTargets().length;
    }

    removeDefeated() {
      this.enemies = this.enemies.filter((enemy) => !enemy.isDead);
    }

    draw(context) {
      this.enemies.forEach((enemy) => enemy.draw(context));
      if (this.boss) this.boss.draw(context);
    }
  };
})();
