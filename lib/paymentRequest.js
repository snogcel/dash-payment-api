"use strict";
var bcypher = require('blockcypher');
var Bitcore = require('@dashevo/dashcore-lib');
var PaymentProtocol = require('@dashevo/dashcore-payment-protocol');
var fs = require('fs');

var sha256sha256 = Bitcore.crypto.Hash.sha256sha256;
var sha256 = Bitcore.crypto.Hash.sha256;
var base64url = require('base64url');

var orders = require('./orders.js');
var config = require('./config.js').config;
var bcapi = new bcypher('dash','main',config.bcypher_token);

//get chain info
var getChain = function(cb) {

    bcapi.getChain(function(err, res) {
        if (err !== null) {
            cb(err, res);
        } else {
            cb(null, res);
        }
    });

};

var createHDWallet = function(cb) {

    if (config.testnet) {

        // Skip creation of HDWallet if on testnet
        cb(null, null);

    } else {

        // Create HD Wallet via BlockCypher API
        bcapi.createHDWallet(config.wallet, function(err, res) {
            if (err !== null) {
                cb(err, res);
            } else {
                cb(null, res);
            }
        });

        // Expected API Responses
        // {"error":"Error: wallet exists"}
        // {"token":"9f60f42688fd4d009efa837168ad8715","name":"bob2","hd":true,"extended_public_key":"xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8","chains":[{"chain_addresses":[]}]}

    }

};

var getHDWallet  = function(cb) {

    if (config.testnet) {

        // We can skip validation of created wallet as we can derive from the HD Public Key in config
        var res = {
            "token": null,
            "name": config.wallet.name,
            "hd": true,
            "extended_public_key": config.wallet.extended_public_key,
            "chains": [
                { "chain_addresses": [] }
            ]
        };

        cb(null, res);

    } else {

        // Query BlockCypher API for Wallet
        bcapi.getHDWallet(config.wallet.name, function(err, res) {

            if (err !== null) {

                cb(err, res);

            } else {

                // Check if BlockCypher has record of this wallet
                if (res.hasOwnProperty('error') && res.error === "Error: wallet not found") {

                    createHDWallet(cb); // if not, create wallet via BlockCypher API

                } else {

                    cb(null, res); // if wallet exists, return BlockCypher API response

                }

            }

        });

        // Expected API Responses
        // {"error":"Error: wallet not found"}
        // {"token":"9f60f42688fd4d009efa837168ad8715","name":"bob2","hd":true,"extended_public_key":"xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8","chains":[{"chain_addresses":[]}]}

    }

};


var deriveAddrHDWallet = function(cb) {

    if (config.testnet) {

        // derive address using Bitcore and emulate BlockCypher response
        var hdPublicKey = Bitcore.HDPublicKey(config.wallet.extended_public_key);
        var derivedAddress = new Bitcore.Address(hdPublicKey.derive("m/0").publicKey, Bitcore.Networks.testnet);

        var res = {
            "chains": [ {
                "chain_addresses": [ {
                    "address": derivedAddress.toString(),
                    "public": hdPublicKey.derive("m/0").publicKey.toString(),
                    "path": "m/0"
                } ]
            }
            ]
        };

        cb(null, res);

    } else {

        var params = {};

        // Derive Address from BlockCypher Wallet
        bcapi.deriveAddrHDWallet(config.wallet.name, params, function(err, res) {
            if (err !== null) {
                cb(err, res);
            } else {
                cb(null, res);
            }
        });

        // Expected API Responses
        // {"chains":[{"chain_addresses":[{"address":"XpypxrU8Bo44i68HXdJPSitjdRB92Wmy6w","public":"027c4b09ffb985c298afe7e5813266cbfcb7780b480ac294b0b43dc21f2be3d13c","path":"m/0"}]}]}

    }

};


var createDetails = function(amount, merchant_data, cb) {

    var amount = amount;

    var now = Date.now() / 1000 | 0;

    getHDWallet(function(err, res) { // retrieve HD Wallet

        if (err !== null) {

            cb(err,null);

        } else {

            deriveAddrHDWallet(function(err, res) { // generate payment address

                if (err !== null) {

                    cb(err,null);

                } else {

                    var webhook = {
                        "event": "unconfirmed-tx",
                        "address": res.chains[0].chain_addresses[0].address,
                        "url": config.site_url + "/paymentWebHook"
                    };

                    // register BlockCypher webhook
                    bcapi.createHook(webhook, function(err, result) {

                        var merchant_data = new Buffer(JSON.stringify({
                            "webhook_id": result.id
                        }));

                        var address = Bitcore.Address.fromString(res.chains[0].chain_addresses[0].address); // payment destination address

                        var script = Bitcore.Script.buildPublicKeyHashOut(address);

                        var output = new PaymentProtocol.Output();
                        output.set('amount', amount); // amount in duffs
                        output.set('script', script.toBuffer()); // an instance of script

                        var details = new PaymentProtocol().makePaymentDetails();

                        if(config.testnet) {
                            details.set('network', 'test');
                        } else {
                            details.set('network', 'main');
                        }

                        details.set('outputs', output);
                        details.set('time', now);
                        details.set('expires', now + 60 * 60 * 24);
                        details.set('memo', 'A payment request from the merchant.');
                        details.set('payment_url', config.site_url + '/payment');
                        details.set('merchant_data', merchant_data); // identify the request

                        // console.log(details);

                        cb(null, details, webhook);

                    });


                }

            });

        }

    });

};


var createRequest = function(amount, merchant_data, cb) {

    // create payment details message
    createDetails(amount, merchant_data, function(err,details,webhook) {

        var details = details;
        var webhook = webhook;

        // load the X509 certificate
        var certificates = new PaymentProtocol().makeX509Certificates();

        var cert = fs.readFileSync('./certificates/api.slayer.work.crt');

        var der = PaymentProtocol.PEMtoDER(cert.toString());

        // console.log(der);

        certificates.set('certificate', der);

        // form the request
        var request = new PaymentProtocol().makePaymentRequest();
        request.set('payment_details_version', 1);
        request.set('pki_type', 'x509+sha256');
        request.set('pki_data', certificates.serialize());
        request.set('serialized_payment_details', details.serialize());
        request.sign(fs.readFileSync('./certificates/private.key')); // sign with corresponding private key

        // get request hash
        var hash = sha256(request.serialize());
        var encodedHash = base64url(hash);

        // serialize the request
        var rawbody = request.serialize();

        // store in mongo db
        var merchant_data = JSON.parse(details.get('merchant_data').toString());
        var data = {
            "hash": encodedHash,
            "request": rawbody,
            "webhook_id": merchant_data.webhook_id,
            "webhook": webhook,
            "payment_details": details,
            "status": 'pending'
        };

        console.log("- payment details -");
        console.log(data);

        orders.putOrder(data, function(err, res) {

            cb(null, rawbody);

        });

    });

};


module.exports = {
    getChain: getChain,
    getHDWallet: getHDWallet,
    deriveAddrHDWallet: deriveAddrHDWallet,
    createRequest: createRequest
};
