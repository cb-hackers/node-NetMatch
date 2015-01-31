/**
 * @fileOverview Viestien säilytykseen liittyvät toiminnot
 */

"use strict";

/**#nocode+*/
var NET = require('./Constants').NET
  , WPN = require('./Constants').WPN
  , DRAW = require('./Constants').DRAW
  , log = require('./Utils').log
  , colors = require('colors');
/**#nocode-*/

/**
 * Alustaa uuden viestisäilön.
 * @class Viestien säilytys
 *
 * @param {Server} server  Tämän viestisäilön {@link Server}-instanssi
 */
function NetMessages(server) {
  this.server = server;
  /**
   * Sisältää clienteille lähetettävät viestit
   * @private
   */
  this.data = {};
}

/**
 * Luo uuden clientille lähetettävän viestin.
 *
 * @param {Byte}      toPlayer          Pelaajan ID kelle viesti lähetetään.
 * @param {Object}    data              Pelaajalle lähetettävä data
 * @param {Byte}      data.msgType      Viestityyppi, kts. {@link NET}
 * @param {String}    data.msgText      Viestin teksti
 * @param {Player}    data.player       Kuka viestin lähetti
 * @param {Short}     data.bullet       Ammus
 * @param {Byte}      data.itemId       Tavaran tunnus
 * @param {Byte}      data.itemType     Tavaran tyyppi
 * @param {Byte}      data.weapon       Ase
 * @param {Short}     data.x            Sijaintitietoa
 * @param {Short}     data.y            Sijaintitietoa
 * @param {Player}    data.player2      Kehen tapahtuma kohdistui
 * @param {Boolean}   data.sndPlay      Soitetaanko ääni
 * @param {Boolean}   data.handShooted  Kumpi käsi ampui (pistooli) 0 = vasen, 1 = oikea
 * @param {Byte}      data.drawType     Minkä kuvion piirto on kyseessä
 * @param {Integer[]} data.drawVars     Suoraan listassa piirtoa varten tarvittavat arvot
 */
NetMessages.prototype.add = function (toPlayer, data) {
  if ('undefined' === typeof this.data[toPlayer]) {
    this.data[toPlayer] = [];
  }
  this.data[toPlayer].push(data);
};

/**
 * Lähettää kaikille clienteille viestin.
 * @see NetMessages#add
 *
 * @param {Object} data      Pelaajalle lähetettävä data
 * @param {Byte} [butNotTo]  Pelaajan ID, kelle EI lähetetä tätä pakettia.
 */
NetMessages.prototype.addToAll = function (data, butNotTo) {
  var self = this;

  if ('number' !== typeof butNotTo) {
    butNotTo = 0;
  }

  this.server.loopPlayers(function (plr) {
    if (plr.active && !plr.zombie && (plr.id !== butNotTo)) {
      self.add(plr.id, data);
    }
  });
};

/**
 * Lähettää kaikille annetun joukkueen jäsenille.
 * @see NetMessages#add
 *
 * @param {Byte} team    Joukkue jonka jäsenille lähetetään viesti
 * @param {Object} data  Pelaajalle lähetettävä data
 */
NetMessages.prototype.addToTeam = function (team, data) {
  var self = this;

  this.server.loopPlayers(function (plr) {
    if (plr.active && !plr.zombie && (plr.team === team)) {
      self.add(plr.id, data);
    }
  });
};

/**
 * Lisää data-pakettiin yksittäiselle pelaajalle kuuluvat viestit oikein jäsenneltynä.
 * Kts. cbNetwork-node toteutus luokasta <a href="http://cb-hackers.github.com/cbNetwork-node/doc/symbols/Packet.html">Packet</a>.
 *
 * @param {Player} toPlayer  Kenen viestit haetaan
 * @param {Packet} data      Mihin pakettiin tiedot lisätään
 */
