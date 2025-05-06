// routes/tagRoutes.js
const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const protect = require('../middlewares/authMiddleware')

router.use(protect); // Protect all routes in this file

router.get('/', tagController.getAllTags);
router.post('/', tagController.createTag);
router.delete('/:id', tagController.deleteTag);
router.put('/:id', tagController.updateTag);

module.exports = router;