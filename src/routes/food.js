const express = require('express');
const {
  getAllFood,
  getFood,
  createFood,
  updateFood,
  deleteFood,
  acceptFood
} = require('../controllers/food');
const { protect, authorize } = require('../middlewares/auth');
const { validateRequest, createFoodSchema, updateFoodSchema } = require('../middlewares/validator');

const router = express.Router();

router
  .route('/')
  .get(getAllFood)
  .post(protect, authorize('admin'), validateRequest(createFoodSchema), createFood);

router
  .route('/:id')
  .get(getFood)
  .put(protect, authorize('admin'), validateRequest(updateFoodSchema), updateFood)
  .delete(protect, authorize('admin'), deleteFood);

// Route for accepting food
router.route('/:id/accept').post(protect, acceptFood);

module.exports = router; 