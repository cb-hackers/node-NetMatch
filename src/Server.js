// Vaatii cbNetwork ja node-optimist-paketin: https://github.com/substack/node-optimist
/**#nocode+*/
var argv = require('optimist')
    .default({p : 1337, a : undefined})
    .alias({'p' : 'port', 'a' : 'address', 'd' : 'debug'})
    .argv
  , NET = require('./Constants').NET
  , NetMessages = require('./NetMessage')
  , NetMatch = require('./NetMatch');
/**#nocode-*/

// Tehdään uusi palvelin.
/** @ignore */
var server = new NetMatch({ port: argv.p, address: argv.a});

// Tehdään jotain sitä mukaa, kun dataa tulloo sissään.
server.on('message', function (client) {
  var data = client.data
  var msgType = data.getByte();
  
  // Jos oli uusi pelaaja
  if (msgType === NET.LOGIN) {
    server.login(client);
    return;
  }
  
  // Luetaan lähetetty pelaajan ID, joka on pelaajan järjestysnumero ja aina väliltä 1...MAX_PLAYERS
  var currentPlayerId = data.getByte();
  
  // Haetaan pelaajan instanssi Player-luokasta
  var player = this.players[currentPlayerId];
  
  //console.log(player);
  return;
  
  // Luetaan dataa
  var breakOut = false;
  while (msgType && !breakOut) {
    switch (msgType) {
      case NET.PLAYER:
        break;
      case NET.PLAYERNAME:
        break;
      case NET.TEXTMESSAGE:
        break;
      case NET.MAPCHANGE:
        break;
      default:
        breakOut = true;
        continue; // eli oikeasti break while-loopista
    }
    msgType = data.getByte();
  }
});