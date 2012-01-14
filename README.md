A [Node.js] implementation of [NetMatch]
========================================
We're working on to create a fully functional server for [NetMatch], similar to the one made with
[CoolBasic]. The purpose of this far-out project is to have a server which can run on linux, giving
us the chance for always having a server to play in, and to have a server which runs much much
faster than the CoolBasic one.

By using Node.js we get to use the asynchronous nature of JavaScript and also gain knowledge of
Node itself. Because Node.js is essentially JavaScript, we can more easily port the NetMatch client
to JavaScript at some point in the future. That is the ultimate goal for this project - to create
NetMatch that you can play with your own browser!

Documentation
-------------
We document JavaScript with JsDoc and build an HTML-version of the project with [jsdoc-toolkit],
powered by the awesome template [CodeView] (thanks to [Wouter Bos] for it!). The latest build of
documentations are in `gh-pages` branch and viewable here: http://vesq.github.com/node-NetMatch/doc/

[Node.js]: http://nodejs.org/
[NetMatch]: https://github.com/VesQ/NetMatch
[CoolBasic]: http://www.coolbasic.com/
[jsdoc-toolkit]: http://code.google.com/p/jsdoc-toolkit/
[CodeView]: http://www.thebrightlines.com/2010/05/06/new-template-for-jsdoctoolkit-codeview/
[Wouter Bos]: http://www.thebrightlines.com/about/