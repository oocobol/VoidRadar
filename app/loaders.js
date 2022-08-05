const mapFuncs = require('./map/mapFunctions');
const ut = require('./utils');

function listTilts(tiltsArr) {
    //<li><a class="dropdown-item" href="#" value="tilt1">Tilt 1</a></li>
    $('#tiltMenu').empty();
    for (key in tiltsArr) {
        var anchorElem = document.createElement('a');
        anchorElem.className = 'dropdown-item';
        anchorElem.href = '#';
        anchorElem.setAttribute('value', `tilt${tiltsArr[key]}`);
        anchorElem.innerHTML = `Tilt ${tiltsArr[key]}`

        var lineElem = document.createElement('li');
        lineElem.appendChild(anchorElem)
        //console.log(lineElem)
        document.getElementById('tiltMenu').appendChild(lineElem);
        if (key == 0) {
            document.getElementById('tiltDropdownBtn').innerHTML = `Tilt ${tiltsArr[key]}`;
        }
    }
}

function loadFileObject(path, name, level, product) {
    var radLevel;
    var wholeOrPart = 'whole';
    if (level == 2) {
        radLevel = 'level2';
    } if (level == 22) {
        radLevel = 'level2';
        wholeOrPart = 'part';
    } else if (level == 3) {
        radLevel = 'level3';
    }
    var xhr = new XMLHttpRequest();
    xhr.open("GET", path);
    xhr.responseType = "blob";
    xhr.addEventListener('load', function () {
        var blob = xhr.response;
        blob.lastModifiedDate = new Date();
        blob.name = name;
        // Create the event
        var event = new CustomEvent("loadFile", {
            "detail": [
                blob,
                radLevel,
                wholeOrPart,
                product
            ]
        });
        // Dispatch/Trigger/Fire the event
        document.dispatchEvent(event);
    });
    xhr.onprogress = (event) => {
        // event.loaded returns how many bytes are downloaded
        // event.total returns the total number of bytes
        // event.total is only available if server sends `Content-Length` header
        //console.log(`%c Downloaded ${ut.formatBytes(event.loaded)} of ${ut.formatBytes(event.total)}`, 'color: #bada55');
        //var complete = (event.loaded / event.total * 50 | 0);
        console.log(ut.formatBytes(event.loaded))
    }
    xhr.send();
}

function getLatestFile(sta, callbck) {
    document.getElementById('spinnerParent').style.display = 'block';
    var curTime = new Date();
    var year = curTime.getUTCFullYear();
    var month = curTime.getUTCMonth() + 1;
    month = "0" + month.toString();
    var day = curTime.getUTCDate();
    day = "0" + day.toString();
    var stationToGet = sta.toUpperCase().replace(/ /g, '')
    var fullURL = "https://noaa-nexrad-level2.s3.amazonaws.com/?list-type=2&delimiter=%2F&prefix=" + year + "%2F" + month + "%2F" + day + "%2F" + stationToGet + "%2F"
    //console.log(fullURL)
    $.get(ut.phpProxy + fullURL, function (data) {
        var dataToWorkWith = JSON.stringify(ut.xmlToJson(data)).replace(/#/g, 'HASH')
        dataToWorkWith = JSON.parse(dataToWorkWith)
        //console.log(dataToWorkWith)
        var filenameKey = dataToWorkWith.ListBucketResult.Contents
        var latestFileName = filenameKey[filenameKey.length - 1].Key.HASHtext.slice(16);
        if (latestFileName.includes('MDM')) {
            latestFileName = filenameKey[filenameKey.length - 2].Key.HASHtext.slice(16);
        }
        callbck(latestFileName, year, month, day, stationToGet);
    })
};

function getLatestL3File(sta, pro, cb) {
    document.getElementById('spinnerParent').style.display = 'block';
    var curTime = new Date();
    var year = curTime.getUTCFullYear();
    var month = curTime.getUTCMonth() + 1;
    month = "0" + month.toString();
    var day = curTime.getUTCDate();
    day = "0" + day.toString();
    var stationToGet = sta.toUpperCase().replace(/ /g, '')
    var urlBase = "https://unidata-nexrad-level3.s3.amazonaws.com/";
    var filenamePrefix = `${sta}_${pro}_${year}_${month}_${day}`;
    var urlPrefInfo = '?list-type=2&delimiter=/%2F&prefix=';
    var fullURL = `${urlBase}${urlPrefInfo}${filenamePrefix}`
    $.get(ut.phpProxy + fullURL, function (data) {
        var dataToWorkWith = JSON.stringify(ut.xmlToJson(data)).replace(/#/g, 'HASH')
        dataToWorkWith = JSON.parse(dataToWorkWith)
        console.log(dataToWorkWith)
        var contentsBase = dataToWorkWith.ListBucketResult.Contents;
        var filenameKey = contentsBase[contentsBase.length - 1].Key.HASHtext;

        var finishedURL = `${urlBase}${filenameKey}`;
        cb(finishedURL);
    })
}

function loadLatestFile(levell, pr, tilt, stat) {
    var numLevel = 2;
    if (levell == 'l22') {
        numLevel = 22;
    }
    if (levell == 'l2' || levell == 'l22') {
        mapFuncs.removeMapLayer('baseReflectivity');
        getLatestFile($('#stationInp').val(), function (fileName, y, m, d, s) {
            var individualFileURL = `https://noaa-nexrad-level2.s3.amazonaws.com/${y}/${m}/${d}/${s}/${fileName}`
            console.log(ut.phpProxy + individualFileURL)
            loadFileObject(ut.phpProxy + individualFileURL, fileName, numLevel, pr);
        });
    } else if (levell == 'l3') {
        if ($('#productInput').val() != 'sti') {
            mapFuncs.removeMapLayer('baseReflectivity');
        }
        var tiltProduct = ut.tiltObject[tilt][pr];
        console.log(tiltProduct)
        if (pr != 'N0B' && pr != 'N0G' && pr != 'ref' && pr != 'vel') {
            // https://tgftp.nws.noaa.gov/SL.us008001/DF.of/DC.radar/DS.165h0/SI.kgld/sn.last
            // DS.165h0 = product code 165, N0H (h0)
            var level3url = `${ut.phpProxy}https://tgftp.nws.noaa.gov/SL.us008001/DF.of/DC.radar/DS.${tiltProduct}/SI.${stat}/sn.last`
            console.log(level3url)
            console.log(tiltProduct, stat)
            loadFileObject(level3url, 'sn.last', 3);
        } else {
            getLatestL3File(stat.toUpperCase().slice(1), tiltProduct, function (cbVal) {
                var proxiedCbVal = `${ut.phpProxy}${cbVal}`;
                console.log(cbVal);
                loadFileObject(proxiedCbVal, 'sn.last', 3);
            });
        }
    }
}

module.exports = {
    loadFileObject,
    getLatestFile,
    getLatestL3File,
    loadLatestFile,
    listTilts
}