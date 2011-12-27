// Vaatii cbNetwork ja node-optimist-paketin: https://github.com/substack/node-optimist
/**#nocode+*/
var argv = require('optimist')
    .default({p : 1337, a : undefined})
    .alias({'p' : 'port', 'a' : 'address', 'd' : 'debug'})
    .argv
  , Packet = require('cbNetwork').Packet
  , NET = require('./Constants').NET
  , NetMessages = require('./NetMessage')
  , NetMatch = require('./NetMatch')
  , log = require('./Utils').log
  , timer = require('./Utils').timer;
/**#nocode-*/

// Tehdään uusi palvelin.
/** @ignore */
var server = new NetMatch({ port: argv.p, address: argv.a});

// Tehdään jotain sitä mukaa, kun dataa tulloo sissään.
server.on('message', function (client) {
  var data = client.data
    , msgType = data.getByte()
    , currentPlayerId
    , player
    , reply
    , sendNames = false
    , txtMessage = "";
  
  // Jos oli uusi pelaaja
  if (msgType === NET.LOGIN) {
    server.login(client);
    return;
  }
  
  // Luetaan lähetetty pelaajan ID, joka on pelaajan järjestysnumero ja aina väliltä 1...MAX_PLAYERS
  currentPlayerId = data.getByte();
  
  if (currentPlayerId < 1 || currentPlayerId > server.gameState.maxPlayers) {
    // Pelaajatunnus on väärä
    log.notice('Possible hack attempt from ' + client.address + ' Invalid player ID (' + currentPlayerId + ')');
    return;
  }
  
  // Haetaan pelaajan instanssi Player-luokasta
  player = this.players[currentPlayerId];
  
  
  // Tarkistetaan onko pelaaja potkittu
  if (player.kicked && player.clientId == client.id) {
    reply = new Packet(7);
    reply.putByte(NET.KICKED);
    reply.putByte(player.kickerId);
    reply.putByte(currentPlayerId);
    reply.putString(player.kickReason);
    client.reply(reply);
    return;
  }
  
  if (player.clientId != client.id || !player.active) {
    //log.notice("Possible hack attempt from " + client.address + " Not logged in (" + currentPlayerId + ")");
    reply = new Packet(1);
    reply.putByte(NET.NOLOGIN);
    client.reply(reply);
    return;
  }
  
  // Pelaaja poistuu pelistä
  if (msgType === NET.LOGOUT) {
    server.logout(client, currentPlayerId);
    return;
  }
  
  // Lasketaan pelaajan ja serverin välinen lagi
  player.lag = timer() - player.lastActivity;
  
  // Päivitetään pelaajan olemassaolo
  player.lastActivity = timer();
  
  return;
  
  // Luetaan saapuneita viestejä
  while (msgType) {
    if (msgType === NET.PLAYER) {
      // Pelaajan dataa
      var x     = client.getShort()   // x-position
        , y     = client.getShort()   // y-position
        , angle = client.getShort()   // kulma
        , b     = client.getByte()    // Tämä tavu sisältää useamman muuttujan (alempana)
      
      // Puretaan b-tavu muuttujiin
      // Jos halutaan esim. lukea 4 bittiä kohdasta 0, menee lauseke seuraavasti:
      // var value = (b << (32-0-4)) >> (32-4)
      var weapon   = (b << 28) >> 28  // Valittuna oleva ase (bitit 0-3)
        , hasAmmo  = (b << 27) >> 31  // Onko valitussa aseessa ammuksia (bitti 4)
        , shooting = (b << 26) >> 31; // Ampuuko (bitti 5)
      
      var picked  = client.getByte(); // Poimitun itemin id (0, jos ei poimittu)
      
      // Arvot päivitetään vain jos pelaaja on hengissä
      if (!player.isDead) {
        player.x        = x;
        player.y        = y;
        player.angle    = angle;
        player.weapon   = weapon;
        player.hasAmmos = hasAmmo;
        
        // UNIMPLEMENTED
        // PositionObject, RotateObject
        
        // UNIMPLEMENTED
        // speedhack
        
        if (shoot === 1) {
          // UNIMPLEMENTED
          // CreateServerBullet
        }
        
        // Poimittiinko jotain
        if (picked > 0) {
          // UNIMPLEMENTED
        }
      }
      if (player.health > 0) {
        player.isDead = false;
      }
      if (!player.loggedIn) {
        player.loggedIn = true;
      }
      
    } else if (msgType === NET.PLAYERNAME) {
      // jotain
    } else if (msgType === NET.TEXTMESSAGE) {
      // jotain
    } else if (msgType === NET.MAPCHANGE) {
      // jotain
    } else {
      break;
    }
    msgType = data.getByte();
  }
});