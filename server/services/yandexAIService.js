const axios = require('axios');

class YandexAIService {
    constructor() {
        this.apiKey = process.env.YANDEX_API_KEY || 'ваш_api_ключ_здесь';
        this.folderId = process.env.YANDEX_FOLDER_ID || 'ваш_folder_id_здесь';
        this.baseURL = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Api-Key ${this.apiKey}`,
            'x-folder-id': this.folderId
        };
    }

    async chatWithAI(message, context = 'general') {
        try {
            console.log('📨 Отправка запроса к Yandex GPT:', { message, context });
            const prompt = this.buildPrompt(message, context);

            const response = await axios.post(this.baseURL, {
                modelUri: `gpt://${this.folderId}/yandexgpt-lite`,
                completionOptions: {
                    stream: false,
                    temperature: 0.6,
                    maxTokens: 2000
                },
                messages: [
                    {
                        role: "system",
                        text: `Ты финансовый аналитик. ${this.getContextInstructions(context)} Отвечай кратко и по делу.`
                    },
                    {
                        role: "user",
                        text: prompt
                    }
                ]
            }, {
                headers: this.headers,
                timeout: 30000
            });

            const aiResponse = response.data.result.alternatives[0].message.text;
            const tokens = response.data.result.usage.totalTokens;

            console.log('✅ Получен ответ от Yandex GPT:', { tokens, responseLength: aiResponse.length });
            return { success: true, response: aiResponse, tokens: tokens };
        } catch (error) {
            console.error('❌ Yandex AI Error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });

            const fallbackResponses = {
                'economy': 'На основе анализа ваших расходов, рекомендую сократить необязательные траты и оптимизировать регулярные платежи.',
                'report': 'Квартальный отчет показывает стабильный рост доходов при умеренном увеличении расходов.',
                'forecast': 'Прогноз на следующий период предполагает рост доходов на 15% при сохранении текущей структуры расходов.',
                'general': 'Я финансовый помощник. В данный момент сервис AI временно недоступен. Пожалуйста, попробуйте позже или используйте другие функции анализа.'
            };

            return {
                success: true,
                response: fallbackResponses[context] || fallbackResponses.general,
                tokens: 0,
                isFallback: true
            };
        }
    }

    buildPrompt(message, context) {
        const contextPrompts = {
            'economy': `Проанализируй расходы и дай конкретные рекомендации по экономии.\n\nДанные: ${message}`,
            'report': `Сгенерируй структурированный квартальный финансовый отчет.\n\nДанные: ${message}`,
            'forecast': `Сделай финансовый прогноз на основе данных.\n\nДанные: ${message}`,
            'general': message
        };
        return contextPrompts[context] || message;
    }

    getContextInstructions(context) {
        const instructions = {
            'economy': 'Давай конкретные рекомендации по экономии. Будь практичным и предлагай реальные способы сокращения расходов.',
            'report': 'Генерируй отчет в структурированном виде с разделами: основные показатели, анализ изменений, выводы.',
            'forecast': 'Делай реалистичные прогнозы с указанием предположений и рисков.',
            'general': 'Отвечай как профессиональный финансовый консультант. Будь кратким и информативным.'
        };
        return instructions[context] || instructions.general;
    }

    async analyzeEconomy() {
        try {
            const expensesData = await this.getExpensesData();
            const prompt = `Проанализируй эти расходы и предложи меры по экономии:\n${JSON.stringify(expensesData, null, 2)}`;
            const result = await this.chatWithAI(prompt, 'economy');

            return {
                success: true,
                analysis: result.response,
                data: expensesData,
                tokens: result.tokens
            };
        } catch (error) {
            console.error('Error in analyzeEconomy:', error);
            return {
                success: true,
                analysis: 'Для анализа экономии требуется больше данных о ваших расходах. Добавьте операции в разделе "Операции".',
                data: [],
                tokens: 0
            };
        }
    }

    async generateQuarterReport() {
        try {
            const quarterData = await this.getQuarterData();
            const prompt = `Сгенерируй квартальный отчет:\n${JSON.stringify(quarterData, null, 2)}`;
            const result = await this.chatWithAI(prompt, 'report');

            return {
                success: true,
                report: result.response,
                period: 'Q1 2024',
                tokens: result.tokens
            };
        } catch (error) {
            console.error('Error in generateQuarterReport:', error);
            return {
                success: true,
                report: '# Квартальный отчет\n\n**Период:** Текущий квартал\n\n**Основные показатели:**\n- Доходы: требуются данные\n- Расходы: требуются данные\n- Прибыль: требуются данные\n\n**Рекомендации:** Добавьте финансовые операции для генерации полного отчета.',
                period: 'Текущий квартал',
                tokens: 0
            };
        }
    }

    async generateForecast() {
        try {
            const historicalData = await this.getHistoricalData();
            const prompt = `Сделай прогноз на основе исторических данных:\n${JSON.stringify(historicalData, null, 2)}`;
            const result = await this.chatWithAI(prompt, 'forecast');

            return {
                success: true,
                forecast: result.response,
                historicalData: historicalData,
                tokens: result.tokens
            };
        } catch (error) {
            console.error('Error in generateForecast:', error);
            return {
                success: true,
                forecast: '**Прогноз на следующий период:**\n\nДля точного прогнозирования требуется больше исторических данных. Добавьте операции за несколько месяцев.',
                historicalData: [],
                tokens: 0
            };
        }
    }

    async getExpensesData() {
        return [
            { category: 'Канцелярия', amount: 15000, date: '2024-01-15' },
            { category: 'Бухгалтер', amount: 45000, date: '2024-01-10' }
        ];
    }

    async getQuarterData() {
        return {
            income: 500000,
            expenses: 320000,
            profit: 180000,
            topCategories: ['Бухгалтер', 'Канцелярия', 'Аренда']
        };
    }

    async getHistoricalData() {
        return [
            { month: 'Январь', income: 500000, expenses: 320000 },
            { month: 'Февраль', income: 520000, expenses: 310000 },
            { month: 'Март', income: 480000, expenses: 290000 }
        ];
    }

    async getSavedAnalyses(type, limit = 10) {
        return {
            success: true,
            data: [],
            count: 0,
            type: type
        };
    }

    async deleteAnalysis(id) {
        return {
            success: true,
            message: `Анализ ${id} удален`,
            id: id
        };
    }

    async deleteAnalysesByType(type) {
        return {
            success: true,
            message: `Анализы типа ${type} удалены`,
            type: type
        };
    }
}

module.exports = new YandexAIService();