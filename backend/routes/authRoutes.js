const express = require('express');
const router = express.Router();
const { register, login, getMe, logout } = require('../controllers/authController');
const { protect: auth } = require('../middleware/firebaseAuth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, getMe);
router.post('/logout', auth, logout);

module.exports = router;
