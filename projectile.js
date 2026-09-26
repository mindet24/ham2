window.HomingOrb = class HomingOrb {
  constructor(x, y, damage, speed, bounceCount) {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.speed = speed;
    this.bouncesRemaining = bounceCount;
    this.radius = 7;
    this.hitEnemyIds = new Set();
    this.target = null;
    this.isDead = false;
  }

  findTarget(enemies) {
    let nearest = null;
    let nearestDistance = Infinity;
    enemies.forEach((enemy) => {
      if (enemy.isDead || this.hitEnemyIds.has(enemy.id)) return;
      const distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (distance < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  update(deltaSeconds, enemies, onHit) {
    if (this.isDead) return;
    if (!this.target || this.target.isDead || this.hitEnemyIds.has(this.target.id)) {
      this.target = this.findTarget(enemies);
    }
    if (!this.target) {
      this.isDead = true;
      return;
    }

    const deltaX = this.target.x - this.x;
    const deltaY = this.target.y - this.y;
    const distance = Math.hypot(deltaX, deltaY);
    const reach = this.target.radius + this.radius;
    if (distance <= reach) {
      const hitTarget = this.target;
      this.hitEnemyIds.add(hitTarget.id);
      onHit(hitTarget, this.damage);
      if (this.bouncesRemaining > 0) {
        this.bouncesRemaining -= 1;
        this.target = this.findTarget(enemies);
        if (!this.target) this.isDead = true;
      } else {
        this.isDead = true;
      }
      return;
    }

    const travel = Math.min(this.speed * deltaSeconds, distance - reach);
    this.x += (deltaX / distance) * travel;
    this.y += (deltaY / distance) * travel;
  }

  draw(context) {
    if (this.isDead) return;
    context.save();
    context.shadowColor = "#9be6ed";
    context.shadowBlur = 12;
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    context.fillStyle = "#a8e7ec";
    context.fill();
    context.restore();
  }
};

window.BoomerangAxe = class BoomerangAxe {
  constructor(x, y, targetX, targetY, damage, speed, maxRange) {
    this.x = x;
    this.y = y;
    const directionX = targetX - x;
    const directionY = targetY - y;
    const length = Math.hypot(directionX, directionY) || 1;
    this.directionX = directionX / length;
    this.directionY = directionY / length;
    this.damage = damage;
    this.speed = speed;
    this.maxRange = maxRange;
    this.distanceTravelled = 0;
    this.radius = 9;
    this.returning = false;
    this.hitEnemyIdsOut = new Set();
    this.hitEnemyIdsBack = new Set();
    this.isDead = false;
  }

  update(deltaSeconds, enemies, onHit, player) {
    if (this.isDead) return;
    const travel = this.speed * deltaSeconds;

    if (this.returning) {
      const deltaX = player.x - this.x;
      const deltaY = player.y - this.y;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance <= travel + this.radius) {
        this.isDead = true;
        return;
      }
      this.x += (deltaX / distance) * travel;
      this.y += (deltaY / distance) * travel;
    } else {
      const step = Math.min(travel, this.maxRange - this.distanceTravelled);
      this.x += this.directionX * step;
      this.y += this.directionY * step;
      this.distanceTravelled += step;
    }

    const hitSet = this.returning ? this.hitEnemyIdsBack : this.hitEnemyIdsOut;
    enemies.forEach((enemy) => {
      if (enemy.isDead || hitSet.has(enemy.id)) return;
      if (Math.hypot(enemy.x - this.x, enemy.y - this.y) > enemy.radius + this.radius) return;
      hitSet.add(enemy.id);
      onHit(enemy, this.damage);
    });

    if (!this.returning && this.distanceTravelled >= this.maxRange) {
      this.returning = true;
    }
  }

  draw(context) {
    if (this.isDead) return;
    context.save();
    context.translate(this.x, this.y);
    context.rotate(this.returning ? Math.PI : 0);
    context.fillStyle = "#c5c9d0";
    context.strokeStyle = "#59616c";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-11, -7);
    context.lineTo(8, -4);
    context.lineTo(12, 0);
    context.lineTo(8, 4);
    context.lineTo(-11, 7);
    context.lineTo(-5, 0);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }
};

window.DamageNumber = class DamageNumber {
  constructor(text, x, y, color) {
    this.text = String(text);
    this.x = x;
    this.y = y;
    this.color = color;
    this.life = 0.65;
    this.maxLife = this.life;
  }

  update(deltaSeconds) {
    this.life -= deltaSeconds;
    this.y -= 28 * deltaSeconds;
  }

  draw(context) {
    if (this.life <= 0) return;
    context.save();
    context.globalAlpha = Math.min(1, this.life / 0.18);
    context.fillStyle = this.color;
    context.font = "700 14px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = "#111111";
    context.shadowBlur = 3;
    context.fillText(this.text, this.x, this.y);
    context.restore();
  }
};
