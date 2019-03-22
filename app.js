var express = require('express'),
    path = require('path'),
    fs = require('fs'),
    formidable = require('formidable'),
    readChunk = require('read-chunk'),
    fileType = require('file-type');

  require('dotenv').load();
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

const multer = require('multer');
const inMemoryStorage = multer.memoryStorage();
const uploadStrategy = multer({ storage: inMemoryStorage }).single('image');
const getStream = require('into-stream');

const STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const ACCOUNT_ACCESS_KEY = process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY;

const ONE_MEGABYTE = 1024 * 1024;
const FOUR_MEGABYTES = 4 * ONE_MEGABYTE;
const ONE_MINUTE = 60 * 1000;

var app = express();

app.set('port', (process.env.PORT || 5000));

// Tell express to serve static files from the following directories
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.use('/public', express.static(path.join(__dirname, 'public')))

/**
 * Index route
 */
app.get('/', function (req, res, tempFile) {
    // Don't bother about this :)

  console.log('###blah');

  var filesPath = path.join(__dirname, 'uploads/');
  fs.readdir(filesPath, function (err, files) {
      if (err) {
          console.log(err);
          return;
      }

      files.forEach(function (file) {
          fs.stat(filesPath + file, function (err, stats) {
              if (err) {
                  console.log(err);
                  return;
              }

              var createdAt = Date.parse(stats.ctime),
                  days = Math.round((Date.now() - createdAt) / (1000*60*60*24));

              if (days > 1) {
                  fs.unlink(filesPath + file,  err => { if (err) console.log('days > 1 err =   ' + err) });
              }
          });
      });
  });

  res.sendFile(path.join(__dirname, 'views/index.html'));
});


app.post('/azure', function (req, res, fullPath) {

  console.log('***** NODE SIDE ' );


  var photos = [],
  form = new formidable.IncomingForm();

  // Tells formidable that there will be multiple files sent.
  form.multiples = true;
  // Upload directory for the images
  form.uploadDir = path.join(__dirname, 'tmp_uploads');

// Invoked when a file has finished uploading.
  form.on('file', function (name, file, fullPath) {
    // Allow only 1 files to be uploaded.
    if (photos.length === 1) {
        fs.unlink(file.path,  err => { if (err) console.log('photos.length === 3 =   ' + err) });
        return true;
    }

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
        tempFile = ('/uploads/' + filename);
        // create full path needed in other functions
        let fullPath = path.join(__dirname, tempFile);

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
        fs.unlink(file.path,  err => { if (err) console.log('fs.unlink(file.path =   ' + err) });
    }

    return fullPath;
    // need to get fullpath to SDK async func
  });

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


//
// This Function passes FULL PATH and excutes the SDK
const uploadCallback = function(fullPath, err) {
  console.log('uploadCallback  tempFile >  ' +  fullPath);
  execute(fullPath).then(() => console.log("Done")).catch((e) => console.log(e));
}

async function showContainerNames(aborter, serviceURL) {

  let response;
  let marker;

  do {
      response = await serviceURL.listContainersSegment(aborter, marker);
      marker = response.marker;
      for(let container of response.containerItems) {
          console.log(` - ${ container.name }`);
      }
  } while (marker);
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

  // await containerURL.create(aborter);
  // console.log(`Container: "${containerName}" is created`);

  await blockBlobURL.upload(aborter, content, content.length);
  console.log(`Blob "${blobName}" is uploaded`);

  console.log("await localFilePath:" + localFilePath);

  await uploadLocalFile(aborter, containerURL, localFilePath);
  console.log(`Local file "${localFilePath}" is uploaded`);

  await uploadStream(aborter, containerURL, localFilePath);
  console.log(`Local file "${localFilePath}" is uploaded as a stream`);

  console.log(`Blobs in "${containerName}" container:`);
  await showBlobNames(aborter, containerURL);

  // const downloadResponse = await blockBlobURL.download(aborter, 0);
  // const downloadedContent = downloadResponse.readableStreamBody.read(content.length).toString();
  // console.log(`Downloaded blob content: "${downloadedContent}"`);

  // await blockBlobURL.delete(aborter)
  // console.log(`Block blob "${blobName}" is deleted`);

  // await containerURL.delete(aborter);
  // console.log(`Container "${containerName}" is deleted`);
}

app.listen(app.get('port'), function() {
    console.log('Express started at port ' + app.get('port'));
});

module.exports = app;

console.log(' ** RUNNG ** ');
