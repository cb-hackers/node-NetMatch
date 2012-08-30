/**
 * @fileOverview Sisältää {@link Map}-luokan toteutuksen.
 */

"use strict";

/**#nocode+*/
var log = require('./Utils').log
  , rand = require('./Utils').rand
  , truncateNumber = require('./Utils').truncateNumber
  , distance = require('./Utils').distance
  , path = require('path')
  , fs = require('fs')
  , cjson = require('cjson')
  , colors = require('colors')
  , Item = require('./Item')
  , ITM = require('./Constants').ITM
  , PLR = require('./Constants').PLR
  , NET = require('./Constants').NET
  , DRAW = require('./Constants').DRAW;
/**#nocode-*/

/**
 * Lataa uuden kartan.
 * @class Karttaluokka
 *
 * @param {Server} server  Tämän kartan NetMatch-palvelin
 * @param {String} name    Kartan nimi, joka ladataan (esim. Luna)
 *
 * @property {Boolean} loaded                 Ladattiinko kartta onnistuneesti
 * @property {String}  name                   Kartan nimi
 * @property {String}  author                 Kartan tekijä
 * @property {String}  crc32                  Kartan CRC32-tunniste, jota tarvitaan CoolBasicin puolella
 * @property {Object}  config                 Kartan asetukset sisältävä objekti
 * @property {Integer} config.maxPlayers      Maksimipelaajat
 * @property {Integer} config.botCount        Bottien määrä
 * @property {Integer} config.botDepartLimit  Kun pelaajamäärä ylittää tämän arvon, poistuu botti pelistä
 * @property {Array}   config.botNames        Bottien nimet
 * @property {Array}   config.botWeapons      Bottien aseet (1 = pistooli, 2 = konepistooli, 3 = sinko,
 *                                            4 = haulikko, 5 = kranaatinlaukaisin, 6 = moottorisaha)
 * @property {Integer} config.healthItems     Lääkintäpakkausten määrä
 * @property {Integer} config.mgunItems       Konekiväärin ammuslaatikoiden määrä
 * @property {Integer} config.bazookaItems    Singon rakettilaatikoiden määrä
 * @property {Integer} config.shotgunItems    Haulikon haulilaatikoiden määrä
 * @property {Integer} config.launcherItems   Kranaatinlaukaisimen kranaattilaatikoiden määrä
 * @property {Integer} config.chainsawItems   Moottirisahan bensakanistereiden määrä
 * @property {Integer} tileSize               Yhden tilen leveys/korkeus pikseleissä
 * @property {Integer} width                  Kartan leveys
 * @property {Integer} height                 Kartan korkeus
 * @property {Array}   data                   Törmäyskerroksen data yksiulotteisessa taulukossa
*/
function Map(server, name) {
  var filePath = path.resolve(__dirname, '..', 'maps', name + '.json')
    , data, buffer, uint8View;

  this.server = server;
  this.loaded = false;

  if (!fs.existsSync(filePath)) {
    log.error('Map %0 doesn\'t exist in %1', name.green, filePath.green);
    return;
  }

  log.info('Loading map %0 from %1', name.green, filePath.green);
  data = cjson.load(filePath);
  // Laajennetaan tämän kartan ominaisuuksia ladatulla json-tiedostolla
  cjson.extend(this, data);

  // Muunnetaan törmäyskerroksen data 8-bittiseksi, yksiulotteiseksi taulukoksi
  buffer = new ArrayBuffer(this.width * this.height);
  uint8View = new Uint8Array(buffer);
  for (var y = 0; y < this.height; ++y) {
    for (var x = 0; x < this.width; ++x) {
      var index = y * this.width + x;
      uint8View[index] = this.data[y][x];
    }
  }
  this.data = uint8View;

  this.loaded = true;
}

/**
 * Törmätäänkö kartan hit-kerrokseen annetuissa pelikoordinaateissa.
 *
 * @param {Number} x  Tarkistettava x-koordinaatti pelikoordinaateissa
 * @param {Number} y  Tarkistettava y-koordinaatti pelikoordinaateissa
 */
Map.prototype.isColliding = function (x, y) {
  var tileX = Math.ceil((x + this.width * this.tileSize / 2) / this.tileSize) - 1
    , tileY = Math.ceil((-y + this.height * this.tileSize / 2) / this.tileSize) - 1
    , index;

  if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
    // Ollaan kartan ulkopuolella, eli törmätään.
    return true;
  }

  // Lasketaan tilen paikka yksiulotteisessa taulukossa
  index = tileY * this.width + tileX;

  if (this.server.debug) {
    if ('undefined' === typeof this.data || 'undefined' === typeof this.data[index]) {
      log.error('Map.data[%0] (%1, %2) is undefined', index, tileY, tileX);
    }
  }

  // Nyt tarkistetaan että ollaanko seinän sisällä
  if (this.data[index]) {
    return true;
  }

  // Jos päästiin tänne asti niin ei olla törmätty
  return false;
};

