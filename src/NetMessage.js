/**
 * @fileOverview Viestinvälitykseen liittyvät toiminnot
 */

/**#nocode+*/
var NET = require('./Constants').NET
  , WPN = require('./Constants').WPN
  , WPNF = require('./Constants').WPNF
  , OBJ = require('./Constants').OBJ;
/**#nocode-*/

/**
 * Tämä on oikeasti objekti, joka pitää sisällään clienteille lähetettävät viestit.
 * Älä siis kutsu tätä kuten konstruktoria.
 * @class
 */
var NetMessages = {};

/**
 * Luo uuden clientille lähetettävän viestin.
 * @static
 *
 * @param {Byte}    toPlayer          Pelaajan ID kelle viesti lähetetään.
 * @param {Object}  data              Pelaajalle lähetettävä data
 * @param {Byte}    data.msgType      Viestityyppi, kts. {@link NET}
 * @param {String}  data.msgText      Viestin teksti
 * @param {Byte}    data.playerId     Kuka viestin lähetti
 * @param {Short}   data.bulletId     Ammuksen tunnus
 * @param {Byte}    data.itemId       Tavaran tunnus
 * @param {Byte}    data.itemType     Tavaran tyyppi
 * @param {Byte}    data.weapon       Ase
 * @param {Short}   data.x            Sijaintitietoa
 * @param {Short}   data.y            Sijaintitietoa
 * @param {Byte}    data.playerId2    Pelaajatunnus (kehen tapahtuma kohdistui)
 * @param {Boolean} data.sndPlay      Soitetaanko ääni
 * @param {Boolean} data.handShooted  Kumpi käsi ampui (pistooli) 0 = vasen, 1 = oikea
 */
NetMessages.add = function (toPlayer, data) {
  if ('array' !== typeof NetMessages[toPlayer]) {
    NetMessages[toPlayer] = [];
  }
  NetMessages[toPlayer].push(data);
}

/**
 * Lisää data-pakettiin yksittäiselle pelaajalle kuuluvat viestit oikein jäsenneltynä.
 * Kts. cbNetwork-node toteutus luokasta <a href="http://vesq.github.com/cbNetwork-node/doc/symbols/Packet.html">Packet</a>.
 *
 * @param {Byte} toPlayer  Kenen viestit haetaan
 * @param {Packet} data    Mihin pakettiin tiedot lisätään
 */
NetMessages.fetch = function (toPlayer, data) {
  if ('array' !== typeof NetMessages[toPlayer]) {
    return false;
  }
  for( var i=0; i<NetMessages[toPlayer].length; i++ ) {
    // Tämän viestin data laitetaan d-muuttujaan, jotta tarvitsisi kirjoittaa vähemmän.
    var d = NetMessages[toPlayer][i];
    
    if (!d.hasOwnProperty('msgType')) {
      console.log('Virheellistä dataa NetMessages-objektissa!');
      console.log(d);
      continue;
    }
    
    // Lisätään dataa riippuen siitä minkälaista dataa pitää lähettää.
    switch (d.msgType) {
      case NET.LOGIN:
        // Joku on liittynyt peliin
        data.putByte(d.msgType);
        data.putByte(d.playerId);   // Kuka liittyi
        data.putString(d.msgText);  // Liittymisteksti
        data.putByte(d.playerId2);  // Kenen tilalle pelaaja tuli
        break;
        
      case NET.LOGOUT:
        // Joku on poistunut pelistä
        data.putByte(d.msgType);
        data.putByte(d.playerId);
        break;
        
      case NET.NEWBULLET:
        // Uusi ammus on ammuttu
        if (d.weapon == WPN.CHAINSAW) {
          // Moottorisahalla "ammutaan"
          data.putByte(d.msgType);
          data.putShort(d.bulletId);  // Ammuksen tunnus
          data.putByte(d.playerId);   // Kuka ampui
          
          // Tungetaan samaan tavuun useampi muuttuja:
          var b = (d.weapon % 16) << 0
                + d.sndPlay << 4;
          data.putByte(b);
          
          // Ammuksen sijainti
          data.putByte(d.x);
          data.putByte(d.y);
          data.putShort(0);  // Ammuksen kulma, mutta koska moottirisahalla ei ole kulmaa, on tämä 0
        } else {
          // Jokin muu kuin moottorisaha
          // UNIMPLEMENTED
        }
        break;
        
      case NET.TEXTMESSAGE:
        // Tsättiviesti
        data.putByte(d.msgType);
        data.putByte(d.playerId);
        data.putString(d.msgText);
        break;
        
      case NET.SERVERMSG:
        // Palvelimen generoima viesti
        data.putByte(d.msgType);
        data.putByte(d.msgText);
        
      case NET.BULLETHIT:
        // Osumaviesti
        data.putByte(d.msgType);
        data.putShort(d.bulletId);  // Ammuksen tunnus
        data.putByte(d.playerId);   // Keneen osui
        data.putByte(d.x);          // Missä osui
        data.putByte(d.y);          // Missä osui
        data.putByte(d.weapon);     // Mistä aseesta ammus on
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
        data.putByte(d.playerId);   // Tappaja
        data.putByte(d.playerId2);  // Tapettu
        data.putByte(d.weapon);     // Ase
        // UNIMPLEMENTED
        data.putShort(0);           // Tappajan tapot
        data.putShort(0);           // Tappajan kuolemat
        data.putShort(0);           // Uhrin tapot
        data.putShort(0);           // Uhrin kuolemat
        break;
        
      case NET.KICKED:
        // Pelaaja potkittiin
        data.putByte(d.msgType);
        data.putByte(d.playerId);   // Kuka potkaisi
        data.putByte(d.playerId2);  // Kenet potkittiin
        data.putString(d.msgText);  // Potkujen syy
        break;
        
      case NET.TEAMINFO:
        // Lähetetään pelaajan joukkue
        data.putByte(d.msgType);
        data.putByte(d.playerId);   // Pelaaja
        // UNIMPLEMENTED
        data.putByte(1);            // Pelaajan joukkue
        break;
        
      case NET.SPEEDHACK:
        // Tämä client on haxor!
        data.putByte(d.msgType);
        // UNIMPLEMENTED
        // Login( False, gCurrentPlayerId )
        break;
        
      default:
        console.log('VIRHE: Pelaajalle <'+toPlayer+'> oli osoitettu tuntematon paketti:');
        console.log(d);
    }
    
    // Poistetaan viesti muistista
    NetMessages[toPlayer].splice(i, 1);
  }
}


exports = module.exports = NetMessages;
