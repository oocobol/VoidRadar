const ut = require('../utils');
const loaders = require('../loaders');
const { DateTime } = require('luxon');

var oldOptions = '';

function autoUpdate(options) {
    var station = options.station;
    var product = options.product;

    if (oldOptions == '') { oldOptions == options }

    function checkLatestFile() {
        loaders.getLatestFile(station, [3, product, 0], function(url) {
            var formattedNow = DateTime.now().toFormat('h:mm.ss a ZZZZ');
            oldOptions = options;

            if (station != oldOptions.station || product != oldOptions.product) {
                console.log(`Successfully found new radar scan at ${formattedNow}.`);
                fetchedURL = url;
                loaders.loadFileObject(ut.phpProxy + url + '#', 3);
            } else {
                console.log(`There is no new radar scan as of ${formattedNow}.`);
            }
        })
    }

    if (window.radarRefreshInterval) { clearInterval(window.radarRefreshInterval) }
    checkLatestFile();
    // check for a new radar scan every 15 seconds
    window.radarRefreshInterval = setInterval(checkLatestFile, 15000);
}

module.exports = autoUpdate;