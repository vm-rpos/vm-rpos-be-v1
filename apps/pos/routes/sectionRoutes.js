const express = require('express');
const router = express.Router();
const sectionController = require('../controllers/sectionController');
const protect = require('../middlewares/authMiddleware');

router.use(protect); // Protect all routes in this file

router.post('/', sectionController.createSection);
router.get('/', sectionController.getAllSections);
router.get('/:id', sectionController.getSectionById);
router.put('/:id', sectionController.updateSection);
router.delete('/:id', sectionController.deleteSection);

module.exports = router;
