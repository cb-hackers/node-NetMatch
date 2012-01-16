/**
 * @fileOverview Pitää sisällään asetuksiin liittyvät toiminnot ja oletusasetusten nimiavaruuden.
 * Kts. {@link Config} ja {@link Config.defaults}
 */

/**#nocode+*/
var log = require('./Utils').log
  , cjson = require('cjson')
  , path = require('path')
  , colors = require('colors');
/**#nocode-*/

/**
 * Alustaa luokan käyttöä varten, lataa {@link Config.defaults} kentät tämän instanssin kentiksi
 * @class Asetukset
 *
 * @param {Server} server  NetMatch-palvelin, joka kutsuu tätä konstruktoria
 */
function Config(server) {
  this.server = server;

  // Laajennetaan tämän Configin ominaisuuksia oletusconfigeilla
  cjson.extend(this, Config.defaults);
}

/**
 * @namespace Sisältää NetMatch-palvelimen oletusasetukset. Näitä voi muuttaa antamalla
 * {@link Server}-konstruktorille parametrina objektin, jonka avaimet sopivat tämän muotoon.
 */
Config.defaults = {
  /**
   * GSS-palvelimen osoite
   * @type String
   * @default "http://netmatch.vesq.org"
   */
  regHost: "http://netmatch.vesq.org",
  /**
   * GSS-palvelimella oleva polku gss.php tiedostoon
   * @type String
   * @default "/reg/gss.php"
   */
  regPath: "/reg/gss.php",
  /**
   * Rekisteröidäänkö palvelin
   * @type Boolean
   * @default false
   */
  register: false,
  /**
   * Palvelimen kuvaus, näkyy listauksessa
   * @type String
   * @default "Node.js powered server"
   */
  description: "Node.js powered server",
  /**
   * Nykyinen kartta
   * @type String
   * @default "Luna"
   */
  map: "Luna",
  /**
   * Maksimimäärä pelaajia. Suurin mahdollinen maksimimäärä on 64.
   * @type Number
   * @default 10
   */
  maxPlayers: 10,
  /**
   * Bottien määrä. Jos tämä on nollaa pienempi, käytetään kartan asetuksissa määriteltyä arvoa.
   * @type Number
   * @default -1
   */
  botCount: -1,
  /**
   * Pelimoodi, DM = 1 ja TDM = 2
   * @type Byte
   * @default 1
   */
  gameMode: 1,
  /**
   * Kuinka pitkän ajan pelaajilla on suoja spawnauksen jälkeen. Aika millisekunteissa
   * @type Number
   * @default 3000
   */
  spawnProtection: 3000,
  /**
   * Kuinka kauan kestää (millisekunteina) että pelaajat heräävät henkiin uudelleen
   * @type Number
   * @default 3000
   */
  deathDelay: 3000,
  /**
   * Näytetäänkö palvelimen konsolissa tappoviestit
   * @type Boolean
   * @default true
   */
  logKillMessages: true,
  /**
   * Ovatko tutkanuolet käytössä vai ei
   * @type Boolean
   * @default true
   */
  radarArrows: true,
  /**
   * Palvelimen pelimoottorin päivitystahti, kuinka monta päivitystä per sekunti tehdään.
   * @type Number
   * @default 60
   */
  updatesPerSec: 60,
  /**
   * Palvelimen salasana. Jos tätä ei aseteta, pelaaja voi saada admin-oikeudet vain palvelimen
   * konsolikomennon op kautta.
   * @type String
   * @default ""
   */
  password: "",
  /**
   * Onko palvelin kehitysversio
   * @type Boolean
   * @default false
   */
  devBuild: false
};

/**
 * Lataa asetukset annetusta tiedostosta. Tämä metodi hakee tiedostoa node-NetMatchin juuresta.
 *
 * @param {String} [config="config"]  Asetustiedoston nimi, ilman .json päätettä.
 *
 * @returns {Boolean}  Pystytäänkö peliä jatkamaan nykyisillä asetuksilla
 */
Config.prototype.load = function (config) {
  var filePath = path.resolve(__dirname, '..', config + '.json')
    , loadedConfig;

  if (!path.existsSync(filePath)) {
    log.error('Config %0 doesn\'t exist', filePath.green);
    return true;
  }

  log.info('Loading config from %0', filePath.green);
  loadedConfig = cjson.load(filePath);
  // Laajennetaan tämän Configin ominaisuuksia ladatulla json-tiedostolla
  cjson.extend(this, loadedConfig);

  // Tarkistetaan onko maksimimäärä liian suuri ja kaadetaan palvelin mikäli on
  if (this.maxPlayers > 64) {
    log.fatal('maxPlayers set to %0 while the hardcoded maximum is %1!', this.maxPlayers, 64);
    return false;
  }

  return true;
};

module.exports = Config;
