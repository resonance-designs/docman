// Optional manual reminder scan; the running backend also scans hourly.
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import Notification from '../src/models/Notification.js';
import { queueDueReviews } from '../src/services/notificationDeliveryService.js';
try {
    await connectDB();
    await Notification.init();
    await queueDueReviews();
    console.log('Review reminders queued. The running backend delivers pending email.');
} catch (error) {
    console.error('Review reminder scan failed:', error?.name || 'Error');
    process.exitCode = 1;
} finally { await mongoose.disconnect(); }
