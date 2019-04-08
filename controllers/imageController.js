// Controller for all /image routes

const express = require('express');
const request = require('request');
const router = express.Router();

require('dotenv').load();
  console.log('***** ***** ***** ***** NODE SIDE ***** ***** ***** ***** ' );
  console.log('testing env keys are here = ' + process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY);

  const {
    Aborter,
    BlockBlobURL,
    ContainerURL,
    ServiceURL,
    SharedKeyCredential,
    StorageURL,
    uploadStreamToBlockBlob,
    uploadFileToBlockBlob
} = require('@azure/storage-blob');


const STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const ACCOUNT_ACCESS_KEY = process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY;

const STORAGE_ACCOUNT_COG_NAME = process.env.AZURE_STORAGE_COG_NAME;
const ACCOUNT_ACCESS_COG_KEY = process.env.AZURE_STORAGE_COG_KEY;

const ONE_MEGABYTE = 1024 * 1024;
const FOUR_MEGABYTES = 4 * ONE_MEGABYTE;
const ONE_MINUTE = 60 * 1000;



router.get('/image', function (req, res, tempFile) {
  // Don't bother about this :)

  console.log('1###blah');
  res.send('1###blah');


});



router.get('/azure', function (req, res, fullPath) {
  res.send('###blah');
  res.json({ a: 9999 })
  res.send('req ' + req + 'res ' + res);
  console.log('req ' + req + 'res ' + res);

  var photos = [],
  form = new formidable.IncomingForm();

  // Tells formidable that there will be multiple files sent.
  form.multiples = true;
  // Upload directory for the images
  form.uploadDir = path.join(__dirname, 'tmp_uploads');


  form.on('error', function(err) {
    console.log('Error occurred during processing - ' + err);
  });

  // Invoked when all the fields have been processed.
  form.on('end', function() {
    console.log('All the request fields have been processed.');
  });

  // Parse the incoming form fields.
  form.parse(req, function (err, fields, files) {
    res.status(200).json(photos);
  });

  return fullPath
  // need to get fullpath to SDK async func
});



async function showBlobNames(aborter, containerURL) {

  let response;
  let marker;

  do {
      response = await containerURL.listBlobFlatSegment(aborter);
      marker = response.marker;
      for(let blob of response.segment.blobItems) {
          console.log(` - ${ blob.name }`);
      }
  } while (marker);
}

async function execute( tempFile ) {

  const containerName = "demo5";
  const blobName = "test.txt";
  const content = "hello!";

  const localFilePath = tempFile;

  const credentials = new SharedKeyCredential(STORAGE_ACCOUNT_NAME, ACCOUNT_ACCESS_KEY);
  const pipeline = StorageURL.newPipeline(credentials);
  const serviceURL = new ServiceURL(`https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`, pipeline);

  const containerURL = ContainerURL.fromServiceURL(serviceURL, containerName);
  const blockBlobURL = BlockBlobURL.fromContainerURL(containerURL, blobName);

  const aborter = Aborter.timeout(30 * ONE_MINUTE);

  console.log("Containers:");
  await showContainerNames(aborter, serviceURL);

  await blockBlobURL.upload(aborter, content, content.length);
  console.log(`Blob "${blobName}" is uploaded`);

  console.log("await localFilePath:" + localFilePath);

  await uploadLocalFile(aborter, containerURL, localFilePath);
  console.log(`Local file "${localFilePath}" is uploaded`);

  await uploadStream(aborter, containerURL, localFilePath);
  console.log(`Local file "${localFilePath}" is uploaded as a stream`);

  console.log(`Blobs in "${containerName}" container:`);
  await showBlobNames(aborter, containerURL);

  console.log(` go cognative  `);
  await cognativeGo(tempFile);

}


const cognativeGo = function ( tempFile = '' ) {

  const request = require('request');

  // subscription key.
  const subscriptionKey = ACCOUNT_ACCESS_COG_KEY;

  // You must use the same location in your REST call as you used to get your
  // subscription keys. For example, if you got your subscription keys from
  // westus, replace "westcentralus" in the URL below with "westus".

  const uriBase = 'https://westeurope.api.cognitive.microsoft.com/vision/v2.0/analyze';

  const tempFileShort = tempFile.split('/Users/oliver.shenton/Sites/rnd-azure-toolkit/uploads/').pop();

  const imageUrl = 'https://ldnwalker.blob.core.windows.net/demo5/' + tempFileShort;

  // console.log('imageUrl = ' + imageUrl);

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
  };


  request.post(options, (error, response, body) => {
    if (error) {
      console.log('Error: ', error);
      return;
    }
    let jsonResponse = JSON.stringify(JSON.parse(body), null, '  ');
    console.log('JSON Response\n');
    console.log(jsonResponse);

    // console.log(response);

    // body.send({
    //   //"request": JSON.stringify(req.body.queryString, null, 4),
    //   "response": jsonResponse,
    //   "msg": 'Hello World'
    // });

    res.send( jsonResponse );

  });

  console.log('sending results...');

}


module.exports = {
  getImage(req, res) {
    return res.render('image', { data: 'reached /image index route! for azure stuff' });
  },
};