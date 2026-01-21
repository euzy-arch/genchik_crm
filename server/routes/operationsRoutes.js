const express = require('express');
const router = express.Router();
const {
    // Операции
    getAllOperations,
    getOperationById,
    createOperation,
    updateOperation,
    deleteOperation,

    // Категории
    getAllCategories,
    createCategory,

    // Аналитика
    getStatistics,
    getExpensesByCategory,
    getSummary
} = require('../controllers/operationsController');

// ========== Операции ==========
router.get('/operations', getAllOperations);
router.get('/operations/:id', getOperationById);
router.post('/operations', createOperation);
router.put('/operations/:id', updateOperation);
router.delete('/operations/:id', deleteOperation);

// ========== Категории ==========
router.get('/categories', getAllCategories);
router.post('/categories', createCategory);

// ========== Аналитика ==========
router.get('/analytics/statistics', getStatistics);
router.get('/analytics/expenses-by-category', getExpensesByCategory);
router.get('/analytics/summary', getSummary);

module.exports = router;