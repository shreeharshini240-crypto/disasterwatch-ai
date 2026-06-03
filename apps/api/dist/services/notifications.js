import twilio from "twilio";
import { prisma, NotificationChannel, NotificationStatus } from "@disasterwatch/db";
import { config } from "../config.js";
export async function sendNotification(input) {
    const notification = await prisma.notification.create({
        data: {
            userId: input.userId,
            channel: input.channel,
            title: input.title,
            body: input.body,
            status: NotificationStatus.PENDING
        }
    });
    try {
        if (input.channel === NotificationChannel.SMS && config.twilioSid && input.to) {
            const client = twilio(config.twilioSid, config.twilioToken);
            await client.messages.create({ from: config.twilioFrom, to: input.to, body: `${input.title}: ${input.body}` });
        }
        if (input.channel === NotificationChannel.EMAIL && input.to) {
            if (!config.resendApiKey)
                throw new Error("RESEND_API_KEY is not configured");
            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${config.resendApiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    from: config.alertEmailFrom,
                    to: input.to,
                    subject: input.title,
                    text: input.body
                })
            });
            if (!response.ok)
                throw new Error(`Email provider failed with ${response.status}`);
        }
        return prisma.notification.update({
            where: { id: notification.id },
            data: { status: NotificationStatus.SENT, sentAt: new Date() }
        });
    }
    catch (error) {
        return prisma.notification.update({
            where: { id: notification.id },
            data: { status: NotificationStatus.FAILED, metadata: { error: error instanceof Error ? error.message : "Unknown" } }
        });
    }
}
