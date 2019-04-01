"use strict";

var request = require('request');

const EXCHANGE_RATE_API = 'https://www.dash.org/api/v1/exchange';

var _get = function(url, cb) {

    request.get({
        url:url,
        strictSSL:true,
        json: true
    }, function (error, response, body) {
        if (error || response.statusCode !== 200) {
            cb(error, body || {});
        } else {
            cb(null, body);
        }
    });
};

var getExchangeRate = function(cb) {

    _get(EXCHANGE_RATE_API, function(err,res) {
        cb(err, res[0]);
    });

};

module.exports = {
    getExchangeRate: getExchangeRate
};