/**
 * Etsii satunnaisen paikan kartalta, joka ei ole seinän sisällä, ja palauttaa kyseisen paikan
 * koordinaatit objektissa, jolla on kentät x ja y.
 *
 * @returns {Object}  Objekti, jolla on kentät x ja y, jotka ovat löydetyn paikan koordinaatit
 */
Map.prototype.findSpot = function () {
  var randTileX, randTileY, index, returnObj = {};
  // Etsitään vapaata paikkaa kartalta "vain" 10 000 kertaa
  for (var i = 9999; --i;) {
    randTileX = rand(0, this.width - 1);
    randTileY = rand(0, this.height - 1);
    // Lasketaan tilen paikka yksiulotteisessa taulukossa
    index = randTileY * this.width + randTileX;

    if (!this.data[index]) {
      // Ei ollut seinän sisällä
      returnObj.x = (randTileX * this.tileSize)
                  - (this.width * this.tileSize) / 2
                  + this.tileSize / 2;
      returnObj.y = -((randTileY * this.tileSize)
                  - (this.height * this.tileSize) / 2
                  + this.tileSize / 2);
      break;
    }
  }
  return returnObj;
};

/**
 * Alustaa kartalla olevat tavarat.
 */
Map.prototype.initItems = function () {
  var i, itemId = 0;

  if (this.server.gameState.gameMode === 3) {
    // Zombie-moodissa on 20 hp-pakettia ja 50 kpl haulikon ja konekiväärin ammuslootia
    for (i = 0; i < 20; i++) {
      itemId++;
      this.server.items[itemId] = new Item(this.server, this, itemId, ITM.HEALTH);
    }
    for (i = 0; i < 50; i++) {
      itemId++;
      this.server.items[itemId] = new Item(this.server, this, itemId, ITM.AMMO);
    }
    for (i = 0; i < 50; i++) {
      itemId++;
      this.server.items[itemId] = new Item(this.server, this, itemId, ITM.SHOTGUN);
    }
  } else {
    for (i = 0; i < this.config.healthItems; i++) {
      itemId++;
      this.server.items[itemId] = new Item(this.server, this, itemId, ITM.HEALTH);
    }
    for (i = 0; i < this.config.mgunItems; i++) {
      itemId++;
      this.server.items[itemId] = new Item(this.server, this, itemId, ITM.AMMO);
    }
    for (i = 0; i < this.config.bazookaItems; i++) {
      itemId++;
      this.server.items[itemId] = new Item(this.server, this, itemId, ITM.ROCKET);
    }
    for (i = 0; i < this.config.shotgunItems; i++) {
      itemId++;
      this.server.items[itemId] = new Item(this.server, this, itemId, ITM.SHOTGUN);
    }
    for (i = 0; i < this.config.launcherItems; i++) {
      itemId++;
      this.server.items[itemId] = new Item(this.server, this, itemId, ITM.LAUNCHER);
    }
    for (i = 0; i < this.config.chainsawItems; i++) {
      itemId++;
      this.server.items[itemId] = new Item(this.server, this, itemId, ITM.FUEL);
    }
  }
};

/**
 * Etsii annettujen koordinaattien ja kulman muodostavalta suoralta annetulta maksimietäisyydeltä
 * seinän koordinaatit ja palauttaa ne objektin kenttinä x ja y. Jos seinää ei löytynyt ennen
 * maksimietäisyyden saavuttamista, ei funktio palauta mitään arvoa.
 *
 * @param {Number} x       Aloituspisteen x-koordinaatti maailmankoordinaateissa
 * @param {Number} y       Aloituspisteen y-koordinaatti maailmankoordinaateissa
 * @param {Number} angle   Mihin suuntaan suora muodostuu (asteina)
 * @param {Number} [dist]  Kuinka pitkältä katsotaan. Jos tätä ei anneta, niin etäisyyttä ei
 *                         rajoiteta.
 *
 * @returns {Object}  Palauttaa objektin jolla on kentät x ja y jotka sisältävät maksimietäisyyden
 *                    sisältä löytyneen seinän törmäyskoordinaatit. Tätä ei palauteta, jos ei
 *                    löytynyt seinää.
 */
