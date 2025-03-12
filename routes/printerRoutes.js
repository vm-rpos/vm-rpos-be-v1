const express = require('express');
const { printReceipt } = require('../controllers/printerController');

const router = express.Router();

router.post('/print', printReceipt);

module.exports = router;
