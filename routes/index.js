// Main router entry point, sets up all route modules

const express = require('express');
const router = express.Router();

require('dotenv').load();

const path = require('path'),
    fs = require('fs'),
    formidable = require('formidable'),
    readChunk = require('read-chunk'),
    fileType = require('file-type');

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

const multer = require('multer');
const inMemoryStorage = multer.memoryStorage();
const uploadStrategy = multer({ storage: inMemoryStorage }).single('image');
const getStream = require('into-stream');

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

const request = require('request');
const STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const ACCOUNT_ACCESS_KEY = process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY;
const STORAGE_ACCOUNT_COG_NAME = process.env.AZURE_STORAGE_COG_NAME;
const ACCOUNT_ACCESS_COG_KEY = process.env.AZURE_STORAGE_COG_KEY;

router.post('/azure', function (req, res, next) {
    var photos = [],
    form = new formidable.IncomingForm();

    // Tells formidable that there will be multiple files sent.
    form.multiples = true;

    // go up folder one level
    let reqPath = path.join(__dirname, '../');
    // Upload directory for the images
    form.uploadDir = path.join(reqPath, 'tmp_uploads');

    // Invoked when a file has finished uploading.
    form.on('file', function (name, file, fullPath) {
        // Allow only 1 files to be uploaded.
        // if (photos.length === 1) {
        //     fs.unlink(file.path,  err => { if (err) console.log('photos.length === 3 =   ' + err) });
        //     return true;
        // }

        var buffer = null,
            type = null,
            filename = '';

        buffer = readChunk.sync(file.path, 0, 262);
        type = fileType(buffer);

        // Check the file type, must be either png, gif or jpeg
        if (type !== null && (type.ext === 'png' || type.ext === 'gif' || type.ext === 'jpeg')) {
            // Assign new file name
            filename = Date.now() + '-' + file.name;

            // set temp path for copy
            let reqPath = path.join(__dirname, '../');
            tempFile = ('/uploads/' + filename);
            // create full path needed in other functions
            let fullPath = path.join(reqPath, tempFile);

            // Move the file with the new file name & CALLS function to call EXCUTE
            fs.rename(file.path, fullPath, uploadCallback(fullPath));

            // Add to the list of photos
            photos.push({
                status: true,
                filename: filename,
                type: type.ext,
                publicPath: 'uploads/' + filename
            });

        } else {
            photos.push({
                status: false,
                filename: file.name,
                message: 'Invalid file type'
            });
            fs.unlink(file.path);
        }

     return fullPath;
    // need to get fullpath to SDK async func
    });

    form.on('error', function(err) {
        console.log('Error occurred during processing - ' + err);
    });

    // Invoked when all the fields have been processed.
    form.on('end', function() {
        // console.log('All the request fields have been processed.');
    });

    // Parse the incoming form fields.
    form.parse(req, function (err, fields, files) {
        res.status(200).json(photos);
    });

    return fullPath
    // need to get fullpath to SDK async func
})


//
// This Function passes FULL PATH and excutes the SDK
const uploadCallback = function(fullPath, err) {
    // console.log('uploadCallback  tempFile >  ' +  fullPath);
    // execute(fullPath).then(() => console.log("Done")).catch((e) => console.log(e));
    execute(fullPath)
}

router.use('/Query', function (req, res, next) {
    const subscriptionKey = ACCOUNT_ACCESS_COG_KEY;
    const uriBase = 'https://westeurope.api.cognitive.microsoft.com/vision/v2.0/analyze';
    // const imageUrl = 'https://ldnwalker.blob.core.windows.net/demo5/1554289020170-marsella.png';
    const tempFileShort = tempFile.split('/Users/oliver.shenton/Sites/rnd-azure-toolkit/uploads/').pop();
    const imageUrl = 'https://ldnwalker.blob.core.windows.net/demo5/' + tempFileShort;

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
            res.send(response);
        }
    })
})


async function execute( tempFile, next ) {
    const containerName = "demo5";
    const localFilePath = tempFile;
    const ONE_MINUTE = 60 * 1000;
    const aborter = Aborter.timeout(30 * ONE_MINUTE);

    const credentials = new SharedKeyCredential(STORAGE_ACCOUNT_NAME, ACCOUNT_ACCESS_KEY);
    const pipeline = StorageURL.newPipeline(credentials);
    const serviceURL = new ServiceURL(`https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`, pipeline);

    const containerURL = ContainerURL.fromServiceURL(serviceURL, containerName);

    await uploadLocalFile(aborter, containerURL, localFilePath);
    // console.log(`Local file "${localFilePath}" is uploaded`);

    await uploadStream(aborter, containerURL, localFilePath);
    // console.log(`Local file "${localFilePath}" is uploaded as a stream`);

    // console.log(` go cognative  `);
    // await cognativeGo(tempFile);
}


async function uploadLocalFile(aborter, containerURL, filePath) {
    filePath = path.resolve(filePath);
    const fileName = path.basename(filePath);
    const blockBlobURL = BlockBlobURL.fromContainerURL(containerURL, fileName);

    return await uploadFileToBlockBlob(aborter, filePath, blockBlobURL);
}

async function uploadStream(aborter, containerURL, filePath) {
    filePath = path.resolve(filePath);

    const fileName = path.basename(filePath).replace('.md', '-stream.md');
    const blockBlobURL = BlockBlobURL.fromContainerURL(containerURL, fileName);

    const stream = fs.createReadStream(filePath, {
      highWaterMark: FOUR_MEGABYTES,
    });

    const uploadOptions = {
      bufferSize: FOUR_MEGABYTES,
      maxBuffers: 5,
    };

    return await uploadStreamToBlockBlob(
      aborter,
      stream,
      blockBlobURL,
      uploadOptions.bufferSize,
      uploadOptions.maxBuffers);
}


//  WORKING HARDCODED EXAMPLE
router.use('/QueryFixed2', function (req, res, next) {

    // console.log(req)
    let formData = req.body.datavalue;
    // console.log(formData)

    const subscriptionKey = ACCOUNT_ACCESS_COG_KEY;
    const uriBase = 'https://westeurope.api.cognitive.microsoft.com/vision/v2.0/analyze';
    // const imageUrl = `https://ldnwalker.blob.core.windows.net/demo5/` + formData;
    const imageUrl =  formData;
    
    console.log(' img url ===  '    + imageUrl);

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
            res.send(response);
        }
    })
})


//  WORKING HARDCODED EXAMPLE
router.use('/QueryFixed', function (req, res, next) {
    const subscriptionKey = ACCOUNT_ACCESS_COG_KEY;
    const uriBase = 'https://westeurope.api.cognitive.microsoft.com/vision/v2.0/analyze';
    const imageUrl = 'https://ldnwalker.blob.core.windows.net/demo5/1554372732105-lane3.png';

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
            res.send(response);
        }
    })
})

module.exports = router;
