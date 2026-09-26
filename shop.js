(() => {
  const COIN_DROPS = Object.freeze({
    BASIC: 1,
    FAST: 1,
    ELITE: 3,
    BOSS: 5,
  });
  const SHOP_PRICES = [3, 5, 7];

  window.RunCurrency = class RunCurrency {
    constructor() {
      this.amount = 0;
      this.drops = [];
      this.nextDropId = 1;
    }

    dropForEnemy(enemy, luckyCoinLevel = 0) {
      const baseValue = COIN_DROPS[enemy.type] || 0;
      if (baseValue <= 0) return;
      const doubled = Math.random() < Math.min(1, luckyCoinLevel * 0.1);
      const value = baseValue * (doubled ? 2 : 1);
      this.drops.push({
        id: this.nextDropId,
        x: enemy.x,
        y: enemy.y,
        value,
        doubled,
        radius: doubled ? 9 : 7,
      });
      this.nextDropId += 1;
    }

    collectNearby(player) {
      let collected = 0;
      this.drops = this.drops.filter((drop) => {
        if (Math.hypot(drop.x - player.x, drop.y - player.y) > player.stats.pickupRange + drop.radius) {
          return true;
        }
        collected += drop.value;
        return false;
      });
      this.amount += collected;
      return collected;
    }

    clearRoomDrops() {
      this.drops = [];
    }

    spend(amount) {
      if (amount > this.amount) return false;
      this.amount -= amount;
      return true;
    }

    draw(context) {
      this.drops.forEach((drop) => {
        context.beginPath();
        context.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
        context.fillStyle = "#e8bd55";
        context.fill();
        context.strokeStyle = "#fff0aa";
        context.lineWidth = 2;
        context.stroke();
        context.fillStyle = "#73571f";
        context.font = "700 9px system-ui, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(drop.doubled ? "2¢" : "¢", drop.x, drop.y + 0.5);
      });
    }
  };

  window.ShopSystem = class ShopSystem {
    createOffers(upgrades, weapons) {
      return upgrades.getChoices(weapons).map((choice, index) => ({
        choice,
        price: SHOP_PRICES[index],
        purchased: false,
      }));
    }
  };
})();
