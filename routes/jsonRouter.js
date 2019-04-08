// All /artists routes

const express = require('express');
const router = express.Router();

const { getJson } = require('../controllers/jsonController');

router.get('/', getJson);
router.post('/', getJson);

module.exports = router;