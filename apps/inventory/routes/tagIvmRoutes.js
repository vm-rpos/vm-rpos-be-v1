const express = require('express');
const router = express.Router();
const ivmTagController = require('../controllers/tagController');
const protect = require('../../pos/middlewares/authMiddleware');

router.use(protect);

router.get('/', ivmTagController.getAllIvmTags);
router.post('/', ivmTagController.createIvmTag);
router.put('/:id', ivmTagController.updateIvmTag);
router.delete('/:id', ivmTagController.deleteIvmTag);

module.exports = router;