Map.prototype.findWall = function (x, y, angle, dist) {
  var startP = {}, endP = {}, returnP;

  // Tarkistetaan etäisyys
  if ('number' !== typeof dist) {
    dist = (this.width + this.height) * this.tileSize;
  }

  // Muunnetaan x ja y maailmankoordinaateista "näyttökoordinaateiksi"
  startP.x = x + this.width * this.tileSize / 2;
  startP.y = -y + this.height * this.tileSize / 2;

  // Lasketaan loppupiste
  endP.x = startP.x + Math.cos((-angle / 180) * Math.PI) * dist;
  endP.y = startP.y + Math.sin((-angle / 180) * Math.PI) * dist;

  // Suoritetaan raycast
  returnP = this.rayCast(startP, endP);

  if (!returnP) {
    // Välissä ei ollut seinää, ei palauteta mitään.
    //console.log("No hits with raycast");
    return;
  }

  // Muunnetaan "näyttökoordinaatit" maailmankoordinaateiksi
  returnP.x = returnP.x - (this.width * this.tileSize / 2);
  returnP.y = (this.height * this.tileSize / 2) - returnP.y;

  // Palautetaan piste
  return returnP;
};

/**
 * Tarkistaa onko annettujen koordinaattien välillä seinää ja jos väliltä löytyy seinä,
 * palauttaa funktio ne objektin kenttinä x ja y.
 *
 * @param {Number} x1  Alkupisteen x-koordinaatti
 * @param {Number} y1  Alkupisteen y-koordinaatti
 * @param {Number} x2  Loppupisteen x-koordinaatti
 * @param {Number} y2  Loppupisteen y-koordinaatti
 *
 * @returns {Object}  Palauttaa objektin jolla on kentät x ja y jotka sisältävät lähimmän seinän
 *                    koordinaatit.
 */
Map.prototype.findWall2 = function (x1, y1, x2, y2) {
  var startP = {}, endP = {}, returnP;

  // Muunnetaan x ja y maailmankoordinaateista "näyttökoordinaateiksi"
  startP.x = x1 + this.width * this.tileSize / 2;
  startP.y = -y1 + this.height * this.tileSize / 2;
  endP.x = x2 + this.width * this.tileSize / 2;
  endP.y = -y2 + this.height * this.tileSize / 2;

  // Suoritetaan raycast
  returnP = this.rayCast(startP, endP);

  if (!returnP) {
    // Välissä ei ollut seinää, ei palauteta mitään.
    //console.log("No hits with raycast");
    return;
  }

  // Muunnetaan "näyttökoordinaatit" maailmankoordinaateiksi
  returnP.x = returnP.x - (this.width * this.tileSize / 2);
  returnP.y = (this.height * this.tileSize / 2) - returnP.y;

  // Palautetaan piste
  return returnP;
};

/**
 * Tekee raycastin kahden pisteen välillä ja palauttaa kohdan, jossa pisteiden välillä kulkeva
 * suora osuu ensimmäisen kerran seinään.
 * @private
 *
 * @param {Object} origP1  Alkupiste, jolla on kentissä x ja y koordinaatit
 * @param {Object} origP2  Loppupiste, jolla on kentissä x ja y koordinaatit
 *
 * @returns {Object}  Ensimmäinen vastaan tullut seinä ja tarkka osumakohta. Jos pisteiden välillä
 *                    ei ollut seinää, ei funktio palauta mitään.
 */
