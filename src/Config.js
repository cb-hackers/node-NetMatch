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
   * Maksimimäärä pelaajia
   * @type Number
   * @default 10
   */
  maxPlayers: 10,
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
   * Palvelimen salasana
   * @type String
   * @default password
   */
  password: "password",
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
 */
Config.prototype.load = function (config) {
  var filePath = path.resolve(__dirname, '..', config + '.json')
    , loadedConfig;

  if (!path.existsSync(filePath)) {
    log.error('Config %0 doesn\'t exist', filePath.green);
    return;
  }

  log.info('Loading config from %0', filePath.green);
  loadedConfig = cjson.load(filePath);
  // Laajennetaan tämän Configin ominaisuuksia ladatulla json-tiedostolla
  cjson.extend(this, loadedConfig);
};

module.exports = Config;
