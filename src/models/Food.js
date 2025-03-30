const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  takenAt: {
    type: Date,
    default: Date.now
  }
});

const FoodSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
      maxlength: [500, 'Description cannot be more than 500 characters']
    },
    quantity: {
      type: Number,
      required: [true, 'Please add quantity']
    },
    quantityUnit: {
      type: String,
      default: 'kg',
      enum: ['kg', 'liters', 'pieces', 'boxes', 'packets']
    },
    remainingQuantity: {
      type: Number,
      default: function() {
        return this.quantity;
      }
    },
    location: {
      type: String,
      required: [true, 'Please add a location']
    },
    expiryDate: {
      type: Date,
      required: [true, 'Please add an expiry date']
    },
    status: {
      type: String,
      enum: ['available', 'reserved', 'collected', 'partial'],
      default: 'available'
    },
    expiryStatus: {
      type: String,
      enum: ['eatable', 'spoiled'],
      default: 'eatable'
    },
    image: {
      type: String,
      default: 'default-food.jpg'
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    transactions: [TransactionSchema]
  },
  {
    timestamps: true
  }
);

// Update status based on remaining quantity
FoodSchema.pre('save', function(next) {
  if (this.isModified('remainingQuantity')) {
    if (this.remainingQuantity === 0) {
      this.status = 'collected';
    } else if (this.remainingQuantity < this.quantity) {
      this.status = 'partial';
    }
  }
  next();
});

module.exports = mongoose.model('Food', FoodSchema); 