/**
 * Uudelleennimeää pelaajan.
 * @param {Player} who   Pelaaja, joka uudelleennimetään. Nimi tai ID kelpaa
 * @param {String} name  Uusi nimi
 */
module.exports = {
  params: [
    {name: 'who',  type: 'player', optional: false, help: 'Player who needs to be renamed'},
    {name: 'name', type: 'string', optional: false, help: 'New name'}
  ],
  help: 'Renames a player.',
  remote: true,
  action: function commandsRename() {
    var plr, playerIds, player
      , plrName = arguments[1]
      , newName = arguments[2];

    // Jos annettiinkin ID, niin vaihdetaan se nimeksi
    if (this.players[plrName]) {
      plrName = this.players[plrName].name;
    }

    // Luupataan kaikki pelaajat ja etsitään haluamamme pelaaja.
    playerIds = Object.keys(this.players)
    for (var i = playerIds.length; i--;) {
      plr = this.players[playerIds[i]];
      plr.sendNames = true; // Kaikkien pitää päivittää nimitiedot
      // Ei anneta vaihtaa nimeä, jos uusi nimi on jo käytössä
      if (plr.name === newName) {
        log.notice('Name "%0" is already in use!', newName.green);
        return;
      }
      if (plr.name === plrName && !plr.zombie && plr.active) {
        player = plr;
      }
    }

    // Jos pelaaja löytyi, vaihdetaan nimi.
    if (!player) {
      log.notice('Sorry, player couldn\'t be found or you tried to rename a bot.');
    } else {
      player.name = newName;
      log.info('Renamed "%0" -> "%1" >:)', plrName.green, newName.green);
    }
  }
};