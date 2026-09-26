const STARTING_STATS = Object.freeze({
  hp: 100,
  maxHp: 100,
  moveSpeed: 220,
  damage: 1,
  attackSpeed: 1,
  projectileCount: 1,
  pickupRange: 80,
  expGain: 1,
});

const MOVEMENT_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
]);

window.Player = class Player {
  constructor() {
    this.stats = { ...STARTING_STATS };
    this.radius = 14;
    this.x = window.innerWidth / 2;
    this.y = window.innerHeight / 2;
    this.keysDown = new Set();
    this.lastMoveDirection = { x: 0, y: -1 };

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.clearKeys);
  }

  handleKeyDown = (event) => {
    if (!MOVEMENT_KEYS.has(event.code)) return;
    event.preventDefault();
    this.keysDown.add(event.code);
  };

  handleKeyUp = (event) => {
    this.keysDown.delete(event.code);
  };

  clearKeys = () => {
    this.keysDown.clear();
  };

  takeDamage(amount) {
    const previousHp = this.stats.hp;
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    return previousHp - this.stats.hp;
  }

  update(deltaSeconds, viewportWidth, viewportHeight) {
    let directionX = 0;
    let directionY = 0;

    if (this.keysDown.has("KeyA") || this.keysDown.has("ArrowLeft")) directionX -= 1;
    if (this.keysDown.has("KeyD") || this.keysDown.has("ArrowRight")) directionX += 1;
    if (this.keysDown.has("KeyW") || this.keysDown.has("ArrowUp")) directionY -= 1;
    if (this.keysDown.has("KeyS") || this.keysDown.has("ArrowDown")) directionY += 1;

    const magnitude = Math.hypot(directionX, directionY);
    if (magnitude > 0) {
      directionX /= magnitude;
      directionY /= magnitude;
      this.lastMoveDirection = { x: directionX, y: directionY };
      const distance = this.stats.moveSpeed * deltaSeconds;
      this.x += directionX * distance;
      this.y += directionY * distance;
    }

    this.clampToViewport(viewportWidth, viewportHeight);
  }

  clampToViewport(viewportWidth, viewportHeight) {
    const horizontalPadding = Math.min(this.radius, viewportWidth / 2);
    const verticalPadding = Math.min(this.radius, viewportHeight / 2);
    this.x = Math.max(horizontalPadding, Math.min(viewportWidth - horizontalPadding, this.x));
    this.y = Math.max(verticalPadding, Math.min(viewportHeight - verticalPadding, this.y));
  }

  draw(context) {
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    context.fillStyle = "#e6d6a8";
    context.fill();
    context.strokeStyle = "#9b8450";
    context.lineWidth = 2;
    context.stroke();
  }
};
