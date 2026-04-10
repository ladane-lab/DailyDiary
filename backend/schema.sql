-- DailyDiary.in - Complete Database Schema
-- Run this SQL in your Neon Dashboard → SQL Editor
-- URL: https://console.neon.tech → Your Project → SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "User" (
  "id"            TEXT          NOT NULL,
  "name"          TEXT          NOT NULL,
  "email"         TEXT          NOT NULL,
  "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "streakCount"   INTEGER       NOT NULL DEFAULT 0,
  "lastEntryDate" TIMESTAMP(3),
  CONSTRAINT "User_pkey"  PRIMARY KEY ("id"),
  CONSTRAINT "User_email_key" UNIQUE ("email")
);

-- ─── TEMPLATES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Template" (
  "id"          TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
  "name"        TEXT          NOT NULL,
  "description" TEXT,
  "fields"      JSONB         NOT NULL,
  "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- ─── ENTRIES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Entry" (
  "id"             TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"         TEXT          NOT NULL,
  "templateId"     TEXT,
  "body_encrypted" TEXT          NOT NULL,
  "iv"             TEXT          NOT NULL,
  "isPublic"       BOOLEAN       NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Entry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "Entry_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL
);

-- ─── IMAGES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Image" (
  "id"        TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
  "url"       TEXT          NOT NULL,
  "entryId"   TEXT          NOT NULL,
  "metadata"  JSONB,
  "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Image_pkey"   PRIMARY KEY ("id"),
  CONSTRAINT "Image_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE
);

-- ─── TRACKERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Tracker" (
  "id"        TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"    TEXT          NOT NULL,
  "name"      TEXT          NOT NULL,
  "value"     TEXT          NOT NULL,
  "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tracker_pkey"  PRIMARY KEY ("id"),
  CONSTRAINT "Tracker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- ─── ENTRY RESPONSES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EntryResponse" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "entryId"    TEXT NOT NULL,
  "fieldLabel" TEXT NOT NULL,
  "value"      TEXT NOT NULL,
  CONSTRAINT "EntryResponse_pkey"    PRIMARY KEY ("id"),
  CONSTRAINT "EntryResponse_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE
);

-- ─── CHALLENGES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Challenge" (
  "id"          TEXT    NOT NULL DEFAULT gen_random_uuid()::text,
  "name"        TEXT    NOT NULL,
  "duration"    INTEGER NOT NULL,
  "description" TEXT,
  CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- ─── USER CHALLENGES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "UserChallenge" (
  "id"          TEXT    NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"      TEXT    NOT NULL,
  "challengeId" TEXT    NOT NULL,
  "currentDay"  INTEGER NOT NULL DEFAULT 0,
  "completed"   BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "UserChallenge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserChallenge_userId_fkey"      FOREIGN KEY ("userId")      REFERENCES "User"("id")      ON DELETE CASCADE,
  CONSTRAINT "UserChallenge_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE
);

-- ─── BADGES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Badge" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name"      TEXT NOT NULL,
  "icon"      TEXT NOT NULL,
  "condition" TEXT NOT NULL,
  CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- ─── USER BADGES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "UserBadge" (
  "userId"    TEXT          NOT NULL,
  "badgeId"   TEXT          NOT NULL,
  "awardedAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBadge_pkey"     PRIMARY KEY ("userId", "badgeId"),
  CONSTRAINT "UserBadge_userId_fkey"  FOREIGN KEY ("userId")  REFERENCES "User"("id")  ON DELETE CASCADE,
  CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE
);

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "Entry_userId_idx"      ON "Entry"("userId");
CREATE INDEX IF NOT EXISTS "Entry_createdAt_idx"   ON "Entry"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Entry_isPublic_idx"    ON "Entry"("isPublic");
CREATE INDEX IF NOT EXISTS "Tracker_userId_idx"    ON "Tracker"("userId");
CREATE INDEX IF NOT EXISTS "UserChallenge_userId_idx" ON "UserChallenge"("userId");
CREATE INDEX IF NOT EXISTS "UserBadge_userId_idx"  ON "UserBadge"("userId");

-- ─── SEED: Default Templates ──────────────────────────────────
INSERT INTO "Template" ("id", "name", "description", "fields") VALUES
  (gen_random_uuid()::text, 'Personal Journal',     'A free-form space for your thoughts.',       '[{"label":"How are you feeling?","type":"emoji"},{"label":"Write freely...","type":"textarea"}]'),
  (gen_random_uuid()::text, 'Gratitude Journal',    'Focus on positivity and gratitude.',          '[{"label":"Mood","type":"emoji"},{"label":"I am grateful for...","type":"text"},{"label":"Something good that happened","type":"text"},{"label":"Someone I appreciate","type":"text"}]'),
  (gen_random_uuid()::text, 'Productivity Journal', 'Track daily tasks, focus, and growth.',       '[{"label":"Tasks completed today","type":"number"},{"label":"Focus level (1-10)","type":"rating"},{"label":"What did I improve today?","type":"text"},{"label":"Tomorrow''s priority","type":"text"}]'),
  (gen_random_uuid()::text, 'Self Care Journal',    'Monitor well-being, mood, and sleep.',        '[{"label":"Mood","type":"emoji"},{"label":"Sleep hours","type":"number"},{"label":"Stress level (1-10)","type":"rating"},{"label":"Self-care activity","type":"text"},{"label":"Notes","type":"textarea"}]'),
  (gen_random_uuid()::text, 'Finance Journal',      'Track daily finances.',                       '[{"label":"Total expenses today","type":"number"},{"label":"Income received","type":"number"},{"label":"Savings goal progress","type":"text"},{"label":"Notes","type":"textarea"}]'),
  (gen_random_uuid()::text, 'Time Management',      'Analyze daily time use.',                     '[{"label":"Most productive hour","type":"text"},{"label":"Hours worked","type":"number"},{"label":"Hours of leisure","type":"number"},{"label":"What consumed the most time?","type":"text"}]'),
  (gen_random_uuid()::text, 'Yearly Planner',       'Set goals and track annual progress.',        '[{"label":"Goal for this year","type":"text"},{"label":"Progress so far","type":"text"},{"label":"Key milestones hit","type":"textarea"}]')
ON CONFLICT DO NOTHING;

-- ─── SEED: Default Challenges ─────────────────────────────────
INSERT INTO "Challenge" ("id", "name", "duration", "description") VALUES
  (gen_random_uuid()::text, '7 Day Writing Sprint',       7,  'Write every day for 7 days straight.'),
  (gen_random_uuid()::text, '21 Day Habit Builder',       21, 'Build a journaling habit in 21 days.'),
  (gen_random_uuid()::text, '30 Day Consistency Master',  30, 'The ultimate 30-day journaling challenge.')
ON CONFLICT DO NOTHING;
