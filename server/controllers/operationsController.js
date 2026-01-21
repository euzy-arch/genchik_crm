const operationsService = require('../services/operationsService');

const getAllOperations = async (req, res) => {
    try {
        const filters = {
            type: req.query.type,
            category_id: req.query.category_id ? parseInt(req.query.category_id) : null,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            limit: req.query.limit ? parseInt(req.query.limit) : null,
            offset: req.query.offset ? parseInt(req.query.offset) : null
        };
        const operations = await operationsService.getAllOperations(filters);
        res.json({ success: true, data: operations, count: operations.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка при получении операций', error: error.message });
    }
};

const getOperationById = async (req, res) => {
    try {
        const { id } = req.params;
        const operation = await operationsService.getOperationById(parseInt(id));
        if (!operation) {
            return res.status(404).json({ success: false, message: 'Операция не найдена' });
        }
        res.json({ success: true, data: operation });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка при получении операции', error: error.message });
    }
};

const createOperation = async (req, res) => {
    try {
        const operationData = req.body;
        const newOperation = await operationsService.createOperation(operationData);
        res.status(201).json({ success: true, message: 'Операция успешно создана', data: newOperation });
    } catch (error) {
        const statusCode = error.message.includes('обязательно') ? 400 : 500;
        res.status(statusCode).json({ success: false, message: 'Ошибка при создании операции', error: error.message });
    }
};

const updateOperation = async (req, res) => {
    try {
        const { id } = req.params;
        const operationData = req.body;
        const updatedOperation = await operationsService.updateOperation(parseInt(id), operationData);
        res.json({ success: true, message: 'Операция успешно обновлена', data: updatedOperation });
    } catch (error) {
        const statusCode = error.message.includes('не найдена') ? 404 : 500;
        res.status(statusCode).json({ success: false, message: 'Ошибка при обновлении операции', error: error.message });
    }
};

const deleteOperation = async (req, res) => {
    try {
        const { id } = req.params;
        await operationsService.deleteOperation(parseInt(id));
        res.json({ success: true, message: 'Операция успешно удалена' });
    } catch (error) {
        const statusCode = error.message.includes('не найдена') ? 404 : 500;
        res.status(statusCode).json({ success: false, message: 'Ошибка при удалении операции', error: error.message });
    }
};

const getAllCategories = async (req, res) => {
    try {
        const categories = await operationsService.getAllCategories();
        res.json({ success: true, data: categories, count: categories.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка при получении категорий', error: error.message });
    }
};

const createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Название категории обязательно' });
        }
        const newCategory = await operationsService.createCategory({ name });
        res.status(201).json({ success: true, message: 'Категория успешно создана', data: newCategory });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка при создании категории', error: error.message });
    }
};

const getStatistics = async (req, res) => {
    try {
        const filters = {
            period: req.query.period || 'month',
            date_from: req.query.date_from,
            date_to: req.query.date_to
        };
        const statistics = await operationsService.getStatistics(filters);
        res.json({ success: true, data: statistics, period: filters.period });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка при получении статистики', error: error.message });
    }
};

const getExpensesByCategory = async (req, res) => {
    try {
        const filters = {
            date_from: req.query.date_from,
            date_to: req.query.date_to
        };
        const categoryStats = await operationsService.getExpensesByCategory(filters);
        res.json({ success: true, data: categoryStats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка при получении статистики по категориям', error: error.message });
    }
};

const getSummary = async (req, res) => {
    try {
        const summary = await operationsService.getSummary();
        res.json({ success: true, data: summary });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка при получении общей статистики', error: error.message });
    }
};

module.exports = {
    getAllOperations, getOperationById, createOperation, updateOperation, deleteOperation,
    getAllCategories, createCategory,
    getStatistics, getExpensesByCategory, getSummary
};