NetMessages.prototype.fetch = function (toPlayer, data) {
  var d, b;

  if ('undefined' === typeof this.data[toPlayer.id] || this.data[toPlayer.id].length === 0) {
    return false;
  }
  // Tämän viestin data laitetaan d-muuttujaan, jotta tarvitsisi kirjoittaa vähemmän.
  d = this.data[toPlayer.id][0];
  while (d) {
    if (!d.hasOwnProperty('msgType')) {
      log.error('Virheellistä dataa NetMessages-objektissa!');
      console.dir(d);
      continue;
    }

    // Lisätään dataa riippuen siitä minkälaista dataa pitää lähettää.
    switch (d.msgType) {
      case NET.LOGIN:
        // Joku on liittynyt peliin
        data.putByte(d.msgType);
        data.putByte(d.player.id);      // Kuka liittyi
        data.putString(d.msgText);      // Liittymisteksti
        data.putByte(d.player.zombie);  // Oliko liittynyt botti?
        break;

      case NET.LOGOUT:
        // Joku on poistunut pelistä
        data.putByte(d.msgType);
        data.putByte(d.player.id);
        break;

      case NET.NEWBULLET:
        // Uusi ammus on ammuttu
        if (d.weapon === WPN.CHAINSAW) {
          // Moottorisahalla "ammutaan"
          data.putByte(d.msgType);
          data.putShort(d.bullet.id); // Ammuksen tunnus
          data.putByte(d.player.id);  // Kuka ampui

          // Tungetaan samaan tavuun useampi muuttuja:
          b = ((d.weapon % 16) << 0)
            + (d.sndPlay << 4);
          data.putByte(b);

          // Ammuksen sijainti
          data.putShort(d.x);
          data.putShort(d.y);
          data.putShort(0);  // Ammuksen kulma, mutta koska moottirisahalla ei ole kulmaa, on tämä 0
        } else {
          // Jokin muu kuin moottorisaha
          if ('undefined' !== typeof d.bullet) {
            data.putByte(d.msgType);
            data.putShort(d.bullet.id);
            data.putByte(d.player.id);

            // Tungetaan samaan tavuun useampi muuttuja:
            b = ((d.weapon % 16) << 0)  // Millä aseella (mod 16 ettei vie yli 4 bittiä)
              + (d.sndPlay << 4)        // Soitetaanko ääni
              + (d.handShooted << 5);   // Kummalla kädellä ammuttiin
            data.putByte(b);

            // Ammuksen sijainti
            data.putShort(d.bullet.x);
            data.putShort(d.bullet.y);
            data.putShort(d.bullet.angle);
          }
        }
        break;

      case NET.TEXTMESSAGE:
        // Tsättiviesti
        data.putByte(d.msgType);
        data.putByte(d.player.id);
        data.putString(d.msgText);
        break;

      case NET.SERVERMSG:
        // Palvelimen generoima viesti
        data.putByte(d.msgType);
        data.putString(d.msgText);
        break;

      case NET.BULLETHIT:
        // Osumaviesti
        data.putByte(d.msgType);
        data.putShort(d.bullet.id);   // Ammuksen tunnus
        if (d.player) {
          data.putByte(d.player.id);  // Keneen osui
        } else {
          data.putByte(0);
        }
        data.putShort(d.x);           // Missä osui
        data.putShort(d.y);           // Missä osui
        data.putByte(d.weapon);       // Mistä aseesta ammus on
        break;

      case NET.ITEM:
        // Tavaraviesti
        data.putByte(d.msgType);
        data.putByte(d.itemId);     // Tavaran tunnus
        data.putByte(d.itemType);   // Tavaran tyyppi
        data.putShort(d.x);         // Missä tavara on
        data.putShort(d.y);         // Missä tavara on
        break;

      case NET.KILLMESSAGE:
        // Tappoviesti! Buahahahaaaa
        data.putByte(d.msgType);
        data.putByte(d.player.id);       // Tappaja
        data.putByte(d.player2.id);      // Tapettu
        data.putByte(d.weapon);          // Ase
        data.putShort(d.player.kills);   // Tappajan tapot
        data.putShort(d.player.deaths);  // Tappajan kuolemat
        data.putShort(d.player2.kills);  // Uhrin tapot
        data.putShort(d.player2.deaths); // Uhrin kuolemat
        break;

      case NET.KICKED:
        // Pelaaja potkittiin
        data.putByte(d.msgType);
        if (d.player) {
          data.putByte(d.player.id); // Kuka potkaisi
        } else {
          data.putByte(0);           // Palvelin potkaisi
        }
        data.putByte(d.player2.id);  // Kenet potkittiin
        data.putString(d.msgText);   // Potkujen syy
        break;

      case NET.TEAMINFO:
        // Lähetetään pelaajan joukkue
        data.putByte(d.msgType);
        data.putByte(d.player.id);   // Pelaaja
        data.putByte(d.player.team); // Pelaajan joukkue
        break;

      case NET.SPEEDHACK:
        // Tämä client on haxor!
        data.putByte(d.msgType);
        // UNIMPLEMENTED
        // Login( False, gCurrentPlayerId )
        break;

      case NET.DEBUGDRAWING:
        // Debug-piirtelytavaraa tulossa
        data.putByte(d.msgType);
        data.putByte(d.drawType);
        if (d.drawVars) {
          for (var i=0; i < d.drawVars.length; i++) {
            if (i === 4) {
              // Viides parametri on pakko olla byte
              data.putByte(d.drawVars[i]);
              break;
            }
            data.putShort(d.drawVars[i]);
          }
        }
        break;

      default:
        log.error('VIRHE: Pelaajalle %0 (%1) oli osoitettu tuntematon paketti:',
          toPlayer.name.green, String(toPlayer).id.magenta);
        console.dir(d);
    }

    // Poistetaan viesti muistista
    this.data[toPlayer.id].splice(0, 1);

    // Siirrytään seuraavaan viestiin
    d = this.data[toPlayer.id][0];
  }
};


module.exports = NetMessages;
