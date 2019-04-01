"use strict";

var request = require('request');
var config = require('./config.js').config;

const INSIGHT_API = 'https://insight.dashevo.org/insight-api-dash';
const INSIGHT_API_TESTNET = 'https://testnet-insight.dashevo.org/insight-api-dash';

var _get = function(url, cb) {

    if (config.testnet) {
        var provider = INSIGHT_API_TESTNET;
    } else {
        var provider = INSIGHT_API;
    }

    var urlr = provider + url;

    request.get({
        url:urlr,
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

var getTx = function(txid, cb) {

    var url = '/tx/' + txid;

    _get(url, function(err,res) {
        cb(err, res);
    });

};

module.exports = {
    getTx: getTx
};
