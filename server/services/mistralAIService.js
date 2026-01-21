const { Mistral } = require('@mistralai/mistralai');
const axios = require('axios');

class MistralAIService {
    constructor() {
        this.apiKey = process.env.MISTRAL_API_KEY || 'nbTw4TZv6Ey64N0hqJlPnRT63ex9QoJ9';
        this.client = new Mistral({ apiKey: this.apiKey });
        this.model = "mistral-small-latest";
        this.apiBaseUrl = 'http://localhost:5001/api';
        console.log(`✅ Mistral AI настроен. Модель: ${this.model}`);
    }

    async fetchDataFromDB(endpoint) {
        try {
            const response = await axios.get(`${this.apiBaseUrl}${endpoint}`, { timeout: 5000 });
            if (response.data.success) return response.data.data || response.data;
            console.warn(`⚠️ Ошибка получения данных из ${endpoint}:`, response.data.message);
            return null;
        } catch (error) {
            console.error(`❌ Ошибка запроса к ${endpoint}:`, error.message);
            return null;
        }
    }

    async getRealExpensesData() {
        try {
            const expensesData = await this.fetchDataFromDB('/analytics/expenses-by-category');
            if (!expensesData || expensesData.length === 0) {
                console.log('📭 Нет данных о расходах в БД');
                return [];
            }
            return expensesData.map(item => ({
                category: item.name,
                amount: item.total_amount || 0,
                operations: item.operations_count || 0
            }));
        } catch (error) {
            console.error('❌ Ошибка получения реальных расходов:', error);
            return [];
        }
    }

    async analyzeEconomy() {
        try {
            console.log('📊 Анализ экономии с реальными данными...');
            const expensesData = await this.getRealExpensesData();
            const operations = await this.fetchDataFromDB('/operations');

            if (!expensesData || expensesData.length === 0) {
                return {
                    success: true,
                    analysis: "## 📝 Нет данных для анализа\n\nДобавьте расходы в систему для получения рекомендаций по экономии.",
                    data: [],
                    tokens: 0
                };
            }

            const prompt = `Проанализируй эти РЕАЛЬНЫЕ расходы и дай рекомендации по экономии:\n\n` +
                `ДАННЫЕ О РАСХОДАХ:\n${JSON.stringify(expensesData, null, 2)}\n\n` +
                `Всего операций в системе: ${operations?.length || 0}\n\n` +
                `Проанализируй и дай конкретные рекомендации.`;

            const result = await this.chatWithAI(prompt, 'economy');
            return {
                success: true,
                analysis: result.response,
                data: expensesData,
                tokens: result.tokens
            };
        } catch (error) {
            console.error('❌ Ошибка в analyzeEconomy:', error);
            return {
                success: false,
                analysis: "Ошибка анализа. Попробуйте позже.",
                data: [],
                tokens: 0
            };
        }
    }

    async generateQuarterReport() {
        try {
            const now = new Date();
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(now.getMonth() - 3);
            const fromDate = threeMonthsAgo.toISOString().split('T')[0];
            const toDate = now.toISOString().split('T')[0];

            const operations = await this.fetchDataFromDB(`/operations?from=${fromDate}&to=${toDate}`);
            const expenses = await this.fetchDataFromDB('/analytics/expenses-by-category');

            const quarterData = {
                period: `Квартал ${this.getCurrentQuarter()}`,
                total_operations: operations?.length || 0,
                expenses_by_category: expenses || [],
                summary: {
                    total_expenses: expenses?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0,
                    top_category: expenses?.[0] || null
                }
            };

            const prompt = `Сгенерируй квартальный финансовый отчет:

ДАННЫЕ ЗА КВАРТАЛ:
${JSON.stringify(quarterData, null, 2)}

СТРУКТУРА ОТЧЕТА:
1. Обзор квартала
2. Ключевые показатели
3. Анализ расходов по категориям
4. Тренды и изменения
5. Выводы и рекомендации

Будь конкретным и профессиональным.`;

            const report = await this.chatWithAI(prompt, 'report');
            return {
                success: true,
                report: report.response,
                period: quarterData.period,
                tokens: report.tokens
            };
        } catch (error) {
            console.error('❌ Ошибка в generateQuarterReport:', error);
            return await this.mockQuarterReport();
        }
    }

