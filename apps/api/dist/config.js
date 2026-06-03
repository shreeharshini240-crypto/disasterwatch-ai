import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
dotenv.config();
export const config = {
    port: Number(process.env.PORT ?? 4000),
    jwtSecret: process.env.JWT_SECRET ?? "dev-only-secret-change-me",
    webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
    newsApiKey: process.env.NEWS_API_KEY ?? "",
    openWeatherKey: process.env.OPENWEATHER_API_KEY ?? "",
    openAiKey: process.env.OPENAI_API_KEY ?? "",
    twilioSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    twilioToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    twilioFrom: process.env.TWILIO_FROM_NUMBER ?? "",
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    alertEmailFrom: process.env.ALERT_EMAIL_FROM ?? "alerts@disasterwatch.ai",
    smtpHost: process.env.SMTP_HOST ?? "",
    smtpPort: Number(process.env.SMTP_PORT ?? 587),
    smtpUser: process.env.SMTP_USER ?? "",
    smtpPass: process.env.SMTP_PASS ?? ""
};
