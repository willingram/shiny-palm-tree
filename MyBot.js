const hlt = require("./hlt");
const { Direction, Position } = require("./hlt/positionals");
const logging = require("./hlt/logging");

const targets = {};

const game = new hlt.Game();
game.initialize().then(async () => {
  // At this point "game" variable is populated with initial map data.
  // This is a good place to do computationally expensive start-up pre-processing.
  // As soon as you call "ready" function below, the 2 second per turn timer will start.
  await game.ready("MyJavaScriptBot");

  logging.info(`My Player ID is ${game.myId}.`);

  while (true) {
    await game.updateFrame();

    const { gameMap, me } = game;

    const commandQueue = [];

    const ships = me.getShips();

    ships.forEach(ship => {
      if (ship.position.equals(me.shipyard.position)) {
        targets[ship.id] = new Position(
          Math.floor(gameMap.width * Math.random()),
          Math.floor(gameMap.height * Math.random())
        ); // generate direction
        logging.info("ship at yard");
      } else if (ship.position.equals(targets[ship.id])) {
        targets[ship.id] = new Position(
          Math.floor(gameMap.width * Math.random()),
          Math.floor(gameMap.height * Math.random())
        ); // generate direction
        logging.info("rerouting ship");
      }
    });

    for (const ship of ships) {
      if (ship.haliteAmount > hlt.constants.MAX_HALITE / 2) {
        const destination = me.shipyard.position;
        const safeMove = gameMap.naiveNavigate(ship, destination);
        commandQueue.push(ship.move(safeMove));
      } else if (
        gameMap.get(ship.position).haliteAmount <
        hlt.constants.MAX_HALITE / 10
      ) {
        // const direction = Direction.getAllCardinals()[
        //   Math.floor(4 * Math.random())
        // ];
        // const destination = ship.position.directionalOffset(direction);
        // const safeMove = gameMap.naiveNavigate(ship, destination);
        const safeMove = gameMap.naiveNavigate(ship, targets[ship.id]);
        commandQueue.push(ship.move(safeMove));
      }
    }

    // check for blockages :)
    const directions = Direction.getAllCardinals();
    let baseBlocked = gameMap.get(me.shipyard).isOccupied;
    for (const direction of directions) {
      baseBlocked =
        baseBlocked &&
        !gameMap.get(me.shipyard.position.directionalOffset(direction))
          .isOccupied;
    }
    if (baseBlocked) logging.error("base blocked!");

    if (
      game.turnNumber < 0.75 * hlt.constants.MAX_TURNS &&
      me.haliteAmount >= hlt.constants.SHIP_COST &&
      !gameMap.get(me.shipyard).isOccupied
    ) {
      let x = me.shipyard.spawn();
      logging.info("spawning");
      commandQueue.push(x);
    }

    await game.endTurn(commandQueue);
  }
});
