const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { DVSATestChecker } = require('./DVSATestChecker');

require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api', limiter);

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes
app.post('/api/check-tests', async (req, res) => {
  const { licenseNumber, secondNumber, location, isTheoryNumber } = req.body;

  if (!licenseNumber || !secondNumber || !location) {
    return res.status(400).json({
      success: false,
      error: 'License number, Theory Test/Reference number, and location are required'
    });
  }

  const checker = new DVSATestChecker();
  
  try {
    await checker.initialize();
    const results = await checker.searchForTests(licenseNumber, secondNumber, location, isTheoryNumber);
    res.json({ success: true, tests: results });
  } catch (error) {
    console.error('Error in /api/check-tests:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await checker.close();
  }
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});