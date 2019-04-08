const express = require('express');
const router = express.Router();
require('dotenv').load();
const request = require('request');
console.log('***** ***** ***** ***** NODE SIDE ***** ***** ***** ***** ' );
console.log('testing env keys are here = ' + process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY);

module.exports = {
    getJson(req, res) {
        // res.send('Hello World! JSON page');
        // console.log(res);

     return res.render('music', { data: 'reached /json index route!' });
    },
};
