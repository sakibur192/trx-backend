const express = require('express');
const router = express.Router();

// test API route
router.get('/test', (req, res) => {
  res.json({ message: 'API working fine' });
});

module.exports = router;