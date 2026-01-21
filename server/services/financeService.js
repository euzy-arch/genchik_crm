import API_CONFIG from '../../src/config/api';

class FinanceService {
    constructor() {
        this.baseUrl = API_CONFIG.BASE_URL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const defaultOptions = {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
        };

        const requestOptions = {
            ...defaultOptions,
            ...options,
            headers: { ...defaultOptions.headers, ...options.headers },
        };

        if (options.body && typeof options.body === 'object') {
            requestOptions.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, requestOptions);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    async getAIUsage() {
        return this.request('/ai/usage');
    }

    async getOperations(filters = {}) {
        const queryParams = new URLSearchParams();
        if (filters.type) queryParams.append('type', filters.type);
        if (filters.category_id) queryParams.append('category_id', filters.category_id);
        if (filters.date_from) queryParams.append('date_from', filters.date_from);
        if (filters.date_to) queryParams.append('date_to', filters.date_to);
        if (filters.limit) queryParams.append('limit', filters.limit);
        if (filters.offset) queryParams.append('offset', filters.offset);

        const queryString = queryParams.toString();
        const endpoint = `/operations${queryString ? `?${queryString}` : ''}`;
        return this.request(endpoint);
    }

    async getOperation(id) {
        return this.request(`/operations/${id}`);
    }

    async createOperation(operationData) {
        return this.request('/operations', {
            method: 'POST',
            body: operationData
        });
    }

    async updateOperation(id, operationData) {
        return this.request(`/operations/${id}`, {
            method: 'PUT',
            body: operationData
        });
    }

    async deleteOperation(id) {
        return this.request(`/operations/${id}`, {
            method: 'DELETE'
        });
    }

    async getCategories() {
        return this.request('/categories');
    }

    async createCategory(name) {
        return this.request('/categories', {
            method: 'POST',
            body: { name }
        });
    }

    async getStatistics(period = 'month', dateRange = {}) {
        const queryParams = new URLSearchParams();
        queryParams.append('period', period);
        if (dateRange.date_from) queryParams.append('date_from', dateRange.date_from);
        if (dateRange.date_to) queryParams.append('date_to', dateRange.date_to);

        return this.request(`/analytics/statistics?${queryParams.toString()}`);
    }

    async getExpensesByCategory(dateRange = {}) {
        const queryParams = new URLSearchParams();
        if (dateRange.date_from) queryParams.append('date_from', dateRange.date_from);
        if (dateRange.date_to) queryParams.append('date_to', dateRange.date_to);

        const queryString = queryParams.toString();
        const endpoint = `/analytics/expenses-by-category${queryString ? `?${queryString}` : ''}`;
        return this.request(endpoint);
    }

    async getSummary() {
        return this.request('/analytics/summary');
    }

    async getBalance(dateRange = {}) {
        const operations = await this.getOperations(dateRange);
        if (!operations.success) {
            throw new Error('Не удалось получить данные для расчета баланса');
        }

        const totalIncome = operations.data
            .filter(op => op.type === 'income')
            .reduce((sum, op) => sum + parseFloat(op.amount), 0);

        const totalExpense = operations.data
            .filter(op => op.type === 'expense')
            .reduce((sum, op) => sum + parseFloat(op.amount), 0);

        return {
            income: totalIncome,
            expense: totalExpense,
            balance: totalIncome - totalExpense
        };
    }
}

const financeService = new FinanceService();
export default financeService;