    async generateForecast() {
        try {
            const expensesHistory = await this.fetchDataFromDB('/analytics/expenses-by-category');
            const statistics = await this.fetchDataFromDB('/analytics/statistics?period=month');

            const historicalData = {
                current_month: statistics || {},
                expenses_trend: expensesHistory || [],
                analysis_period: 'последний месяц'
            };

            const prompt = `Сделай финансовый прогноз на основе этих данных:

ИСТОРИЧЕСКИЕ ДАННЫЕ:
${JSON.stringify(historicalData, null, 2)}

СДЕЛАЙ ПРОГНОЗ НА:
1. Следующий месяц
2. Следующий квартал

УКАЖИ:
1. Ожидаемые показатели (с обоснованием)
2. Потенциальные риски
3. Рекомендации по улучшению
4. Контрольные точки для отслеживания

Будь реалистичным и осторожным в оценках.`;

            const forecast = await this.chatWithAI(prompt, 'forecast');
            return {
                success: true,
                forecast: forecast.response,
                historicalData: historicalData,
                tokens: forecast.tokens
            };
        } catch (error) {
            console.error('❌ Ошибка в generateForecast:', error);
            return await this.mockForecast();
        }
    }

    async chatWithAI(message, context = 'general') {
        console.log(`📨 AI запрос: "${message.substring(0, 50)}..." (${context})`);

        try {
            let enhancedMessage = message;

            if (message.toLowerCase().includes('анализ') ||
                message.toLowerCase().includes('данны') ||
                message.toLowerCase().includes('расход') ||
                message.toLowerCase().includes('экономи')) {

                console.log('🔍 Запрос требует данных из БД...');
                const expenses = await this.fetchDataFromDB('/analytics/expenses-by-category');
                const stats = await this.fetchDataFromDB('/analytics/statistics?period=month');

                if (expenses && stats) {
                    const dataSummary = `
КОНТЕКСТ ДАННЫХ ПОЛЬЗОВАТЕЛЯ:
- Всего категорий расходов: ${expenses.length}
- Топ-3 категории: ${expenses.slice(0, 3).map(e => `${e.name}: ${e.total_amount}₽`).join(', ')}
- Общие расходы за месяц: ${stats.total_expenses || 'нет данных'}₽
- Прибыль: ${stats.profit || 'нет данных'}₽
`;
                    enhancedMessage = `${dataSummary}\n\nВОПРОС ПОЛЬЗОВАТЕЛЯ: ${message}`;
                }
            }

            const systemPrompt = this.getSystemPrompt(context);
            const response = await this.client.chat.complete({
                model: this.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: enhancedMessage }
                ],
                temperature: 0.7,
                maxTokens: 1500
            });

            const aiResponse = response.choices[0].message.content;
            const tokens = response.usage.totalTokens;

