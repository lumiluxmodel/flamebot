// src/config/database.js
module.exports = {
    development: {
        host: process.env.DB_HOST || 'yamabiko.proxy.rlwy.net',
        port: process.env.DB_PORT || 18827,
        database: process.env.DB_NAME || 'railway',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'pyZSoGjkpyNLzYnfFgRpoHdBGVsQgkie',
        ssl: {
            rejectUnauthorized: false  // Railway requiere SSL  
        }
    },
    production: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: {
            rejectUnauthorized: false
        }
    },
    test: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'flamebot_test',
        user: process.env.DB_USER || 'flamebot',
        password: process.env.DB_PASSWORD || 'flamebot123',
        ssl: false
    }
};
