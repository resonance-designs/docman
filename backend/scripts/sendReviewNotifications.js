// backend/scripts/sendReviewNotifications.js
// Script to send notifications for documents that are due for review

import mongoose from "mongoose";
import dotenv from "dotenv";
import Doc from "../src/models/Doc.js";
import { sendDocumentReviewDueNotification } from "../src/controllers/notificationsController.js";
import { connectDB } from "../src/config/db.js";

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Function to send review notifications
async function sendReviewNotifications() {
  try {
    console.log("Checking for documents due for review...");
    
    // Find documents that are due for review (within the next 24 hours)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const docs = await Doc.find({
      reviewDate: {
        $gte: new Date(),
        $lte: tomorrow
      },
      reviewCompleted: false
    }).populate('stakeholders', '_id').populate('owners', '_id');
    
    console.log(`Found ${docs.length} documents due for review`);
    
    // Send notifications to stakeholders and owners
    for (const doc of docs) {
      // Combine stakeholders and owners into a single array
      const recipients = [...(doc.stakeholders || []), ...(doc.owners || [])];
      
      // Remove duplicates
      const uniqueRecipients = [...new Set(recipients.map(user => user._id.toString()))];
      
      // Send notifications to each recipient
      for (const recipientId of uniqueRecipients) {
        try {
          await sendDocumentReviewDueNotification(recipientId, doc._id);
          console.log(`Sent review notification to user ${recipientId} for document ${doc._id}`);
        } catch (error) {
          console.error(`Error sending notification to user ${recipientId}:`, error);
        }
      }
    }
    
    console.log("Finished sending review notifications");
  } catch (error) {
    console.error("Error in sendReviewNotifications:", error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the function
sendReviewNotifications();