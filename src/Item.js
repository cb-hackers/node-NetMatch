/**
 * @fileOverview Sisältää {@link Item}-luokan toteutuksen.
 */

"use strict";

/**#nocode+*/
var log = require('./Utils').log
  , NET = require('./Constants').NET;
/**#nocode-*/

/**
 * Luo uuden tavaran ja etsii sille paikan. Lisää tavaran Server.items listaan
 * @class Tavaroiden toteutus
 *
 * @param {Server} server  Käynnissä oleva NetMatch-palvelin
 * @param {Map} map        Kartta johon uusi tavara luodaan
 * @param {Byte} itemId    Tavaran tunnus
 * @param {Byte} itemType  Tavaran tyyppi, kts. {@link ITM}
 *
 * @property {Byte} id    Tavaran tunnus
 * @property {Byte} type  Tavaran tyyppi, kts. {@link ITM}
 * @property {Number} x   Tavaran sijainti
 * @property {Number} y   Tavaran sijainti
 */
function Item(server, map, itemId, itemType) {
  var randX, randY;

  this.server = server;

  this.id = itemId;
  this.type = itemType;

  var randomPlace = map.findSpot();

  this.x = randomPlace.x;
  this.y = randomPlace.y;

  server.items[itemId] = this;
}

/**
 * Siirtää tavaran toiseen paikkaan ja palauttaa siirretyn tavaran tyypin.
 * Lähettää kaikille clienteille tiedon uudesta sijainnista.
 * @see ITM
 *
 * @returns {Byte}  Siirretyn tavaran tyyppi
 */
Item.prototype.pick = function () {
  var randomPlace = this.server.gameState.map.findSpot();

  this.x = randomPlace.x;
  this.y = randomPlace.y;

  this.server.messages.addToAll({
    msgType: NET.ITEM,
    itemId: this.id,
    itemType: this.type,
    x: this.x,
    y: this.y
  });

  return this.type;
};

module.exports = Item;
