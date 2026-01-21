class FinanceService {
    constructor() {
        this.baseUrl = 'http://localhost:5001/api';
    }

    async request(endpoint, options = {}) {
        try {
            console.log(`Запрос: ${this.baseUrl}${endpoint}`, options);

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: options.body ? JSON.stringify(options.body) : undefined
            });

            if (!response.ok) {
                throw new Error(`HTTP ошибка: ${response.status}`);
            }

            const data = await response.json();
            console.log(`Ответ от ${endpoint}:`, data);
            return data;
        } catch (error) {
            console.error(`API ошибка [${endpoint}]:`, error);
            throw error;
        }
    }

    // Получить все операции
    async getOperations() {
        return this.request('/operations');
    }

    // Получить операцию по ID
    async getOperationById(id) {
        return this.request(`/operations/${id}`);
    }

    // Получить все категории
    async getCategories() {
        return this.request('/categories');
    }

    async getStatistics(period = 'month') {
        return this.request(`/analytics/statistics?period=${period}`);
    }

    async getExpensesByCategory() {
        return this.request('/analytics/expenses-by-category');
    }

    async getSummary() {
        return this.request('/analytics/summary');
    }

    async deleteOperation(id) {
        return this.request(`/operations/${id}`, {
            method: 'DELETE'
        });
    }

    // СОЗДАНИЕ операции
    async createOperation(operationData) {
        return this.request('/operations', {
            method: 'POST',
            body: operationData
        });
    }

    // РЕДАКТИРОВАНИЕ операции
    async updateOperation(id, operationData) {
        return this.request(`/operations/${id}`, {
            method: 'PUT',
            body: operationData
        });
    }
}

const financeService = new FinanceService();
export default financeService;