const db = require('../config/database');

class AIAnalyticsStorage {
    constructor() {
        this.initTable();
    }

    async initTable() {
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
            console.log('✅ Таблица ai_analyses создана/проверена');
        } catch (error) {
            console.error('❌ Ошибка создания таблицы ai_analyses:', error);
        }
    }

    async saveAnalysis(type, title, content, tokens = 0, dataContext = null) {
        try {
            const result = await db.runAsync(
                `INSERT INTO ai_analyses (type, title, content, tokens, data_context) VALUES (?, ?, ?, ?, ?)`,
                [type, title, content, tokens, JSON.stringify(dataContext)]
            );

            console.log(`📝 Анализ сохранен: ${title} (ID: ${result.lastID})`);
            return { success: true, id: result.lastID, message: 'Анализ сохранен' };
        } catch (error) {
            console.error('❌ Ошибка сохранения анализа:', error);
            return { success: false, error: error.message };
        }
    }

    async getAnalyses(type = null, limit = 10) {
        try {
            let query = 'SELECT * FROM ai_analyses';
            const params = [];

            if (type) {
                query += ' WHERE type = ?';
                params.push(type);
            }

            query += ' ORDER BY created_at DESC LIMIT ?';
            params.push(limit);

            const analyses = await db.allAsync(query, params);
            console.log(`📊 Получено анализов: ${analyses.length}`);

            return {
                success: true,
                data: analyses.map(a => ({
                    ...a,
                    data_context: a.data_context ? JSON.parse(a.data_context) : null
                })),
                count: analyses.length
            };
        } catch (error) {
            console.error('❌ Ошибка получения анализов:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteAnalysis(id) {
        try {
            await db.runAsync('DELETE FROM ai_analyses WHERE id = ?', [id]);
            console.log(`🗑️ Анализ удален: ${id}`);
            return { success: true, message: 'Анализ удален' };
        } catch (error) {
            console.error('❌ Ошибка удаления анализа:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteAnalysesByType(type) {
        try {
            await db.runAsync('DELETE FROM ai_analyses WHERE type = ?', [type]);
            console.log(`🗑️ Удалены анализы типа: ${type}`);
            return { success: true, message: `Анализы типа ${type} удалены` };
        } catch (error) {
            console.error('❌ Ошибка удаления анализов:', error);
            return { success: false, error: error.message };
        }
    }

    async toggleFavorite(id) {
        try {
            const current = await db.getAsync('SELECT is_favorite FROM ai_analyses WHERE id = ?', [id]);
            if (!current) return { success: false, message: 'Анализ не найден' };

            const newValue = current.is_favorite ? 0 : 1;
            await db.runAsync('UPDATE ai_analyses SET is_favorite = ? WHERE id = ?', [newValue, id]);

            return {
                success: true,
                is_favorite: Boolean(newValue),
                message: newValue ? 'Добавлено в избранное' : 'Убрано из избранного'
            };
        } catch (error) {
            console.error('❌ Ошибка обновления избранного:', error);
            return { success: false, error: error.message };
        }
    }

    async getFavorites() {
        try {
            const favorites = await db.allAsync('SELECT * FROM ai_analyses WHERE is_favorite = 1 ORDER BY created_at DESC');
            return { success: true, data: favorites, count: favorites.length };
        } catch (error) {
            console.error('❌ Ошибка получения избранного:', error);
            return { success: false, error: error.message };
        }
    }

    async getAnalysisById(id) {
        try {
            const analysis = await db.getAsync('SELECT * FROM ai_analyses WHERE id = ?', [id]);
            if (!analysis) return { success: false, message: 'Анализ не найден' };

            return {
                success: true,
                data: {
                    ...analysis,
                    data_context: analysis.data_context ? JSON.parse(analysis.data_context) : null
                }
            };
        } catch (error) {
            console.error('❌ Ошибка получения анализа:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new AIAnalyticsStorage();