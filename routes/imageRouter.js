// All /image routes

const express = require('express');
const router = express.Router();

const { getImage } = require('../controllers/imageController');

router.get('/', getImage);

module.exports = router;