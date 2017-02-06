BP Tracker Desktop
==========

A web client for monitoring and tracking assets using the BP Tracker firmware.


[![Build Unstable][shield-unstable]](#)
[![MIT licensed][shield-license]](#)



Table Of Contents
-----------------
- [Requirements](#requirements)
- [Usage](#usage)
- [Screentshots](#screenshots)
- [License](#license)


Requirements
-------
  * BP Tracker [firmware][bp-tracker-particle] 0.2+
  * [Node.js][nodejs] 5.0+
  * [npm][npm] (comes with Node.js)

Usage
-----

```bash
git clone https://github.com/BP-Tracker/bp-tracker-desktop.git
cd bp-tracker-desktop
npm install
NODE_ENV=production npm start
```

By default, the application will be served at `http://localhost:3101`

In development mode (using [nodemon][nodemon]):

```bash
npm install -g nodemon
DEBUG=dashboard:* nodemon --ignore tmp/
```

Screenshots
-----

<img width="100%" src="https://rawgit.com/BP-Tracker/bp-tracker-desktop/master/docs/images/dashboard.jpg" alt="Demo Screenshot" />


License
-------

BP Tracker Firmware is licensed under the [MIT][info-license] license.  
Copyright &copy; 2017 Derek Benda


[shield-unstable]: https://img.shields.io/badge/build-unstable-red.svg
[shield-license]: https://img.shields.io/badge/license-MIT-blue.svg

[bp-tracker-particle]:https://github.com/BP-Tracker/bp-tracker-particle
[nodejs]: https://nodejs.org
[npm]: https://www.npmjs.com
[nodemon]: https://nodemon.io/
[assetrackershield]: https://docs.particle.io/datasheets/particle-shields/#electron-asset-tracker
[info-license]: LICENSE
