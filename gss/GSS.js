var udp  = require('dgram')
  , http = require('http')
  , url  = require('url')
  , argv = require('optimist')
    .default({d: false, a: '0.0.0.0', p: 31479})
    .alias({'p' : 'port', 'a' : 'address', 'd' : 'debug', 'h': 'help'})
    .describe({
      'h': 'Shows this help and exits.',
      'p': 'Port to listen to.',
      'a': 'Address to bind to defaults to all addresses.',
      'd': 'Spam a lot.'})
    .usage('Run Game Server Service (GSS) -server: $0')
    .demand('p')
    .check(function (a) {return !a.h;}) // Näytetään helppi, jos -h tai --help
    .argv; // Palautetaan parametrit opjektina, jotta niitä

var NM_PROFILE = 'NetMatch';

function GSS(p, a) {
  var self = this;
  self.servers = {};
  self.sock = udp.createSocket('udp4');
  self.htp = http.createServer().listen(p, a);
  self.htp.on('request', function (req, res) {
    var uri = url.parse(req.url, true)
      , mode = uri.query.mode;

    // Palautetaan aina selkokieltä
    res.writeHead(200, {'Content-Type': 'text/plain'});

    // Mitä tehdään?
    if (mode && ['reg', 'list', 'unreg', 'update'].indexOf(mode) !== -1) {
      self.emit(mode, req, res, uri);
    } else {
      res.end('unknown_mode');
    }
  });
}
// Laajennetaan EventEmitteriä, saadaan emit.
GSS.prototype.__proto__ = process.EventEmitter.prototype;

var gss = new GSS(argv.p, argv.a);

/**************************|*******************.
| SERVUN REKISTERÖINTI :O) |                    \
|--------------------------´                     \
| Palautettava merkkijono on jokin seuraavista:   \
|   registering_failed = jokin tiedoista väärin   |
|   system_error       = socket feilasi           |
|   server_exists      = samalla IP:llä ja        /
|                        portilla on jo palvelin /
|   ok                 = kaikki onnistui        /
`**********************************************/
gss.on('reg', function (req, res, uri) {
  var q = uri.query
    , ip   = q.attr || req.headers['x-forwarded-for']
    , port = parseInt(q.port, 10)
    , sid  = ip + ':' + port
    , serv = gss.servers[sid]
    , devb = !!q.devbuild;

  // Jokin tiedoista puuttuu
  if (!q.profile || !q.ver || !q.desc || !port) {
    console.log('insufficient parameters.');
    res.end('registering_failed');
    return;
  }
  // Jokin tiedoista näyttää alustavasti väärältä
  if (q.profile !== NM_PROFILE || !q.desc.length || port < 1 || port > 65535) {
    res.end('registering_failed');
    return;
  }

  // Katsotaan löytyyko palvelin jo samasta osoitteesta ja portista
  if (serv && Date.now() - serv.last < 90000) {
    console.log('Server exists');
    res.end('server_exists');
    return;
  }

  // Tarkistetaan serverin toimivuus UDP-paketilla.
  //                       [ ,->  544437095  <-.  |  ,->    GSS+    <--.  ]
  gss.sock.send(new Buffer([0x67, 0x73, 0x73, 0x20, 0x47, 0x53, 0x53, 0x2B]), 0, 8, port, ip,
  function sockSend(err, bytes) {
    if (err) {
      res.end('system_error');
      return;
    }
    // Tallennetaan serveri listaan, jos kaikki meni kuten piti
    serv = {
      ip: ip,
      port: port,
      ver: q.ver,
      desc: q.desc,
      dev: devb
      last: undefined
    };
  });

  res.end('ok')
});



function each(obj, fn) { Object.key(obj).forEach(function (n) { fn(obj[n]); }); }