Map.prototype.rayCast = function (origP1, origP2) {
  // Pisteiden normalisaatio
  var p1 = {x: origP1.x / this.tileSize, y: origP1.y / this.tileSize}
    , p2 = {x: origP2.x / this.tileSize, y: origP2.y / this.tileSize}
    // Seuraavien muuttujien kommentointi löytyy myöhemmin funktiossa
    , stepX, stepY
    , rayDirX, rayDirY
    , ratioX, ratioY
    , deltaX, deltaY
    , testTile
    , maxX, maxY
    , endTile
    , hit
    , colP
    , index;

  // Ylitetäänkö minkään laatan rajoja
  if (truncateNumber(p1.x) === truncateNumber(p2.x) && truncateNumber(p1.y) === truncateNumber(p2.y)) {
    // Ei ylitä minkään laatan rajoja, joten ei voi olla törmäystä.
    return;
  }

  // Kumpaan suuntaan mennään x- ja y-suunnassa
  stepX = (p2.x > p1.x) ? 1 : -1;
  stepY = (p2.y > p1.y) ? 1 : -1;

  // Säteen suunta
  rayDirX = p2.x - p1.x;
  rayDirY = p2.y - p1.y;

  // Kuinka pitkälle liikutaan kummallakin akselilla kun toisella akselilla hypätään seuraavaan
  // kokonaiseen tileen
  ratioX = rayDirX / rayDirY;
  ratioY = rayDirY / rayDirX;

  // Muutos x- ja y-suunnassa
  deltaY = Math.abs(p2.x - p1.x);
  deltaX = Math.abs(p2.y - p1.y);

  // Alustetaan testiä varten käytettävät kokonaislukumuuttujat alkutilekoordinaatteihin
  // Huom: Käytetään normalisoituja versioita pisteestä origP1
  testTile = {x: truncateNumber(p1.x), y: truncateNumber(p1.y)};

  // Alustetaan ei-kokonaislukuhyppäys liikkumalla seuraavan tilen reunalle ja jakamalla saatu
  // arvo vastakkaisen akselin kokonaisluvulla.
  // Jos liikutaan positiiviseen suuntaan, siirrytään nykyisen tilen päähän, muulloin alkuun.
  if (stepX > 0) {
    maxX = deltaX * (1.0 - (p1.x % 1));
  } else {
    maxX = deltaX * (p1.x % 1);
  }
  if (stepY > 0) {
    maxY = deltaY * (1.0 - (p1.y % 1));
  } else {
    maxY = deltaY * (p1.y % 1);
  }

  // Lopputile
  endTile = {x: truncateNumber(p2.x), y: truncateNumber(p2.y)};

  // Nyt liikutaan!
  hit = 0;
  colP = {x: 0.0, y: 0.0};

  while (testTile.x !== endTile.x || testTile.y !== endTile.y) {
    if (maxX < maxY) {
      maxX += deltaX;
      testTile.x += stepX;

      if (testTile.x < 0 || testTile.x >= this.width || testTile.y < 0 || testTile.y >= this.height) {
        // Ollaan kartan ulkopuolella, eli törmätään.
        hit = 1;
      } else {
        // Lasketaan tilen paikka yksiulotteisessa taulukossa
        index = testTile.y * this.width + testTile.x;
        // Tarkistetaan onko tilekerroksessa hit-dataa
        hit = this.data[index];
      }
      if (hit) {
        // Raycast löysi törmäyksen
        colP.x = testTile.x;
        if (stepX < 0) { colP.x += 1.0; } // Jos mennään vasemmalle päin, lisätään yksi.
        colP.y = p1.y + ratioY * (colP.x - p1.x);
        colP.x *= this.tileSize; // Skaalataan törmäyspiste ylöspäin
        colP.y *= this.tileSize;
        // Palautetaan osumapiste
        return colP;
      }
    } else {
      maxY += deltaY;
      testTile.y += stepY;

      if (testTile.x < 0 || testTile.x >= this.width || testTile.y < 0 || testTile.y >= this.height) {
        // Ollaan kartan ulkopuolella, eli törmätään.
        hit = 0;
      } else {
        // Lasketaan tilen paikka yksiulotteisessa taulukossa
        index = testTile.y * this.width + testTile.x;
        // Tarkistetaan onko tilekerroksessa hit-dataa
        hit = this.data[index];
      }
      if (hit) {
        // Raycast löysi törmäyksen
        colP.y = testTile.y;
        if (stepY < 0) { colP.y += 1.0; } // Jos mennään ylöspäin, lisätään yksi.
        colP.x = p1.x + ratioX * (colP.y - p1.y);
        colP.x *= this.tileSize; // Skaalataan törmäyspiste ylöspäin
        colP.y *= this.tileSize;
        // Palautetaan osumapiste
        return colP;
      }
    }
  }

  // Jos tänne asti ollaan päästy, niin törmäystä ei ole löydetty. Ei siis palauteta mitään.
};


/**
 * Ympyrä-tilekartta törmäys.
 *
 * @see http://stackoverflow.com/a/402010/1152564
 *
 * @param {Number} x  Ympyrän keskipisteen x-koordinaatti maailmankoordinaateissa
 * @param {Number} y  Ympyrän keskipisteen y-koordinaatti maailmankoordinaateissa
 * @param {Number} r  Ympyrän säteen pituus
 *
 * @return {Object}  Objektilla on kentät "left", "right", "up" ja/tai "down". Jos kentän arvo on
 *                   tosi, niin siitä suunnasta löytyy törmäys.
 */
