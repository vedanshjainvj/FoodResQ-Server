const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload image to Cloudinary
const uploadImage = async (file) => {
  try {
    // Check if the file is already a Cloudinary URL
    if (file.startsWith('http') && file.includes('cloudinary.com')) {
      return file; // Return as is if it's already a Cloudinary URL
    }

    // Handle base64 image uploads
    if (file.startsWith('data:image')) {
      const result = await cloudinary.uploader.upload(file, {
        folder: 'food-donations',
        use_filename: true,
      });
      return result.secure_url;
    }

    return null;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Image upload failed');
  }
};

module.exports = { uploadImage }; 