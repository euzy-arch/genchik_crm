// routes/aiStorageRoutes.js
const express = require('express');
const router = express.Router();
const { testAddAnalysis, getAnalyses } = require('../controllers/aiStorageController');

router.post('/ai/test-add-analysis', testAddAnalysis);
router.get('/ai/analyses', getAnalyses);

module.exports = router;