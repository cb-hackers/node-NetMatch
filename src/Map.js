/**
 * @fileOverview Sisältää {@link Map}-luokan toteutuksen.
 */

/**#nocode+*/
var log = require('./Utils').log
  , rand = require('./Utils').rand
  , path = require('path')
  , cjson = require('cjson')
  , argv = require('optimist')
    .default({p : 1337, a : undefined})
    .alias({'p' : 'port', 'a' : 'address', 'd' : 'debug'})
    .argv;
/**#nocode-*/

/**
 * Lataa uuden kartan.
 * @class Karttaluokka
 *
 * @param {String} name  Kartan nimi, joka ladataan (esim. Luna)
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
 * @property {Integer} tileWidth              Yhden tilen leveys pikseleissä
 * @property {Integer} tileHeight             Yhden tilen korkeus pikseleissä
 * @property {Integer} width                  Kartan leveys
 * @property {Integer} height                 Kartan korkeus
 * @property {Array}   data                   Törmäyskerroksen data kaksiulotteisessa xy-taulukossa
*/
function Map(name) {
  var filePath = path.resolve(__dirname, '..', 'maps', name + '.json')
    , data;

  this.loaded = false;

  if (!path.existsSync(filePath)) {
    log.error('Map "%0" doesn\'t exist in "%1"', name, filePath);
    return;
  }

  log.info('Loading map "%0" from "%1"', name, filePath);
  data = cjson.load(filePath);
  // Laajennetaan tämän kartan ominaisuuksia ladatulla json-tiedostolla
  cjson.extend(this, data);

  this.loaded = true;
}

/**
 * Törmätäänkö kartan hit-kerrokseen annetuissa pelikoordinaateissa.
 *
 * @param {Number} x  Tarkistettava x-koordinaatti pelikoordinaateissa
 * @param {Number} y  Tarkistettava y-koordinaatti pelikoordinaateissa
 */
Map.prototype.isColliding = function (x, y) {
  var tileX = Math.ceil((x + this.width * this.tileWidth / 2) / this.tileWidth) - 1
    , tileY = Math.ceil((-y + this.height * this.tileHeight / 2) / this.tileHeight) - 1;

  if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
    // Ollaan kartan ulkopuolella, eli törmätään.
    return true;
  }

  if (argv.d) {
    if ('undefined' === typeof this.data ||
        'undefined' === typeof this.data[tileY] ||
        'undefined' === typeof this.data[tileY][tileX] ) {
      log.error('Map.data[%0][%1] is undefined', tileY, tileX);
    }
  }

  // Nyt tarkistetaan että ollaanko seinän sisällä
  if (this.data[tileY][tileX]) {
    return true;
  }

  // Jos päästiin tänne asti niin ei olla törmätty
  return false;
}

/**
 * Etsii satunnaisen paikan kartalta, joka ei ole seinän sisällä, ja palauttaa kyseisen paikan
 * koordinaatit objektissa, jolla on kentät x ja y.
 *
 * @returns {Object}  Objekti, jolla on kentät x ja y, jotka ovat löydetyn paikan koordinaatit
 */
Map.prototype.findSpot = function () {
  var randTileX, randTileY, returnObj = {};
  // Etsitään vapaata paikkaa kartalta "vain" 10 000 kertaa
  for (var i = 9999; --i;) {
    randTileX = rand(0, this.width - 1);
    randTileY = rand(0, this.height - 1);
    if (!this.data[randTileY][randTileX]) {
      // Ei ollut seinän sisällä
      returnObj.x = (randTileX * this.tileWidth) - (this.width * this.tileWidth) / 2;
      returnObj.y = -((randTileY * this.tileHeight) - (this.height * this.tileHeight) / 2);
      break;
    }
  }
  return returnObj;
}

exports.Map = Map;