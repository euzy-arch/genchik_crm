const API_CONFIG = {
    BASE_URL: 'http://localhost:5001/api',
    TIMEOUT: 10000,
    getUrl: (endpoint) => `${API_CONFIG.BASE_URL}${endpoint}`
};

export default API_CONFIG;