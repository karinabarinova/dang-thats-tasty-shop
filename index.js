const express = require('express');
const router = express.Router();
const storeController = require('./controller')

router.get('/', storeController.homePage);

module.exports = router;