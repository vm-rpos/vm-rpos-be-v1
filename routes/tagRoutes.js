// routes/tagRoutes.js
const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');

router.get('/', tagController.getAllTags);
router.post('/', tagController.createTag);
router.delete('/:id', tagController.deleteTag);
router.put('/:id', tagController.updateTag);

module.exports = router;