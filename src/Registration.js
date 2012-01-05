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
  var reg = this
    , config = this.server.config
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
  http.get(url, function registerGet(status, data) {
    if (status !== 200 || data !== 'ok') {
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
          // Kaikki meni hyvin käynnistetään päivitys-luuppi.
          reg.updateWait = setInterval(function updateReg() {
            server.registration.update(function (e) { log.debug(e); });
          }, 10000);
          callback();
        } else { callback('Could not update server info.'); }
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
  http.get(url, function (status, data) {
    // Katsotaan, että kaikki meni putkeen
    if (status !== 200 || data !== 'ok') {
      callback('[UNREG]'.red + ' Server returned: ' + data.red);
    } else { callback(); }
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

  // Temppimuuttujia
  var reg = this, srv = reg.server, config = srv.config, state = srv.gameState
    // Listataan pelaajien nimet
    , plrNames = Object.keys(srv.players)
      .filter(function (p) { // Filtteröidään inaktiiviset ja potit
         p = srv.players[p]; return p.active && p.name && !p.zombie})
      .map(function (p) { return srv.players[p].name; })
    , plrs = plrNames.length
    // Luodaan merkkijono, jossa on palvelimen tiedot
    , data =
      [ plrs
      , state.maxPlayers - plrs
      , state.map.name
      , state.maxPlayers
      , plrNames.join('&#124;')
      ].join(',')
    // Luodaan pyyntö
    , url = config.regHost + config.regPath
    + '?profile=NetMatch&mode=update'
    + '&addr=' + config.address + '&port=' + config.port
    + '&data=' + data;

  // Lähetetään pyyntö
  http.get(url, function (status, data) {
    // Katsotaan, että kaikki meni putkeen
    if (status !== 200 || data !== 'ok') {
      callback('[UPD]'.red + ' Server returned: ' + data.red);
    }
  });
}

exports = module.exports = Registration;