Map.prototype.circleCollision = function (x, y, r) {
  var tileX, tileY, leftTileX, rightTileX, upTileY, downTileY
    , circleDistance
    , ret = {left: false, right: false, up: false, down: false};


  // Muunnetaan x ja y maailmankoordinaateista "näyttökoordinaateiksi"
  x = x + this.width * this.tileSize / 2;
  y = -y + this.height * this.tileSize / 2;

  // Otetaan ylös tilekoordinaatit nykyisestä tilestä sekä viereisistä
  tileX = Math.floor(x / this.tileSize);
  tileY = Math.floor(y / this.tileSize);
  leftTileX = tileX - 1;
  rightTileX = tileX + 1;
  upTileY = tileY - 1;
  downTileY = tileY + 1;

  // Tarkistetaan törmäykset kaikkiin nykyistä tileä ympäröiviin kahdeksaan tileen.
  // Aloitetaan vasemmalta ylhäältä ja mennään vasemmalta oikealla, ylhäältä alas.
  if (this.checkCircleCollision(x, y, r, leftTileX, upTileY)) {
    ret.left = true;
    ret.up = true;
  }
  if (this.checkCircleCollision(x, y, r, tileX, upTileY)) {
    ret.up = true;
  }
  if (this.checkCircleCollision(x, y, r, rightTileX, upTileY)) {
    ret.right = true;
    ret.up = true;
  }
  if (this.checkCircleCollision(x, y, r, leftTileX, tileY)) {
    ret.left = true;
  }
  if (this.checkCircleCollision(x, y, r, rightTileX, tileY)) {
    ret.right = true;
  }
  if (this.checkCircleCollision(x, y, r, leftTileX, downTileY)) {
    ret.left = true;
    ret.down = true;
  }
  if (this.checkCircleCollision(x, y, r, tileX, downTileY)) {
    ret.down = true;
  }
  if (this.checkCircleCollision(x, y, r, rightTileX, downTileY)) {
    ret.right = true;
    ret.down = true;
  }

  // Suoritetaan tarkastus vielä nykyiseen tileen
  if (this.checkCircleCollision(x, y, r, tileX, tileY)) {
    ret.right = true;
    ret.left = true;
    ret.up = true;
    ret.down = true;
  }
  return ret;
};

/**
 * @private
 */
Map.prototype.checkCircleCollision = function (x, y, r, tileX, tileY) {
  var hit, index, halfTile, circleDist, cornedDist_sq;

  if (tileX < 0 || tileY < 0 || tileX >= this.width || tileY >= this.height) {
    // Jos tilekoordinaatti on kartan rajojen ulkopuolella, lasketaan törmäys siihen.
    hit = 1;
  } else {
    // Muulloin tarkastetaan törmäysdata tiledatasta.
    index = tileY * this.width + tileX;
    hit = this.data[index];
  }

  // Jos tilessä ei ole törmäystä asetettuna, voidaan tarkastus jättää jo tässä vaiheessa sikseen.
  if (!hit) {
    return false;
  }

  // Alustetaan joitakin muuttujia
  circleDist = {};
  halfTile = this.tileSize / 2;

  // Tästä lähtee http://stackoverflow.com/a/402010/1152564
  circleDist.x = Math.abs(x - (tileX * this.tileSize) - halfTile);
  circleDist.y = Math.abs(y - (tileY * this.tileSize) - halfTile);

  if (circleDist.x > (halfTile + r)) { return false; }
  if (circleDist.y > (halfTile + r)) { return false; }

  if (circleDist.x <= halfTile) { this.debugBox(tileX, tileY); return true; }
  if (circleDist.y <= halfTile) { this.debugBox(tileX, tileY); return true; }

  /*
  cornedDist_sq = Math.pow(circleDist.x - halfTile, 2) + Math.pow(circleDist.y - halfTile, 2);

  if (cornedDist_sq <= Math.pow(r, 2)) {
    this.debugBox(tileX, tileY);
    return true;
  }
  */

  return false;
};

/**
 * Piirtää boksin tilen paikalle.
 * @param {Integer} tileX
 * @param {Integer} tileY
 * @param {Boolean} [fill=false]  Piirretäänkö täytetty boksi
 */
Map.prototype.debugBox = function (tileX, tileY, fill) {
  var boxX, boxY, self = this;
  if (!this.server.debug) { return; }
  if ('boolean' !== typeof fill) { fill = false; }

  boxX = tileX * this.tileSize - (this.width * this.tileSize / 2);
  boxY = (this.height * this.tileSize / 2) - tileY * this.tileSize;

  this.server.loopPlayers(function (player) {
    if (player.debugState && player.debugState < 20) {
      player.debugState += 1;
      self.server.messages.add(player.id, {
        msgType: NET.DEBUGDRAWING,
        drawType: DRAW.BOX,
        drawVars: [
          boxX,
          boxY,
          self.tileSize,
          self.tileSize,
          fill
        ]
      });
    }
  });
};

module.exports = Map;
