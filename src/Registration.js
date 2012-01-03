/**
 * @fileOverview Sisältää {@link Registration}-luokan toteutuksen, eli siis palvelimen lisäämisen
 * ja päivittämisen netissä olevaan palvelinlistaukseen.
 */

/**#nocode+*/
var log = require('./Utils').log
  , HTTP = require('cbNetwork').HTTP;
/**#nocode-*/

/**
 * Alustaa moduulin. Kun haluat lisätä palvelimen palvelinlistaukseen, käytä metodia {@link #add}.
 * @class Palvelinlistauksen päivittelyyn liittyvät toiminnot.
 *
 * @param {Server} server  Tähän rekisteröintiin liittyvä NetMatch-palvelin.
 *
 * @property {Boolean} registered  Onko palvelin rekisteröity vai ei
 */
function Registration(server) {
  this.server = server;
  this.registered = false;
}

/**
 * Lisää palvelimen palvelinlistaukseen. Kutsuu automaattisesti metodia {@link #update}.
 *
 * @param {Function} [callback]  Tätä funktiota kutsutaan kun rekisteröinti on saatu päätökseen.
 *                               Jos rekisteröinti epäonnistui, annetaan funktiolle parametrina
 *                               virheilmoitus merkkijonona.
 */
Registration.prototype.add = function (callback) {
  var url = this.server.config.regHost + this.server.config.regPath;

  if ('function' === typeof callback) {
    callback("Add is not yet implemented.");
  }
}

/**
 * Päivittää palvelimen listauksen.
 *
 * @param {Function} [callback]  Tätä funktiota kutsutaan kun päivitys on saatu päätökseen.
 *                               Jos päivitys epäonnistui, annetaan funktiolle parametrina
 *                               virheilmoitus merkkijonona.
 */
Registration.prototype.update = function (callback) {
  if ('function' === typeof callback) {
    callback("Update is not yet implemented.");
  }
}

exports = module.exports = Registration;
