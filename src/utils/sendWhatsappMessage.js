import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const whatsAppApiToken = process.env.WHATSAPP_API_TOKEN;
const apiBaseUrl = "https://whatsbot.tech/api";

export const sendWhatsappDoc = async (mobile, docUrl) => {
  try {
    const response = await axios.post(`${apiBaseUrl}/send_doc`, null, {
      params: {
        api_token: whatsAppApiToken,
        mobile,
        doc_url: docUrl
      }
    });

    console.log("WhatsApp Document API Response:", response.data);

    if (!response.data.status) {
      throw new Error(`WhatsBot Doc Error: ${response.data.msg}`);
    }
  } catch (error) {
    console.error("WhatsApp Document Sending Error:", error.response ? error.response.data : error.message);
    throw new Error("Failed to send WhatsApp document");
  }
};

export const sendWhatsappMsg = async (mobile, orderDetails) => {
  try {
    const message = `*Thank You for Your Order!* ✨  

🛍 Order-ID: ${orderDetails._id}
💰 Total Amount: ₹${orderDetails.totalAmount}  

📩 Your invoice has been sent below.

We truly appreciate your trust in us and look forward to serving you again! 😊`;


    const response = await axios.post(`${apiBaseUrl}/send_sms`, null, {
      params: {
        api_token: whatsAppApiToken,
        mobile,
        message
      }
    });

    console.log("WhatsApp Message API Response:", response.data);

    if (!response.data.status) {
      throw new Error(`WhatsBot Message Error: ${response.data.msg}`);
    }
  } catch (error) {
    console.error("WhatsApp Message Sending Error:", error.response ? error.response.data : error.message);
    throw new Error("Failed to send WhatsApp message");
  }
};

export const sendFoodPostNotification = async (mobile, foodDetails) => {
  try {
    // Format expiry date
    const expiryDate = new Date(foodDetails.expiryDate).toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
    
    // Create a professional message
    const message = `*New Food Listing Created* 🍽️

✅ *Successfully Posted*

📋 *Food Details*:
🍲 *Title*: ${foodDetails.title}
📝 *Description*: ${foodDetails.description.substring(0, 50)}${foodDetails.description.length > 50 ? '...' : ''}
📍 *Location*: ${foodDetails.location}
⚖️ *Quantity*: ${foodDetails.quantity} ${foodDetails.quantityUnit || ''}
📅 *Expires On*: ${expiryDate}
🔄 *Status*: ${foodDetails.status.charAt(0).toUpperCase() + foodDetails.status.slice(1)}

🔗 *View this listing*: ${process.env.CLIENT_URL || 'https://foodresq-client.vercel.app'}/food/${foodDetails._id}

Thank you for helping reduce food waste! 💚`;

    const response = await axios.post(`${apiBaseUrl}/send_sms`, null, {
      params: {
        api_token: whatsAppApiToken,
        mobile,
        message
      }
    });

    console.log("WhatsApp Food Notification Response:", response.data);

    if (!response.data.status) {
      throw new Error(`WhatsBot Message Error: ${response.data.msg}`);
    }
    
    return true;
  } catch (error) {
    console.error("WhatsApp Food Notification Error:", error.response ? error.response.data : error.message);
    // Don't throw error to prevent disruption of the main app flow
    return false;
  }
};

export const sendWelcomeWhatsappMsg = async (mobile, userDetails) => {
  try {
    const message = `🌟 *Welcome to FoodResQ!* 🌟

Hello *${userDetails.name}*,

We're excited to have you with us! 🎉 Your registration at *FoodResQ* is successful, and you're now part of our mission to reduce food waste.

With FoodResQ, you can:
🍲 Find surplus food available near you
🔔 Get notified about new food listings
🤝 Connect with food donors

Thank you for joining us in our journey to create a world with less waste and more sharing.

*Best Regards,*
*FoodResQ Team*`;

    const response = await axios.post(`${apiBaseUrl}/send_sms`, null, {
      params: {
        api_token: whatsAppApiToken,
        mobile,
        message
      }
    });

    console.log("WhatsApp Welcome Message Response:", response.data);

    if (!response.data.status) {
      throw new Error(`WhatsBot Message Error: ${response.data.msg}`);
    }
    
    return true;
  } catch (error) {
    console.error("WhatsApp Welcome Message Error:", error.response ? error.response.data : error.message);
    // Don't throw error to prevent disruption of registration
    return false;
  }
};
