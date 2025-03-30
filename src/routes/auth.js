const express = require('express');
const { register, login, getMe, logout, updateProfile } = require('../controllers/auth');
const { protect } = require('../middlewares/auth');
const { validateRequest, registerSchema, loginSchema, updateProfileSchema } = require('../middlewares/validator');

const router = express.Router();

router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);
router.put('/updateprofile', protect, validateRequest(updateProfileSchema), updateProfile);

module.exports = router; 