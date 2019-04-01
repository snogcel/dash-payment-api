"use strict";

var express = require('express');
var app = express();
var bodyParser = require("body-parser");

var bcypher = require('blockcypher');

var paymentRequest = require('./paymentRequest.js'); // generate PaymentRequest message
var payment = require('./payment.js'); // parse Payment message from client
var exchangeRate = require('./exchangeRate.js');
var orders = require('./orders.js');

var rawBodySaver = function (req, res, buf, encoding) {
    if (buf && buf.length) {
        req.rawBody = buf.toString(encoding || 'utf8');
    }
};

app.use(bodyParser.json({ verify: rawBodySaver }));
app.use(bodyParser.urlencoded({ verify: rawBodySaver, extended: true }));
app.use(bodyParser.raw({ verify: rawBodySaver, type: '*/*' }));

// Add headers for CORS support
app.use(function (req, res, next) {

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();

});

// Used for testing Payment Request via JSON
app.get('/test', function(req,res){
	
    /*
    var txid = 'ad11862b5d33c2f5080e36461fb4fd3fb15319708cefd9c16d41954743f3dbad';

    bcapi.getTXLock(txid, function(err, result) {
        if (err !== null) {
            res.send(JSON.stringify(err));
        } else {
            res.send(JSON.stringify(result));
        }
    });
    */

    paymentRequest.createRequest(100000,{}, function(err, result) {

        res.send(JSON.stringify(result));

    });

});


app.get('/request/:address', function(req,res) {

    var address = req.params.address;

    // Query database for existing PaymentRequest
    // example: 5f57590a3024565f5dda0b7547490d381dc3893597ff6a65e2d75b37d9161f7d

    if (address) {

        orders.getOrderByAddress(address, function(err, order) {

            if (order[0]) {

                var result = order[0].request.buffer;

                console.log(result);

                res.contentType("application/dash-paymentrequest");
                res.header('Content-Length', result.length);
                res.set ({"Transfer-Encoding": "binary"});

                res.send(new Buffer(result, 'binary'));

            } else {

                // TODO - handle no paymentrequest found

            }

        });

    }

});

// Returns raw PaymentRequest message
app.get('/paymentRequest', function(req,res) {

    var duffs = 1500000;

    paymentRequest.createRequest(duffs,{}, function(err, result) {

        res.contentType("application/dash-paymentrequest");
        res.header('Content-Length', result.length);
        res.set ({"Transfer-Encoding": "binary"});

        res.send(new Buffer(result, 'binary'));

    });

});

// TODO: Consumes Payment message from client
app.post('/payment', function(req,res){

    payment.processMessage(req.body, function(err, result) {

        // console.log(result);

        res.write(result);
        res.send();

    });

});

// TODO: Consumes Web Hook from BlockCypher
app.post('/paymentWebHook', function(req,res){

    console.log("received webhook...");

    payment.processWebHook(req.body, function(err, res) {
        console.log(res);
    });

    // console.log(req.body);

});

var server = app.listen(3001, function () {
    console.log('api server listening on port 3001');
});
