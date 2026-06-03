CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');
CREATE TYPE "DisasterType" AS ENUM ('EARTHQUAKE', 'FLOOD', 'WILDFIRE', 'CYCLONE', 'STORM', 'LANDSLIDE', 'HEATWAVE', 'OTHER');
CREATE TYPE "Severity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'EXTREME');
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'EMAIL', 'PUSH');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT,
  "googleId" TEXT,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Disaster" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" "DisasterType" NOT NULL,
  "severity" "Severity" NOT NULL,
  "summary" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "radiusKm" DOUBLE PRECISION NOT NULL,
  "source" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "aiScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "recommendation" TEXT NOT NULL,
  CONSTRAINT "Disaster_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Location" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "radiusKm" DOUBLE PRECISION NOT NULL DEFAULT 50,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmergencyContact" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "relation" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Alert" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "disasterId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "severity" "Severity" NOT NULL,
  "channels" TEXT[],
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "radiusKm" DOUBLE PRECISION NOT NULL,
  "acknowledged" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "metadata" JSONB,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Analytics" (
  "id" TEXT NOT NULL,
  "disasterId" TEXT,
  "metric" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "dimensions" JSONB NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Analytics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE INDEX "Disaster_type_severity_active_idx" ON "Disaster"("type", "severity", "active");
CREATE INDEX "Disaster_latitude_longitude_idx" ON "Disaster"("latitude", "longitude");
CREATE INDEX "Analytics_metric_capturedAt_idx" ON "Analytics"("metric", "capturedAt");

ALTER TABLE "Location" ADD CONSTRAINT "Location_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_disasterId_fkey" FOREIGN KEY ("disasterId") REFERENCES "Disaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Analytics" ADD CONSTRAINT "Analytics_disasterId_fkey" FOREIGN KEY ("disasterId") REFERENCES "Disaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
