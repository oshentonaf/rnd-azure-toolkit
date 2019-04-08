// Main router entry point, sets up all route modules

const express = require('express');
const router = express.Router();

const indexRouter = require('./indexRouter');
const genresRouter = require('./genresRouter');
const artistsRouter = require('./artistsRouter');
const albumsRouter = require('./albumsRouter');
const imageRouter = require('./imageRouter');
const jsonRouter = require('./jsonRouter');

router.use('/', indexRouter);
router.use('/genres', genresRouter);
router.use('/artists', artistsRouter);
router.use('/albums', albumsRouter);
router.use('/image', imageRouter);
router.use('/json', jsonRouter);

require('dotenv').load();
const request = require('request');
const ACCOUNT_ACCESS_COG_KEY = process.env.AZURE_STORAGE_COG_KEY;

router.use('/Query', function (req, res, next) {

    // res.send('sending to VISION ......  \n');
        // subscription key.
        const subscriptionKey = ACCOUNT_ACCESS_COG_KEY;
        const uriBase = 'https://westeurope.api.cognitive.microsoft.com/vision/v2.0/analyze';
        const imageUrl = 'https://ldnwalker.blob.core.windows.net/demo5/1554289020170-marsella.png';

        // const queryAzure = function() {

        // Request parameters.
        const params = {
            'visualFeatures': 'Categories,Description,Color',
            'details': '',
            'language': 'en'
        };

        const options = {
            uri: uriBase,
            qs: params,
            body: '{"url": ' + '"' + imageUrl + '"}',
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key' : subscriptionKey
            }
        }

        request.post(options, (error, response, body) => {
            if (error) {
                console.log('Error: ', error);
                return;

            } else if (response) {
                // sendResults();
                res.send(response);
            }
        })
        // }

        // queryAzure(response);
        // console.log(response)

          // send Results when responses come back from BOTH google AND Microsoft Luis
        // let sendResults = function() {
            // console.log('sending results back \n');
            // // Send a JSON response back to the front-end
            // console.log(res);
            // res.send({
            //     request: JSON.stringify(req.body.queryString, null, 4)
            // });
        // }

})

module.exports = router;
