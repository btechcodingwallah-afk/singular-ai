const express = require('express');
const { createChatCompletion } = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/completions', authenticate, createChatCompletion);

module.exports = router;
