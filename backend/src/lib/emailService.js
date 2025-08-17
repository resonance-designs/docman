/*
 * @author Richard Bakos
 * @version 2.1.2
 * @license UNLICENSED
 */
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import dotenv from "dotenv";

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: '.env.dev' });
} else if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: '.env.prod' });
} else {
    dotenv.config(); // Loads .env by default
}

// Create SES client
const sesClient = new SESClient({
    region: process.env.AWS_SES_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Function to send email using AWS SES
export async function sendEmail(to, subject, text, html) {
    // Use environment-specific sender email
    const senderEmail = process.env.AWS_SES_SENDER_EMAIL || "noreply@resonancedesigns.dev";
    
    const params = {
        Destination: {
            ToAddresses: [to],
        },
        Message: {
            Body: {
                Text: {
                    Charset: "UTF-8",
                    Data: text,
                },
                Html: {
                    Charset: "UTF-8",
                    Data: html,
                },
            },
            Subject: {
                Charset: "UTF-8",
                Data: subject,
            },
        },
        Source: senderEmail,
    };

    try {
        const command = new SendEmailCommand(params);
        const response = await sesClient.send(command);
        console.log("Email sent successfully:", response.MessageId);
        return response;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
}

export default { sendEmail };