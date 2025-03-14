const express = require('express');
const { printReceipt, printReceipt2 } = require('../controllers/printerController');
// const { printReceiptWithSystem } = require('../controllers/systemPrinterController');

const router = express.Router();

router.post('/print', printReceipt2);
// router.post('/print-system', printReceiptWithSystem);

module.exports = router;
