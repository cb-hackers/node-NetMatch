/**
 * @fileOverview Sisältää {@link Registration}-luokan toteutuksen, eli siis palvelimen lisäämisen
 * ja päivittämisen netissä olevaan palvelinlistaukseen.
 */

/**#nocode+*/
var log = require('./Utils').log
  , http = require('cbNetwork').HTTP;
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
  this.updateWait = undefined;
}

/**
 * Pyytää päästä palvelinlistaukseen. Kutsuu automaattisesti metodia {@link #update}.
 *
 * @param {Function} [callback]  Tätä funktiota kutsutaan, kun rekisteröinti on saatu päätökseen.
 *                               Jos rekisteröinti epäonnistui, annetaan funktiolle parametrina
 *                               virheilmoitus merkkijonona.
 */
Registration.prototype.apply = function (callback) {
  if (this.registered) {
    callback('Server already registered.');
    return;
  }

  log.info('Registering server to %0...', this.server.config.regHost.green);
  // Luodaan pyyntö
  var config = this.server.config
    , url = config.regHost
    + config.regPath
    + '?profile=' + encodeURI('NetMatch')
    + '&ver='     + encodeURI(config.version)
    + '&mode=reg'
    + '&desc=' + encodeURI(config.description)
    + '&addr=' + encodeURI(config.address)
    + '&port=' + config.port
    + (config.devBuild ? '&devbuild=1' : '');

  // Lähetetään pyyntö
  http.get(url, function registerGet(err, data) {
    if (err !== 200 || data !== 'ok') {
      callback('[REG]'.red + ' Server returned: ' + data.red);
      return;
    }
  });

  // Odotellaan vastausta
  this.server.on('register', function registerReply(data) {
    // Tuliko oikea paketti
    if (String(data.memBlock.slice(4)) === 'GSS+') {
      // Rekisteröinti onnistui!
      this.registration.registered = true;
      // Lähetetään palvelimen tiedot listausta varten
      this.registration.update(function (e) {
        if (!e) {
          callback();
        } else {
          callback('Could not update server info.');
        }
      });
    }
  });
}


/**
 * Pyytää, että poistetaan palvelin listauksesta.
 *
 * @param {Function} [callback]  Tätä funktiota kutsutaan, kun epä-rekisteröinti on saatu päätökseen.
 *                               Jos epä-rekisteröinti epäonnistui, annetaan funktiolle parametrina
 *                               virheilmoitus merkkijonona.
 */
Registration.prototype.remove = function (callback) {
  if (!this.registered) {
    callback('Server is not registered!');
    return;
  }

  // Lopetetaan päivittäminen
  clearTimeout(this.updateWait);

  var server = this.server
    , config = server.config
    // Luodaan pyyntö
    , url = config.regHost
    + config.regPath
    + '?profile=' + encodeURI('NetMatch')
    + '&addr=' + config.address
    + '&port=' + config.port
    + '&mode=unreg';

  // Lähetetään pyyntö
  http.get(url, function (err, data) {
    // Katsotaan, että kaikki meni putkeen
    if (err !== 200 || data !== 'ok') {
      callback('[UNREG]'.red + ' Server returned: ' + data.red);
    } else {
      callback();
    }
  });
}


/**
 * Päivittää palvelimen listauksen.
 *
 * @param {Function} [callback]  Tätä funktiota kutsutaan, kun päivitys on saatu päätökseen.
 *                               Jos päivitys epäonnistui, annetaan funktiolle parametrina
 *                               virheilmoitus merkkijonona.
 */
Registration.prototype.update = function (callback) {
  if (!this.registered) {
    callback('Server is not registered, can not update!');
    return;
  }

  var server = this.server
    , config = server.config
    , state = server.gameState
    // Listataan pelaajien nimet
    , plrNames = Object.keys(server.players)
      .filter(function (p) {
        // Filter inactive players and bots
        var plr = server.players[p];
        return plr.active && plr.name && !plr.zombie})
      .map(function (p) { return server.players[p].name; })
    // Luodaan merkkijono, jossa on palvelimen tiedot
    , data =
      [ plrNames.length
      , config.maxPlayers - plrNames.length
      , state.map.name
      , config.maxPlayers
      , plrNames.join('&#124;')
      ].join(',')
    // Luodaan pyyntö
    , url = config.regHost
    + config.regPath
    + '?profile=' + encodeURI('NetMatch')
    + '&addr=' + config.address
    + '&port=' + config.port
    + '&mode=update'
    + '&data=' + data;

  // Lähetetään pyyntö
  http.get(url, function (err, data) {
    // Katsotaan, että kaikki meni putkeen
    if (err !== 200 || data !== 'ok') {
      callback('[UPD]'.red + ' Server returned: ' + data.red);
    } else {
      // Kaikki ok
      setTimeout(function () {
        server.registration.update(function (e) {
          log.debug(e);
        });
      }, 4000);
    }
  });
}

exports = module.exports = Registration;
