/**
 * @fileOverview Sisältää {@link Item}-luokan toteutuksen.
 */
/**#nocode+*/
var log = require('./Utils').log
  , NET = require('./Constants').NET
  , ITEM = require('./Constants').ITEM;
/**#nocode-*/

/**
 * Luo uuden tavaran ja etsii sille paikan. Lisää tavaran Server.items listaan
 * @class Tavaroiden toteutus
 *
 * @param {Server} server  Käynnissä oleva NetMatch-palvelin
 * @param {Byte} itemId    Tavaran tunnus
 * @param {Byte} itemType  Tavaran tyyppi, kts. {@link Constants#ITEM}
 *
 * @property {Byte} id    Tavaran tunnus
 * @property {Byte} type  Tavaran tyyppi, kts. {@link Constants#ITEM}
 * @property {Number} x   Tavaran sijainti
 * @property {Number} y   Tavaran sijainti
 */
function Item(server, itemId, itemType) {
  var map = server.gameState.map
    , randX
    , randY;

  this.id = itemId;
  this.type = itemType;

  var randomPlace = map.findSpot();

  this.x = randomPlace.x;
  this.y = randomPlace.y;

  server.items[itemId] = this;
}

exports = module.exports = Item;