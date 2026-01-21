const analyticsStorage = require('../services/aiAnalyticsStorage');

const testAddAnalysis = async (req, res) => {
    try {
        const { type, title, content, summary } = req.body;
        if (!type || !title || !content) {
            return res.status(400).json({ success: false, message: 'Тип, заголовок и содержание обязательны' });
        }

        const result = await analyticsStorage.saveAnalysis(
            type,
            title,
            content,
            100,
            { test: true, timestamp: new Date().toISOString(), summary: summary || title }
        );

        if (result.success) {
            res.json({ success: true, message: 'Тестовый анализ создан', id: result.id });
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('❌ Ошибка в testAddAnalysis:', error);
        res.status(500).json({ success: false, message: 'Ошибка создания тестового анализа', error: error.message });
    }
};

const getAnalyses = async (req, res) => {
    try {
        const { type, limit } = req.query;
        const result = await analyticsStorage.getAnalyses(type, parseInt(limit) || 10);
        res.json(result);
    } catch (error) {
        console.error('❌ Ошибка в getAnalyses:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = { testAddAnalysis, getAnalyses };