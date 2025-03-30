const express = require('express');
const { getUsers, getUser, updateUser, deleteUser } = require('../controllers/users');
const { protect, authorize } = require('../middlewares/auth');
const { validateRequest, updateUserSchema } = require('../middlewares/validator');

const router = express.Router();

// Protect all routes
router.use(protect);
// Restrict to admin
router.use(authorize('admin'));

router
  .route('/')
  .get(getUsers);

router
  .route('/:id')
  .get(getUser)
  .put(validateRequest(updateUserSchema), updateUser)
  .delete(deleteUser);

module.exports = router; 