            console.log(`✅ Mistral ответил (${tokens} токенов)`);
            return {
                success: true,
                response: aiResponse,
                tokens: tokens,
                provider: 'mistral'
            };
        } catch (error) {
            console.error('❌ Ошибка Mistral API:', error.message);
            return await this.mockResponse(message, context);
        }
    }

    async getQuarterData() {
        try {
            const now = new Date();
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(now.getMonth() - 3);
            const fromDate = threeMonthsAgo.toISOString().split('T')[0];
            const toDate = now.toISOString().split('T')[0];

            const operations = await this.fetchDataFromDB(`/operations?from=${fromDate}&to=${toDate}`);
            const expensesByCategory = await this.fetchDataFromDB('/analytics/expenses-by-category');

            if (!operations || operations.length === 0) {
                return {
                    income: 0,
                    expenses: 0,
                    profit: 0,
                    period: this.getCurrentQuarter(),
                    top_categories: [],
                    has_real_data: false
                };
            }

            const incomes = operations.filter(op => op.type === 'income');
            const expenses = operations.filter(op => op.type === 'expense');

            const totalIncome = incomes.reduce((sum, op) => sum + op.amount, 0);
            const totalExpenses = expenses.reduce((sum, op) => sum + op.amount, 0);

            const topCategories = expensesByCategory
                ? expensesByCategory.slice(0, 3).map(item => ({
                    name: item.name,
                    total: item.total_amount || 0
                }))
                : [];

            return {
                income: totalIncome,
                expenses: totalExpenses,
                profit: totalIncome - totalExpenses,
                period: this.getCurrentQuarter(),
                top_categories: topCategories,
                has_real_data: true,
                operations_count: operations.length
            };
        } catch (error) {
            console.error('❌ Ошибка получения квартальных данных:', error);
            return {
                income: 0,
                expenses: 0,
                profit: 0,
                period: this.getCurrentQuarter(),
                top_categories: [],
                has_real_data: false,
                error: error.message
            };
        }
    }

    async getHistoricalData() {
        try {
            const operations = await this.fetchDataFromDB('/operations');
            if (!operations || operations.length === 0) return [];

            const monthlyData = {};
            operations.forEach(op => {
                const date = new Date(op.operation_date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expenses: 0 };
                if (op.type === 'income') monthlyData[monthKey].income += op.amount;
                else monthlyData[monthKey].expenses += op.amount;
            });

            return Object.entries(monthlyData)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 6)
                .map(([month, data]) => ({
                    month: this.formatMonth(month),
                    income: data.income,
                    expenses: data.expenses
                }));
        } catch (error) {
            console.error('❌ Ошибка получения исторических данных:', error);
            return [];
        }
    }

    async mockQuarterReport() {
        return {
            success: true,
            report: "# Финансовый отчет\n\nТестовые данные. Реальные данные будут доступны после настройки.",
            period: this.getCurrentQuarter(),
            tokens: 0
        };
    }

    async mockForecast() {
        return {
            success: true,
            forecast: "## Прогноз\n\nТестовые данные. Реальные данные будут доступны после настройки.",
            historicalData: [],
            tokens: 0
        };
    }

    async mockResponse(message, context) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const responses = {
            'economy': `## Рекомендации по экономии\n\nНа основе тестовых данных:\n1. **Бухгалтерские услуги** (45,000₽) → можно сократить\n2. **Канцелярия** (15,000₽) → оптовые закупки\n3. **Аренда** (30,000₽) → пересмотр договора`,
            'report': `# Финансовый отчет\n\nТестовые данные. Добавьте реальные операции для подробного анализа.`,
            'forecast': `## Прогноз\n\nНа основе тестовых данных. Добавьте исторические данные для точного прогноза.`,
            'general': `Привет! Я ваш финансовый помощник. Для получения точных рекомендаций добавьте реальные данные о доходах и расходах.`
        };

        return {
            success: true,
            response: responses[context] || responses.general,
            tokens: 100,
            isMock: true
        };
    }

    getCurrentQuarter() {
        const now = new Date();
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        return `Q${quarter} ${now.getFullYear()}`;
    }

    formatMonth(monthStr) {
        const [year, month] = monthStr.split('-');
        const months = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        return `${months[parseInt(month) - 1]} ${year}`;
    }

    getSystemPrompt(context) {
        const prompts = {
            'economy': `Ты финансовый консультант. Анализируй расходы и давай конкретные рекомендации по экономии. Будь практичным, используй цифры и четкие шаги. Отвечай на русском.`,
            'report': `Ты финансовый аналитик. Создавай структурированные отчеты. Используй заголовки, маркеры и четкие выводы. Отвечай на русском.`,
            'forecast': `Ты финансовый прогнозист. Делай реалистичные прогнозы с указанием допущений и рисков. Отвечай на русском.`,
            'general': `Ты финансовый помощник для малого бизнеса. Отвечай кратко, информативно и профессионально на русском языке. Помогай с финансами, бюджетом и планированием.`
        };
        return prompts[context] || prompts.general;
    }

    async getRealTimeData() {
        return {
            operations: await this.fetchDataFromDB('/operations'),
            expenses: await this.fetchDataFromDB('/analytics/expenses-by-category'),
            statistics: await this.fetchDataFromDB('/analytics/statistics?period=month'),
            summary: await this.fetchDataFromDB('/analytics/summary')
        };
    }
}

module.exports = new MistralAIService();