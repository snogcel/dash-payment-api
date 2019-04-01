"use strict";

var Bitcore = require('@dashevo/dashcore-lib');
var PaymentProtocol = require('@dashevo/dashcore-payment-protocol');
var BlockExplorer = require('./blockExplorer.js');

var orders = require('./orders.js');
var config = require('./config.js').config;

// TODO - verify Payment fulfills PaymentRequest / PaymentDetails

// TODO - verify InstantSend status

var compareTx = function (txObj, payment_details) {

    var outputs = payment_details.message.outputs; // mongo db payment details

    // Check Payment Address & Amount

    var transactionScript = Bitcore.Script(txObj.outputs[0].script); // from payment message
    var transactionAmount = txObj.outputs[0].satoshis || txObj.outputs[0].value; // from payment message

    var outputScript = Bitcore.Script(outputs[0].script.buffer.buffer); // from mongo db
    var outputAmount = outputs[0].amount.low; // from mongo db

    console.log(transactionScript.toHex());
    console.log(transactionAmount);

    console.log(outputScript.toHex());
    console.log(outputAmount);

    if (outputScript.toHex() == transactionScript.toHex() && outputAmount == transactionAmount) {
        console.log('...output script and amounts match');
        return true;
    } else {
        return false;
    }

};

var processMessage = function(rawbody, cb) {

    var body = PaymentProtocol.Payment.decode(rawbody);
    var payment = new PaymentProtocol().makePayment(body);
    var merchant_data = JSON.parse(payment.get('merchant_data').toString());
    var transactions = payment.get('transactions');
    var refund_to = payment.get('refund_to');
    var memo = payment.get('memo');

    // query mongo db for matching webhook id / payment request
    orders.getOrder(merchant_data.webhook_id, function(err, res) {

        var tx = Bitcore.Transaction(transactions[0].buffer.slice(transactions[0].offset));
        var txObj = tx.toObject(); // payment message transaction

        var valid = compareTx(txObj, res[0].payment_details);

        if (valid) {

            // TODO - rebroadcast transaction to verify it's real?

            var tx = Bitcore.Transaction(transactions[0].buffer.slice(transactions[0].offset));
            var txObj = tx.toObject(); // payment message transaction

            // if testnet, allow zero-conf and begin ENiO charging process

            // make a payment acknowledgement
            var ack = new PaymentProtocol().makePaymentACK();
            ack.set('payment', payment.message);
            ack.set('memo', 'Thank you for your payment!');
            var rawbody = ack.serialize();

            cb(null, rawbody);

        }

        // TODO - handle incorrect amount / payment_details not found case

        // TODO - update order status in mongo db

        // TODO - access ENiO API to begin charging

    });

};

var processWebHook = function(transaction, cb) {

    // query mongo db for corresponding address
    orders.getOrderByAddress(transaction.addresses[0], function(err, res) {

        // TODO - parse through all addresses involved in transaction, for now assume it is the first address.

        // TODO - if PaymentRequest does not exist, fail gracefully...

        console.log(res[0]);

        var valid = compareTx(transaction, res[0].payment_details);

        if (valid) {

            // TODO - query Insight API to check InstantSend status

            BlockExplorer.getTx(transaction.hash, function (err,res) {

                // 0-Conf ?
                // InstantSend ?

                console.log("querying blockchain for " + transaction.hash);
                console.log(res);

                // TODO - ENiO API stuff goes here

            });

        }

        cb(null, res);

    });


};

/*
var rawbody = {
    "block_height": -1,
    "block_index": -1,
    "hash": "12043d061934f7ff7505b52b3e136a192ba7306ab089abf826ec33645be1420b",
    "addresses": [
        "yacRyoYZdLi93q3q6UcnUkK5uhfWWNjd9t",
        "CFr99841LyMkyX5ZTGepY58rjXJhyNGXHf"
    ],
    "total": 39052500,
    "fees": 10000,
    "size": 191,
    "preference": "low",
    "relayed_by": "127.0.0.1:42487",
    "received": "2018-01-04T17:27:13.492Z",
    "ver": 1,
    "double_spend": false,
    "vin_sz": 1,
    "vout_sz": 2,
    "confirmations": 0,
    "inputs": [
        {
            "prev_hash": "e92205b535a72950bf0a7518e0d712056f230b4e3360e88e3836537ac901d244",
            "output_index": 0,
            "script": "473044022066c1dcb030bc43825018afec2d3424be6ab9eba85593a85857b0b2523293f72a0220575136e09aefa3899db3c7c70573d656484fd779119c6e1e159a640f19f3844301",
            "output_value": 39062500,
            "sequence": 4294967295,
            "addresses": [
                "CFr99841LyMkyX5ZTGepY58rjXJhyNGXHf"
            ],
            "script_type": "pay-to-pubkey",
            "age": 1650254
        }
    ],
    "outputs": [
        {
            "value": 100000,
            "script": "76a9149cc81b6123672392b6e2ca1019d6d7d295fae01e88ac",
            "addresses": [
                "yacRyoYZdLi93q3q6UcnUkK5uhfWWNjd9t"
            ],
            "script_type": "pay-to-pubkey-hash"
        },
        {
            "value": 38952500,
            "script": "76a914f93d302789520e8ca07affb76d4ba4b74ca3b3e688ac",
            "addresses": [
                "CFr99841LyMkyX5ZTGepY58rjXJhyNGXHf"
            ],
            "script_type": "pay-to-pubkey-hash"
        }
    ]
};

processWebHook(rawbody, function(err, res) {
    console.log(res);
});
*/

module.exports = {
    processMessage: processMessage,
    processWebHook: processWebHook
};
