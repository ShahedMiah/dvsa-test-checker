const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { DVSATestChecker } = require('./DVSATestChecker');

require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// Routes
app.post('/api/check-tests', async (req, res) => {
  const { licenseNumber, certificateNumber } = req.body;

  if (!licenseNumber || !certificateNumber) {
    return res.status(400).json({
      success: false,
      error: 'License number and certificate number are required'
    });
  }

  const checker = new DVSATestChecker();
  
  try {
    await checker.initialize();
    const results = await checker.searchForTests(licenseNumber, certificateNumber);
    res.json({ success: true, tests: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await checker.close();
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});