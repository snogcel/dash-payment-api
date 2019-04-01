# dash-payment-api

Requrements: mongodb

Installation:

1) npm install
2) ./start.sh

Notes:

1) BIP70 relies on SSL Certificates to encrypt Payment Request message contents.
2) This SSL certificate can be self-signed for testing purposes, however it will only work in Dash Core Wallet.
2) For use on Mobile Wallets, a properly-obtained SSL Certificate is required.

Testing:

1) Open Dash Core Wallet
2) Open URI: dash://?r=http://localhost:3001/paymentRequest

Replace "localhost" with the IP Address or Domain Name of your server.
