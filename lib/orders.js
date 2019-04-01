"use strict";

var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017';
var database = 'dash_payment_api';

var _getDb = function(cb) {

    MongoClient.connect(url,function(err, client) {

        if (err !== null) {
            throw err;
        } else {
            cb(client);
        }

    });
};

var getOrder = function(id, cb) {

    _getDb(function(client) {

        var db = client.db(database);

        db.collection('orders').find({ "webhook_id": id }).toArray(function (err, items) {

            client.close(); // close db connection
            cb(null, items); // return query result

        });

    });
};

var getOrderByHash = function(hash, cb) {

    _getDb(function(client) {

        var db = client.db(database);

        db.collection('orders').find({ "hash": hash }).toArray(function (err, items) {

            client.close(); // close db connection
            cb(null, items); // return query result

        });

    });

};

var getOrderByAddress = function(address, cb) {

    _getDb(function(client) {

        var db = client.db(database);

        db.collection('orders').find({ "webhook.address": address }).toArray(function (err, items) {

            client.close(); // close db connection
            cb(null, items); // return query result

        });

    });

};

var putOrder = function(data, cb) {

    _getDb(function(client) {

        var db = client.db(database);

        db.collection('orders').insertOne(data, function (err, res) {

            client.close(); // close db connection

            if (err ==! null) {
                throw err;
            } else {
                cb(null, res);
            }

        });

    });
};

var updateOrderStatus = function(webhook_id, status, cb) {

    _getDb(function(client) {

        var db = client.db(database);

        db.collection('orders').updateOne({ "webhook_id": webhook_id }, { $set: { "status": status }},function(err, res) {

            client.close(); // close db connection

            if (err ==! null) {
                throw err;
            } else {
                cb(null, res);
            }

        });

    });

};

// TODO - delete from MongoDB method?

/*

getOrder('9634a12e-1b47-42e5-876b-c0f765bfd30c', function(err, res) {

    console.log(err);
    console.log(res);

});

updateOrderStatus(1, 'pending', function(err, res) {

    if (err) throw err;

    // console.log(res);

});

var data = {
    webhook_id: 1,
    payment_request: 'none',
    status: 'pending'
};

putOrder(data, function(err, res) {

    console.log(res);

});
*/


module.exports = {
    getOrder: getOrder,
    getOrderByAddress: getOrderByAddress,
    getOrderByHash: getOrderByHash,
    putOrder: putOrder,
    updateOrderStatus: updateOrderStatus
};
