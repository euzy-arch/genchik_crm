const aiService = require('../services/mistralAIService');
const db = require('../config/database');

async function initAnalyticsTable() {
    try {
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS ai_analyses (
                                                       id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                       type TEXT NOT NULL,
                                                       title TEXT NOT NULL,
                                                       content TEXT NOT NULL,
                                                       tokens INTEGER DEFAULT 0,
                                                       data_context TEXT,
                                                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                                       is_favorite BOOLEAN DEFAULT 0
            )
        `);
        console.log('✅ Таблица ai_analyses создана');
    } catch (error) {
        console.error('❌ Ошибка создания таблицы:', error);
    }
}

initAnalyticsTable().catch(console.error);

async function saveAnalysisToDB(analysisData) {
    try {
        const { type, title, content, tokens = 0, data_context = '' } = analysisData;
        console.log(`💾 Сохранение анализа: "${title}" (${type})`);

        const result = await db.runAsync(
            `INSERT INTO ai_analyses (type, title, content, tokens, data_context) VALUES (?, ?, ?, ?, ?)`,
            [type, title, String(content), tokens, data_context]
        );

        console.log(`✅ Анализ сохранен с ID: ${result.lastID}`);
        return { success: true, id: result.lastID, message: 'Анализ сохранен' };
    } catch (error) {
        console.error('❌ Ошибка сохранения анализа:', error.message);
        return { success: false, error: error.message, details: 'Проверьте структуру данных' };
    }
}

const analyzeEconomy = async (req, res) => {
    try {
        console.log('🔄 Запрос анализа экономии...');
        const result = await aiService.analyzeEconomy();
        const saveResult = await saveAnalysisToDB({
            type: 'economy_tips',
            title: 'Анализ экономии расходов',
            content: result.analysis,
            tokens: result.tokens || 0,
            data_context: JSON.stringify({
                dataSource: 'AI анализ',
                categories: result.data?.map(item => item.category) || []
            })
        });

        res.json({
            success: true,
            data: result.analysis,
            metadata: result.data,
            saved: saveResult.success,
            savedId: saveResult.id
        });
    } catch (error) {
        console.error('❌ Ошибка в analyzeEconomy:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка анализа экономии',
            error: error.message
        });
    }
};

const getQuarterReport = async (req, res) => {
    try {
        console.log('🔄 Запрос квартального отчета...');
        const result = await aiService.generateQuarterReport();
        const saveResult = await saveAnalysisToDB({
            type: 'quarter_report',
            title: `Квартальный отчет ${result.period}`,
            content: result.report,
            tokens: result.tokens || 0,
            data_context: JSON.stringify({
                period: result.period,
                dataSource: 'AI генерация'
            })
        });

        res.json({
            success: true,
            data: result.report,
            period: result.period,
            saved: saveResult.success,
            savedId: saveResult.id
        });
    } catch (error) {
        console.error('❌ Ошибка в getQuarterReport:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка генерации отчета',
            error: error.message
        });
    }
};

const getForecast = async (req, res) => {
    try {
        console.log('🔄 Запрос прогноза...');
        const result = await aiService.generateForecast();
        const saveResult = await saveAnalysisToDB({
            type: 'forecast',
            title: 'Финансовый прогноз',
            content: result.forecast,
            tokens: result.tokens || 0,
            data_context: JSON.stringify({
                historicalData: result.historicalData || [],
                dataSource: 'AI прогноз'
            })
        });

        res.json({
            success: true,
            data: result.forecast,
            historicalData: result.historicalData,
            saved: saveResult.success,
            savedId: saveResult.id
        });
    } catch (error) {
        console.error('❌ Ошибка в getForecast:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка генерации прогноза',
            error: error.message
        });
    }
};

const chat = async (req, res) => {
    try {
        const { message, context } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'Сообщение обязательно' });
        }
        const result = await aiService.chatWithAI(message, context || 'general');
        res.json({ success: result.success, data: result.response, tokens: result.tokens });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка AI чата', error: error.message });
    }
};

const getAnalyses = async (req, res) => {
    try {
        const { type, limit = 10 } = req.query;
        let query = 'SELECT * FROM ai_analyses';
        const params = [];

        if (type) {
            query += ' WHERE type = ?';
            params.push(type);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const analyses = await db.allAsync(query, params);
        const formattedAnalyses = analyses.map(a => {
            try {
                let dataContext = {};
                if (a.data_context) dataContext = JSON.parse(a.data_context);

                return {
                    id: a.id,
                    analysis_type: a.type,
                    title: a.title || '',
                    content: { analysis: a.content || '', report: a.content || '', forecast: a.content || '' },
                    summary: a.title || '',
                    insights: dataContext,
                    created_at: a.created_at,
                    period_start: a.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
                    period_end: a.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
                };
            } catch (parseError) {
                console.error(`❌ Ошибка парсинга анализа ID ${a.id}:`, parseError);
                return {
                    id: a.id,
                    analysis_type: a.type || 'unknown',
                    title: a.title || '',
                    content: { analysis: a.content || 'Ошибка загрузки' },
                    summary: a.title || 'Анализ',
                    insights: {},
                    created_at: a.created_at
                };
            }
        });

        res.json({ success: true, data: formattedAnalyses, count: formattedAnalyses.length });
    } catch (error) {
        console.error('❌ Ошибка в getAnalyses:', error.message);
        res.status(500).json({ success: false, message: 'Ошибка получения анализов', error: error.message });
    }
};

const testAddAnalysis = async (req, res) => {
    try {
        const { analysis_type, title, content } = req.body;
        if (!analysis_type || !title || !content) {
            return res.status(400).json({ success: false, message: 'Тип, заголовок и содержание обязательны' });
        }

        const saveResult = await saveAnalysisToDB({
            type: analysis_type,
            title,
            content,
            data_context: JSON.stringify({ test: true })
        });

        if (saveResult.success) {
            res.json({ success: true, message: 'Тестовый анализ создан', id: saveResult.id });
        } else {
            res.status(500).json(saveResult);
        }
    } catch (error) {
        console.error('❌ Ошибка в testAddAnalysis:', error);
        res.status(500).json({ success: false, message: 'Ошибка создания анализа', error: error.message });
    }
};

const getAnalysisById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: 'ID анализа обязателен' });
        }

        const analysis = await db.getAsync('SELECT * FROM ai_analyses WHERE id = ?', [id]);
        if (!analysis) {
            return res.status(404).json({ success: false, message: 'Анализ не найден' });
        }

        let dataContext = {};
        if (analysis.data_context) dataContext = JSON.parse(analysis.data_context);

        res.json({
            success: true,
            data: {
                id: analysis.id,
                analysis_type: analysis.type,
                title: analysis.title,
                content: analysis.content,
                insights: dataContext,
                created_at: analysis.created_at
            }
        });
    } catch (error) {
        console.error('❌ Ошибка в getAnalysisById:', error);
        res.status(500).json({ success: false, message: 'Ошибка получения анализа', error: error.message });
    }
};

const deleteAnalysis = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: 'ID анализа обязателен' });
        }
        await db.runAsync('DELETE FROM ai_analyses WHERE id = ?', [id]);
        res.json({ success: true, message: 'Анализ удален' });
    } catch (error) {
        console.error('❌ Ошибка удаления:', error);
        res.status(500).json({ success: false, message: 'Ошибка удаления', error: error.message });
    }
};

const deleteAnalysesByType = async (req, res) => {
    try {
        const { type } = req.params;
        if (!type) {
            return res.status(400).json({ success: false, message: 'Тип анализа обязателен' });
        }
        await db.runAsync('DELETE FROM ai_analyses WHERE type = ?', [type]);
        res.json({ success: true, message: `Анализы типа ${type} удалены` });
    } catch (error) {
        console.error('❌ Ошибка удаления:', error);
        res.status(500).json({ success: false, message: 'Ошибка удаления', error: error.message });
    }
};

const toggleFavorite = async (req, res) => {
    res.json({ success: true, message: 'Заглушка' });
};

const refreshData = async (req, res) => {
    try {
        console.log('🔄 Обновление данных для AI...');
        const operations = await db.allAsync(`
            SELECT o.*, c.name as category_name
            FROM operations o
                     LEFT JOIN categories c ON o.category_id = c.id
            ORDER BY o.operation_date DESC
        `);

        const categories = await db.allAsync('SELECT * FROM categories');
        const expensesByCategory = await db.allAsync(`
            SELECT
                c.id,
                c.name,
                COUNT(o.id) as operations_count,
                COALESCE(SUM(o.amount), 0) as total_amount
            FROM categories c
                     LEFT JOIN operations o ON c.id = o.category_id AND o.type = 'expense'
            GROUP BY c.id, c.name
            HAVING total_amount > 0
            ORDER BY total_amount DESC
        `);

        const totalExpenses = expensesByCategory.reduce((sum, cat) => sum + cat.total_amount, 0);
        console.log('✅ Данные обновлены');

        res.json({
            success: true,
            message: 'Данные обновлены для AI анализа',
            data: {
                operations_count: operations.length,
                categories_count: categories.length,
                expense_categories: expensesByCategory.length,
                total_expenses: totalExpenses,
                last_updated: new Date().toISOString()
            },
            sample_data: {
                top_expense_categories: expensesByCategory.slice(0, 3),
                recent_operations: operations.slice(0, 5).map(op => ({
                    id: op.id,
                    type: op.type,
                    amount: op.amount,
                    description: op.description,
                    category: op.category_name
                }))
            }
        });
    } catch (error) {
        console.error('❌ Ошибка обновления данных:', error);
        res.status(500).json({ success: false, message: 'Ошибка обновления данных', error: error.message });
    }
};

module.exports = {
    analyzeEconomy, getQuarterReport, getForecast, chat, getAnalyses,
    getAnalysisById, toggleFavorite, deleteAnalysis, deleteAnalysesByType,
    testAddAnalysis, refreshData
};