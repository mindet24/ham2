(() => {
  const ROOM_TYPES = Object.freeze({
    SAFE: { key: "SAFE", label: "Safe Room", icon: "🏠", color: "#a7ad9a" },
    COMBAT: { key: "COMBAT", label: "Combat Room", icon: "⚔️", color: "#b76d61" },
    ELITE: { key: "ELITE", label: "Elite Room", icon: "👑", color: "#d3b764" },
    TREASURE: { key: "TREASURE", label: "Treasure Room", icon: "💰", color: "#e4c36b" },
    SHOP: { key: "SHOP", label: "Shop Room", icon: "🎲", color: "#9aa9c0" },
    REST: { key: "REST", label: "Rest Room", icon: "🩹", color: "#92b58d" },
    BOSS: { key: "BOSS", label: "Boss Room", icon: "💀", color: "#cf625b" },
  });

  const RANDOM_ROOM_TYPES = [
    ROOM_TYPES.COMBAT,
    ROOM_TYPES.TREASURE,
    ROOM_TYPES.SHOP,
    ROOM_TYPES.REST,
  ];

  function randomInteger(minimum, maximum) {
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
  }

  function createRoom(type, depth, layerIndex, rowIndex) {
    return {
      id: `room-${depth}-${rowIndex}-${Math.random().toString(36).slice(2, 7)}`,
      type: type.key,
      label: type.label,
      icon: type.icon,
      color: type.color,
      depth,
      layerIndex,
      rowIndex,
      nextRoomIds: [],
      encounterCleared: !["COMBAT", "ELITE", "BOSS"].includes(type.key),
      cleared: false,
    };
  }

  window.RoomSystem = class RoomSystem {
    constructor() {
      this.routeLength = randomInteger(8, 12);
      this.layers = [];
      this.nodes = new Map();
      this.visitedRoomIds = new Set();
      this.generateGraph();
      this.currentRoomId = this.layers[0][0].id;
      this.visitedRoomIds.add(this.currentRoomId);
    }

    generateGraph() {
      const startRoom = createRoom(ROOM_TYPES.SAFE, 1, 0, 0);
      this.layers.push([startRoom]);
      this.nodes.set(startRoom.id, startRoom);

      const intermediateLayerCount = this.routeLength - 2;
      for (let layerIndex = 1; layerIndex <= intermediateLayerCount; layerIndex += 1) {
        const depth = layerIndex + 1;
        const isEliteAvailable = depth / this.routeLength >= 0.5;
        const layerWidth = randomInteger(2, 3);
        const layer = [];

        for (let rowIndex = 0; rowIndex < layerWidth; rowIndex += 1) {
          const availableTypes = isEliteAvailable
            ? [...RANDOM_ROOM_TYPES, ROOM_TYPES.ELITE]
            : RANDOM_ROOM_TYPES;
          const type = availableTypes[randomInteger(0, availableTypes.length - 1)];
          const room = createRoom(type, depth, layerIndex, rowIndex);
          layer.push(room);
          this.nodes.set(room.id, room);
        }

        this.layers.push(layer);
      }

      const bossDepth = this.routeLength;
      const bossRoom = createRoom(ROOM_TYPES.BOSS, bossDepth, this.routeLength - 1, 0);
      this.layers.push([bossRoom]);
      this.nodes.set(bossRoom.id, bossRoom);

      for (let layerIndex = 0; layerIndex < this.layers.length - 1; layerIndex += 1) {
        const currentLayer = this.layers[layerIndex];
        const nextLayer = this.layers[layerIndex + 1];
        currentLayer.forEach((room) => {
          room.nextRoomIds = nextLayer.map((nextRoom) => nextRoom.id);
        });
      }
    }

    getCurrentRoom() {
      return this.nodes.get(this.currentRoomId);
    }

    getAvailableDoors() {
      if (this.isCurrentRoomLocked()) return [];
      return this.getDoorChoices();
    }

    getDoorChoices() {
      return this.getCurrentRoom().nextRoomIds.map((roomId) => this.nodes.get(roomId));
    }

    isCurrentRoomLocked() {
      const room = this.getCurrentRoom();
      return ["COMBAT", "ELITE", "BOSS"].includes(room.type) && !room.encounterCleared;
    }

    markCurrentRoomEncounterCleared() {
      const room = this.getCurrentRoom();
      if (!["COMBAT", "ELITE", "BOSS"].includes(room.type)) return false;
      room.encounterCleared = true;
      return true;
    }

    enterRoom(roomId) {
      if (this.isCurrentRoomLocked()) return false;
      if (!this.getCurrentRoom().nextRoomIds.includes(roomId)) return false;
      this.currentRoomId = roomId;
      this.visitedRoomIds.add(roomId);
      return true;
    }
  };

  window.RoomTypes = ROOM_TYPES;
})();
