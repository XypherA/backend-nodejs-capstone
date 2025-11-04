/*jshint esversion: 8 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pinoLogger = require('./logger');
const connectToDatabase = require('./models/db');
const {loadData} = require("./util/import-mongo/index");


const app = express();
app.use("*", cors());
const port = 3060;

// Connect to MongoDB; we just do this one time
connectToDatabase()
  .then(() => {
    pinoLogger.info('Connected to DB');
  })
  .catch((e) => console.error('Failed to connect to DB', e));

app.use(express.json());

// Route files

// Auth Routes
const authRoutes = require('./routes/authRoutes'); // Step 2: import authRoutes

// Items API
const secondChanceItemsRoutes = require('./routes/secondChanceItemsRoutes'); // Task 1: import secondChanceItemsRoutes

// Search API
const searchRoutes = require('./routes/searchRoutes'); // Task 1: import searchRoutes

const pinoHttp = require('pino-http');
const logger = require('./logger');

app.use(pinoHttp({ logger }));

// Use Routes
app.use('/api/auth', authRoutes); // Step 2: add authRoutes to server
app.use('/api/secondchance/items', secondChanceItemsRoutes); // Task 2: add secondChanceItemsRoutes to server
app.use('/api/secondchance/search', searchRoutes); // Task 2: add searchRoutes to server

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Internal Server Error');
});

app.get("/", (req, res) => {
  res.send("Inside the server");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
