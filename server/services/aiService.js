const db = require('../config/database');

class AIService {
    constructor() {
        console.log('AI Service инициализирован');
    }

    async getRealAnalysisData(period = 'month') {
        try {
            const now = new Date();
            let dateFrom, dateTo;

            switch (period) {
                case 'month':
                    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
                    dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    break;
                case 'quarter':
                    const quarter = Math.floor(now.getMonth() / 3);
                    dateFrom = new Date(now.getFullYear(), quarter * 3, 1);
                    dateTo = new Date(now.getFullYear(), quarter * 3 + 3, 0);
                    break;
                default:
                    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
                    dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            }

            const operations = await db.allAsync(`
                SELECT o.*, c.name as category_name, c.id as category_id
                FROM operations o
                LEFT JOIN categories c ON o.category_id = c.id
                WHERE o.operation_date BETWEEN ? AND ?
                ORDER BY o.operation_date DESC
            `, [dateFrom.toISOString().split('T')[0], dateTo.toISOString().split('T')[0]]);

            const expensesByCategory = {};
            let totalExpense = 0, totalIncome = 0;
            const expenses = [];

            operations.forEach(op => {
                if (op.type === 'expense') {
                    totalExpense += op.amount;
                    expenses.push(op);
                    const categoryName = op.category_name || 'Без категории';
                    if (!expensesByCategory[categoryName]) {
                        expensesByCategory[categoryName] = { total: 0, count: 0, operations: [] };
                    }
                    expensesByCategory[categoryName].total += op.amount;
                    expensesByCategory[categoryName].count += 1;
                    expensesByCategory[categoryName].operations.push(op);
                } else {
                    totalIncome += op.amount;
                }
            });

            const sortedCategories = Object.entries(expensesByCategory)
                .sort(([, a], [, b]) => b.total - a.total)
                .slice(0, 10);

            const topExpenses = expenses
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5)
                .map(op => ({
                    amount: op.amount,
                    description: op.description,
                    category: op.category_name || 'Без категории',
                    date: op.operation_date
                }));

            const frequentExpenses = expenses.filter(op => op.amount < 1000).length;

            return {
                period: { start: dateFrom, end: dateTo, name: period === 'month' ? 'месяц' : 'квартал' },
                statistics: {
                    totalOperations: operations.length,
                    totalExpense, totalIncome,
                    balance: totalIncome - totalExpense,
                    expenseCount: expenses.length,
                    incomeCount: operations.length - expenses.length
                },
                categories: sortedCategories,
                topExpenses,
                frequentExpenses,
                operations: operations.slice(0, 20),
                rawData: { expensesByCategory, allExpenses: expenses }
            };
        } catch (error) {
            console.error('Ошибка получения реальных данных:', error);
            throw error;
        }
    }

    async deleteAnalysis(id) {
        try {
            const analysis = await db.getAsync('SELECT * FROM ai_analytics WHERE id = ?', [id]);
            if (!analysis) return { success: false, message: 'Анализ не найден' };

            await db.runAsync('DELETE FROM ai_analytics WHERE id = ?', [id]);
            return { success: true, message: 'Анализ успешно удален' };
        } catch (error) {
            console.error('Ошибка удаления анализа:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteAnalysesByType(analysisType) {
        try {
            await db.runAsync('DELETE FROM ai_analytics WHERE analysis_type = ?', [analysisType]);
            return { success: true, message: `Все анализы типа "${analysisType}" удалены` };
        } catch (error) {
            console.error('Ошибка удаления анализов по типу:', error);
            return { success: false, error: error.message };
        }
    }

    async analyzeEconomy() {
        try {
            const data = await this.getRealAnalysisData('month');

            if (data.statistics.totalOperations === 0) {
                return {
                    success: true,
                    analysis: `📊 **Анализ расходов**\n\nУ вас еще нет операций за текущий месяц.\n\n**Что можно сделать:**\n1. Добавьте несколько операций доходов и расходов\n2. Укажите категории для расходов\n3. Заполните описания для лучшего анализа\n\nПосле добавления данных я смогу дать конкретные рекомендации по экономии.`,
                    data: { totalExpense: 0, topExpenses: [], period: data.period, hasData: false }
                };
            }

            const analysis = this.generateEconomyAnalysis(data);
            await db.runAsync(`
                INSERT INTO ai_analytics (analysis_type, period_start, period_end, content, summary, insights)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                'economy_tips',
                data.period.start.toISOString().split('T')[0],
                data.period.end.toISOString().split('T')[0],
                JSON.stringify({ analysis, statistics: data.statistics, topCategories: data.categories.slice(0, 3) }),
                `Анализ экономии за ${this.getMonthName(data.period.start.getMonth())} ${data.period.start.getFullYear()}`,
                JSON.stringify({
                    criticalCategories: data.categories.slice(0, 3).map(([name]) => name),
                    potentialSavings: Math.round(data.statistics.totalExpense * 0.15),
                    largeExpensesCount: data.topExpenses.length,
                    frequentSmallExpenses: data.frequentExpenses
                })
            ]);

            return {
                success: true,
                analysis: analysis,
                data: {
                    totalExpense: data.statistics.totalExpense,
                    topExpenses: data.topExpenses,
                    categories: data.categories,
                    period: data.period,
                    hasData: true
                }
            };
        } catch (error) {
            console.error('Ошибка AI анализа экономии:', error);
            return {
                success: false,
                error: error.message,
                analysis: "Извините, произошла ошибка при анализе данных. Пожалуйста, попробуйте позже."
            };
        }
    }

    generateEconomyAnalysis(data) {
        const { statistics, categories, topExpenses, frequentExpenses, period } = data;

        let analysis = `📊 **Анализ ваших расходов за ${period.name}**\n\n`;
        analysis += `**Основные показатели:**\n`;
        analysis += `• Общие расходы: ${this.formatCurrency(statistics.totalExpense)}\n`;
        analysis += `• Общие доходы: ${this.formatCurrency(statistics.totalIncome)}\n`;
        analysis += `• Баланс: ${this.formatCurrency(statistics.balance)}\n`;
        analysis += `• Всего операций: ${statistics.totalOperations}\n\n`;

        if (categories.length > 0) {
            analysis += `**Расходы по категориям (топ-5):**\n`;
            categories.slice(0, 5).forEach(([category, info], index) => {
                const percentage = Math.round((info.total / statistics.totalExpense) * 100);
                analysis += `${index + 1}. ${category}: ${this.formatCurrency(info.total)} (${percentage}%, ${info.count} операций)\n`;
            });
            analysis += `\n`;
        }

        if (topExpenses.length > 0) {
            analysis += `**Самые крупные расходы:**\n`;
            topExpenses.forEach((expense, index) => {
                analysis += `${index + 1}. ${this.formatCurrency(expense.amount)} - ${expense.description || 'Без описания'} (${expense.category})\n`;
            });
            analysis += `\n`;
        }

        if (frequentExpenses > 10) {
            analysis += `⚠️ **Внимание:** У вас ${frequentExpenses} мелких расходов (менее 1,000 ₽). Они могут суммироваться в значительную сумму.\n\n`;
        }

        analysis += `**Конкретные рекомендации:**\n`;

        if (categories.length > 0) {
            const topCategory = categories[0];
            if (topCategory) {
                const [categoryName, categoryInfo] = topCategory;
                const categoryPercentage = Math.round((categoryInfo.total / statistics.totalExpense) * 100);
                if (categoryPercentage > 30) {
                    analysis += `1. **${categoryName}** занимает ${categoryPercentage}% ваших расходов. Рассмотрите возможность сокращения.\n`;
                }
            }

            if (statistics.totalExpense > statistics.totalIncome * 0.8) {
                analysis += `2. Ваши расходы составляют более 80% от доходов. Рекомендуется увеличить норму сбережений.\n`;
            }

            if (frequentExpenses > 0) {
                analysis += `3. Объединяйте мелкие покупки для лучшего контроля над расходами.\n`;
            }
        } else {
            analysis += `1. Начните добавлять категории к расходам для более детального анализа.\n`;
            analysis += `2. Заполняйте описания операций - это поможет AI давать более точные рекомендации.\n`;
        }

        analysis += `\n**Следующие шаги:**\n`;
        analysis += `• Установите месячный бюджет для ключевых категорий\n`;
        analysis += `• Отслеживайте прогресс каждую неделю\n`;
        analysis += `• Используйте функцию "Прогноз" для планирования\n`;

        return analysis;
    }

    async generateQuarterReport() {
        try {
            const data = await this.getRealAnalysisData('quarter');

            if (data.statistics.totalOperations === 0) {
                return {
                    success: true,
                    report: `📈 **Квартальный финансовый отчет**\n\nЗа последний квартал у вас не было операций.\n\n**Рекомендации:**\n1. Начните вести учет доходов и расходов\n2. Добавляйте операции регулярно\n3. Указывайте категории для лучшего анализа\n\nПосле накопления данных смогу предоставить детальные отчеты.`,
                    period: data.period
                };
            }

            const report = this.generateQuarterReportAnalysis(data);
            await db.runAsync(`
                INSERT INTO ai_analytics (analysis_type, period_start, period_end, content, summary)
                VALUES (?, ?, ?, ?, ?)
            `, [
                'quarter_report',
                data.period.start.toISOString().split('T')[0],
                data.period.end.toISOString().split('T')[0],
                JSON.stringify({ report, statistics: data.statistics, categories: data.categories }),
                `Квартальный отчет ${this.getQuarterName(data.period.start)} ${data.period.start.getFullYear()}`
            ]);

            return { success: true, report: report, period: data.period };
        } catch (error) {
            console.error('Ошибка генерации квартального отчета:', error);
            return {
                success: false,
                error: error.message,
                report: "Извините, произошла ошибка при генерации отчета. Пожалуйста, попробуйте позже."
            };
        }
    }

    generateQuarterReportAnalysis(data) {
        const { statistics, categories, period } = data;

        let report = `📈 **Квартальный финансовый отчет**\n`;
        report += `Период: ${this.formatDate(period.start)} - ${this.formatDate(period.end)}\n\n`;

        report += `**Финансовые результаты:**\n`;
        report += `• Общий доход: ${this.formatCurrency(statistics.totalIncome)}\n`;
        report += `• Общие расходы: ${this.formatCurrency(statistics.totalExpense)}\n`;
        report += `• Финансовый результат: ${this.formatCurrency(statistics.balance)}\n`;
        report += `• Норма сбережений: ${statistics.totalIncome > 0 ? Math.round((statistics.balance / statistics.totalIncome) * 100) : 0}%\n`;
        report += `• Всего операций: ${statistics.totalOperations}\n\n`;

        if (categories.length > 0) {
            report += `**Структура расходов:**\n`;
            categories.forEach(([category, info], index) => {
                const percentage = Math.round((info.total / statistics.totalExpense) * 100);
                report += `${index + 1}. ${category}: ${this.formatCurrency(info.total)} (${percentage}%)\n`;
            });
            report += `\n`;
        }

        report += `**Анализ эффективности:**\n`;
        if (statistics.balance > 0) {
            report += `✅ Положительный финансовый результат\n`;
            if (statistics.balance > statistics.totalIncome * 0.2) {
                report += `• Отличная норма сбережений (более 20%)\n`;
            }
        } else {
            report += `⚠️ Отрицательный баланс. Рекомендуется пересмотреть структуру расходов.\n`;
        }

        report += `\n**Рекомендации на следующий квартал:**\n`;
        if (categories.length > 0) {
            const topCategory = categories[0];
            if (topCategory) {
                const [categoryName] = topCategory;
                report += `1. Обратите внимание на категорию "${categoryName}" - самая затратная\n`;
            }
        }
        report += `2. Планируйте крупные покупки заранее\n`;
        report += `3. Регулярно отслеживайте прогресс по бюджету\n`;
        report += `4. Рассмотрите возможность инвестирования части сбережений\n`;

        return report;
    }

    async generateForecast() {
        try {
            const now = new Date();
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

            const historicalData = await db.allAsync(`
                SELECT 
                    strftime('%Y-%m', operation_date) as month,
                    type,
                    SUM(amount) as total_amount,
                    COUNT(*) as count
                FROM operations
                WHERE operation_date >= ?
                GROUP BY strftime('%Y-%m', operation_date), type
                ORDER BY month
            `, [threeMonthsAgo.toISOString().split('T')[0]]);

            const currentMonthData = await this.getRealAnalysisData('month');
            const forecast = this.generateForecastAnalysis(historicalData, currentMonthData);

            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            await db.runAsync(`
                INSERT INTO ai_forecasts (forecast_date, forecast_type, predicted_income, predicted_expense, confidence_level, recommendations)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                nextMonth.toISOString().split('T')[0],
                'monthly',
                this.extractPredictedIncome(forecast),
                this.extractPredictedExpense(forecast),
                0.7,
                JSON.stringify({ forecast, analysis: "Прогноз на основе исторических данных" })
            ]);

            return { success: true, forecast: forecast, historicalData: historicalData };
        } catch (error) {
            console.error('Ошибка генерации прогноза:', error);
            return {
                success: false,
                error: error.message,
                forecast: "Извините, произошла ошибка при генерации прогноза. Пожалуйста, попробуйте позже."
            };
        }
    }

    generateForecastAnalysis(historicalData, currentMonthData) {
        let forecast = `🔮 **Финансовый прогноз на следующий месяц**\n\n`;

        if (historicalData.length === 0 && currentMonthData.statistics.totalOperations === 0) {
            forecast += `Недостаточно данных для точного прогноза.\n\n`;
            forecast += `**Что нужно сделать:**\n`;
            forecast += `1. Добавьте операции за текущий месяц\n`;
            forecast += `2. Регулярно ведите учет\n`;
            forecast += `3. Через месяц будет достаточно данных для прогнозирования\n`;
            return forecast;
        }

        if (historicalData.length > 0) {
            forecast += `**Анализ исторических данных (${historicalData.length} месяцев):**\n`;

            const monthlyData = {};
            historicalData.forEach(item => {
                if (!monthlyData[item.month]) monthlyData[item.month] = { income: 0, expense: 0 };
                if (item.type === 'income') monthlyData[item.month].income = item.total_amount;
                if (item.type === 'expense') monthlyData[item.month].expense = item.total_amount;
            });

            Object.entries(monthlyData).forEach(([month, data]) => {
                forecast += `• ${month}: Доходы ${this.formatCurrency(data.income)}, Расходы ${this.formatCurrency(data.expense)}\n`;
            });
            forecast += `\n`;
        }

        forecast += `**Текущий месяц:**\n`;
        forecast += `• Доходы: ${this.formatCurrency(currentMonthData.statistics.totalIncome)}\n`;
        forecast += `• Расходы: ${this.formatCurrency(currentMonthData.statistics.totalExpense)}\n`;
        forecast += `• Баланс: ${this.formatCurrency(currentMonthData.statistics.balance)}\n\n`;

        forecast += `**Прогноз на следующий месяц:**\n`;

        if (currentMonthData.statistics.totalIncome > 0) {
            const predictedIncome = Math.round(currentMonthData.statistics.totalIncome * 1.05);
            const predictedExpense = Math.round(currentMonthData.statistics.totalExpense * 1.03);

            forecast += `• Ожидаемый доход: ${this.formatCurrency(predictedIncome)} (±10%)\n`;
            forecast += `• Ожидаемые расходы: ${this.formatCurrency(predictedExpense)} (±15%)\n`;
            forecast += `• Прогнозируемая прибыль: ${this.formatCurrency(predictedIncome - predictedExpense)}\n`;
            forecast += `• Уверенность прогноза: 70%\n\n`;
        }

        forecast += `**Рекомендации:**\n`;
        forecast += `1. Поддерживайте текущую структуру доходов\n`;
        forecast += `2. Контролируйте рост расходов в категориях: ${currentMonthData.categories.slice(0, 3).map(([cat]) => cat).join(', ')}\n`;
        forecast += `3. Создайте финансовую подушку на 3-6 месяцев\n`;

        return forecast;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
        }).format(amount);
    }

    formatDate(date) {
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    getMonthName(monthIndex) {
        const months = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        return months[monthIndex];
    }

    getQuarterName(date) {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Q${quarter}`;
    }

    extractPredictedIncome(text) {
        const match = text.match(/Ожидаемый доход: [^\d]*([\d\s]+) ₽/);
        return match ? parseInt(match[1].replace(/\s/g, '')) : null;
    }

    extractPredictedExpense(text) {
        const match = text.match(/Ожидаемые расходы: [^\d]*([\d\s]+) ₽/);
        return match ? parseInt(match[1].replace(/\s/g, '')) : null;
    }

    async getSavedAnalyses(type = null, limit = 10) {
        try {
            let query = `SELECT * FROM ai_analytics`;
            const params = [];

            if (type) {
                query += ` WHERE analysis_type = ?`;
                params.push(type);
            }

            query += ` ORDER BY created_at DESC LIMIT ?`;
            params.push(limit);

            const analyses = await db.allAsync(query, params);
            return {
                success: true,
                data: analyses.map(a => ({
                    ...a,
                    content: a.content ? JSON.parse(a.content) : null,
                    insights: a.insights ? JSON.parse(a.insights) : null
                }))
            };
        } catch (error) {
            console.error('Ошибка получения анализов:', error);
            return { success: false, error: error.message };
        }
    }

    async chatWithAI(message, context = 'general') {
        try {
            let recentData = null;
            try {
                recentData = await this.getRealAnalysisData('month');
            } catch (error) {
                console.log('Не удалось получить данные для контекста чата:', error.message);
            }

            let response = this.generateChatResponse(message, recentData);

            try {
                await db.runAsync(`
                    INSERT INTO ai_chat_history (user_message, ai_response, context_type, metadata)
                    VALUES (?, ?, ?, ?)
                `, [
                    message,
                    response,
                    context,
                    JSON.stringify({
                        timestamp: new Date().toISOString(),
                        hasData: recentData ? recentData.statistics.totalOperations > 0 : false
                    })
                ]);
            } catch (dbError) {
                console.error('Ошибка сохранения истории чата:', dbError);
            }

            return { success: true, response: response, tokens: 0 };
        } catch (error) {
            console.error('Ошибка AI чата:', error);
            return {
                success: false,
                error: error.message,
                response: "Извините, произошла ошибка. Пожалуйста, попробуйте еще раз."
            };
        }
    }

    generateChatResponse(message, data) {
        const lowerMessage = message.toLowerCase();

        if (data && data.statistics.totalOperations > 0) {
            if (lowerMessage.includes('где сэкономить') || lowerMessage.includes('экономия')) {
                return this.generateEconomyAnalysis(data);
            }

            if (lowerMessage.includes('отчет') || lowerMessage.includes('статистика')) {
                return this.generateQuarterReportAnalysis(data);
            }

            if (lowerMessage.includes('прогноз') || lowerMessage.includes('ожидать')) {
                return `На основе ваших данных могу сделать прогноз. Используйте кнопку "Прогноз на месяц" для детального анализа.\n\nКратко: ${data.statistics.balance >= 0 ? 'Положительная динамика' : 'Требуется оптимизация расходов'}.`;
            }

            if (lowerMessage.includes('сколько потратил') || lowerMessage.includes('расходы')) {
                return `За текущий месяц вы потратили ${this.formatCurrency(data.statistics.totalExpense)}.\nОсновные категории: ${data.categories.slice(0, 3).map(([cat]) => cat).join(', ')}.`;
            }
        }

        const responses = {
            'привет': 'Здравствуйте! Я ваш финансовый помощник. Могу проанализировать ваши расходы, дать советы по экономии или сделать прогноз.',
            'помощь': 'Я могу:\n• Проанализировать ваши расходы и дать советы по экономии\n• Создать квартальный финансовый отчет\n• Сделать прогноз на следующий месяц\n• Ответить на вопросы о ваших финансах\n\nИспользуйте быстрые действия или задавайте конкретные вопросы.',
            'default': 'Я финансовый помощник. Могу помочь с анализом ваших финансовых данных. Задавайте конкретные вопросы или используйте быстрые действия для анализа.'
        };

        for (const [key, value] of Object.entries(responses)) {
            if (lowerMessage.includes(key)) {
                return value;
            }
        }

        return responses.default;
    }
}

module.exports = new AIService();