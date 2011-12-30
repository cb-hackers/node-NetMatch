/**
 * @fileOverview Sisältää {@link Map}-luokan toteutuksen.
 */

/**#nocode+*/
var log = require('./Utils').log
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
  var tileX = Math.round((x + this.width * this.tileWidth / 2) / this.tileWidth)
    , tileY = Math.round((-y + this.height * this.tileHeight / 2) / this.tileHeight);

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

exports.Map = Map;