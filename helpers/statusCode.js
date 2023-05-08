const statusCodes = require('./statusCodes.json'),
    statusCodesToPhrases = {};

statusCodes.forEach(function (item) {
    var code = parseInt(item.code, 10),
        phrase;

    // Ignore codes for classes
    if (code.toString() !== item.code) {
        return;
    }

    phrase = item.phrase.toUpperCase().replace(/[^A-Z]/g, '_');

    statusCodesToPhrases[code] = item.phrase;
});

module.exports = statusCodesToPhrases;
