BP Tracker Desktop
==========

A desktop client for monitoring and tracking assets such as a motorcycle.


[![Build Unstable][shield-unstable]](#)
[![MIT licensed][shield-license]](#)



Table Of Contents
-----------------

- [Intro](#intro)
- [Features](#features)
- [Requirements](#requirements)
- [Usage](#usage)
- [Developer Notes](#developer-notes)
- [License](#license)

Intro
-------


Features
-------


Requirements
-------
BP Tracker requires the following hardware:

  * particle.io [electron][electron] core (tested with 0.5.3 firmware)
  * [AssetTracker][assetrackershield] shield (tested with v002)
  * [particle cli][particlecli]

Usage
-----


Developer Notes
-----

Running:  `DEBUG=dashboard:* npm start`

npm install -g nodemon
or DEBUG=dashboard:* nodemon --ignore tmp/

Production Notes:
--trace-sync-io
NODE_ENV=production npm start



License
-------

BP Tracker Firmware is licensed under the [MIT][info-license] license.  
Copyright &copy; 2017 Derek Benda


[shield-unstable]: https://img.shields.io/badge/build-unstable-red.svg
[shield-license]: https://img.shields.io/badge/license-MIT-blue.svg

[particlecli]:https://docs.particle.io/guide/getting-started/connect/electron/
[particleio]: https://www.particle.io/
[electron]: https://www.particle.io/products/hardware/electron-cellular-dev-kit
[cloudapi]: https://docs.particle.io/reference/api/
[assetrackershield]: https://docs.particle.io/datasheets/particle-shields/#electron-asset-tracker
[info-license]: LICENSE
