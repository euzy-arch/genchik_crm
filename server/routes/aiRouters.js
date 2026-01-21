const express = require('express');
const router = express.Router();
const {
    analyzeEconomy, getQuarterReport, getForecast, chat,
    getAnalyses, getAnalysisById, toggleFavorite, deleteAnalysis,
    deleteAnalysesByType, testAddAnalysis, refreshData
} = require('../controllers/aiController');

// AI Routes
router.post('/ai/analyze-economy', analyzeEconomy);
router.get('/ai/quarter-report', getQuarterReport);
router.get('/ai/forecast', getForecast);
router.post('/ai/chat', chat);

// Аналитика
router.get('/ai/analyses', getAnalyses);
router.get('/ai/analyses/:id', getAnalysisById);
router.post('/ai/analyses/:id/favorite', toggleFavorite);
router.delete('/ai/analyses/:id', deleteAnalysis);
router.delete('/ai/analyses/type/:type', deleteAnalysesByType);
router.post('/ai/refresh-data', refreshData);

// Тестовый эндпоинт
router.post('/ai/test-add-analysis', testAddAnalysis);

// Отладочный эндпоинт
router.get('/ai/debug-tables', async (req, res) => {
    try {
        const db = require('../config/database');
        const tables = await db.allAsync("SELECT name FROM sqlite_master WHERE type='table'");
        const aiTables = tables.filter(t => t.name.includes('ai_')).map(t => t.name);

        const results = {};
        for (const tableName of aiTables) {
            try {
                const count = await db.allAsync(`SELECT COUNT(*) as count FROM ${tableName}`);
                const columns = await db.allAsync(`PRAGMA table_info(${tableName})`);
                results[tableName] = { count: count[0]?.count || 0, columns: columns.map(c => c.name) };
            } catch (e) {
                results[tableName] = { error: e.message };
            }
        }

        res.json({ success: true, allTables: tables.map(t => t.name), aiTables: results, recommendation: 'Используйте таблицу: ai_analyses' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check
router.get('/ai/health', (req, res) => {
    res.json({ success: true, message: 'AI API работает', timestamp: new Date().toISOString() });
});

module.exports = router;