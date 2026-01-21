const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('Подключение к SQLite базе данных установлено');
        initializeDatabase();
    }
});

const initializeDatabase = () => {
    const queries = [
        `CREATE TABLE IF NOT EXISTS operations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            amount DECIMAL(10, 2) NOT NULL CHECK(amount > 0),
            description TEXT,
            category_id INTEGER,
            operation_date DATE NOT NULL DEFAULT CURRENT_DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        )`,
        `CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            type TEXT DEFAULT 'expense' CHECK(type IN ('expense')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS ai_analytics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            analysis_type TEXT NOT NULL,
            period_start DATE,
            period_end DATE,
            content TEXT NOT NULL,
            summary TEXT,
            insights TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS ai_forecasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            forecast_date DATE NOT NULL,
            forecast_type TEXT NOT NULL,
            predicted_income DECIMAL(10, 2),
            predicted_expense DECIMAL(10, 2),
            confidence_level DECIMAL(3, 2),
            assumptions TEXT,
            recommendations TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS ai_chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_message TEXT NOT NULL,
            ai_response TEXT NOT NULL,
            context_type TEXT,
            metadata TEXT,
            tokens_used INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    db.serialize(() => {
        queries.forEach((query, index) => {
            db.run(query, (err) => {
                const tables = ['categories', 'operations', 'ai_analytics', 'ai_chat_history', 'ai_forecasts'];
                if (err) {
                    console.error(`Ошибка создания таблицы ${tables[index]}:`, err.message);
                } else {
                    console.log(`Таблица ${tables[index]} создана/проверена`);
                }
            });
        });
    });
};

db.runAsync = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        this.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

db.getAsync = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        this.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

db.allAsync = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        this.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

module.exports = db;