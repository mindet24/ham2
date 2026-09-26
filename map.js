window.MiniMap = class MiniMap {
  draw(context, roomSystem, viewportWidth, viewportHeight) {
    const margin = Math.min(16, Math.max(8, viewportWidth * 0.025));
    const panelWidth = Math.min(300, Math.max(128, viewportWidth * 0.4));
    const panelHeight = Math.min(190, Math.max(108, viewportHeight * 0.32));
    const left = Math.max(margin, viewportWidth - panelWidth - margin);
    const top = margin;
    const graph = roomSystem.layers;
    const innerLeft = left + 14;
    const innerTop = top + 37;
    const innerWidth = Math.max(1, panelWidth - 28);
    const innerHeight = Math.max(1, panelHeight - 50);
    const positions = new Map();

    context.save();
    context.fillStyle = "rgba(16, 18, 24, 0.92)";
    context.strokeStyle = "#49443a";
    context.lineWidth = 1;
    context.fillRect(left, top, panelWidth, panelHeight);
    context.strokeRect(left, top, panelWidth, panelHeight);

    context.fillStyle = "#f2ead7";
    context.font = "600 12px system-ui, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(`MAP  ·  ${roomSystem.getCurrentRoom().depth}/${roomSystem.routeLength}`, left + 12, top + 19);

    graph.forEach((layer, layerIndex) => {
      const x = graph.length <= 1
        ? innerLeft + innerWidth / 2
        : innerLeft + (layerIndex / (graph.length - 1)) * innerWidth;
      layer.forEach((room, rowIndex) => {
        const y = layer.length <= 1
          ? innerTop + innerHeight / 2
          : innerTop + ((rowIndex + 0.5) / layer.length) * innerHeight;
        positions.set(room.id, { x, y });
      });
    });

    graph.flat().forEach((room) => {
      const start = positions.get(room.id);
      room.nextRoomIds.forEach((nextRoomId) => {
        const end = positions.get(nextRoomId);
        const isExploredEdge = roomSystem.visitedRoomIds.has(room.id)
          && roomSystem.visitedRoomIds.has(nextRoomId);
        const isAvailableEdge = room.id === roomSystem.getCurrentRoom().id
          && !roomSystem.isCurrentRoomLocked();
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.strokeStyle = isExploredEdge
          ? "#cbb56b"
          : isAvailableEdge
            ? "#84744a"
            : "#383a42";
        context.lineWidth = isAvailableEdge ? 1.5 : 1;
        context.stroke();
      });
    });

    graph.flat().forEach((room) => {
      const point = positions.get(room.id);
      const isCurrent = room.id === roomSystem.getCurrentRoom().id;
      const isVisited = roomSystem.visitedRoomIds.has(room.id);
      const isAvailable = !roomSystem.isCurrentRoomLocked()
        && roomSystem.getCurrentRoom().nextRoomIds.includes(room.id);

      context.beginPath();
      context.arc(point.x, point.y, isCurrent ? 5 : 3.5, 0, Math.PI * 2);
      context.fillStyle = isCurrent
        ? "#fff0b3"
        : isVisited
          ? room.color
          : isAvailable
            ? "#d4c18a"
            : "#555761";
      context.fill();

      if (isCurrent) {
        context.strokeStyle = "#0b0d12";
        context.lineWidth = 1.5;
        context.stroke();
      }
    });

    context.restore();
  }
};
