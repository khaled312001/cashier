const express = require('express');
const cors = require('cors');
const path = require('path');
const { app: electronApp } = require('electron');

const authRoutes = require('../server/routes/auth');
const productsRoutes = require('../server/routes/products');
const categoriesRoutes = require('../server/routes/categories');
const salesRoutes = require('../server/routes/sales');
const customersRoutes = require('../server/routes/customers');
const suppliersRoutes = require('../server/routes/suppliers');
const reportsRoutes = require('../server/routes/reports');
const settingsRoutes = require('../server/routes/settings');
const dashboardRoutes = require('../server/routes/dashboard');

const PORT = 3001;

function startServer() {
  return new Promise((resolve, reject) => {
    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/products', productsRoutes);
    app.use('/api/categories', categoriesRoutes);
    app.use('/api/sales', salesRoutes);
    app.use('/api/customers', customersRoutes);
    app.use('/api/suppliers', suppliersRoutes);
    app.use('/api/reports', reportsRoutes);
    app.use('/api/settings', settingsRoutes);
    app.use('/api/dashboard', dashboardRoutes);

    // Health check
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Error handling
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ error: 'حدث خطأ في السيرفر' });
    });

    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      resolve(server);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is already in use, trying to connect...`);
        resolve(null);
      } else {
        reject(err);
      }
    });
  });
}

module.exports = { startServer };
