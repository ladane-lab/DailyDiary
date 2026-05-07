import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import fs from "fs";

neonConfig.webSocketConstructor = ws;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL missing");

  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log("Connecting via WebSocket to Neon Postgres...");
  
  try {
    // Just try inserting directly
    console.log("Column 'theme' missing! Adding it now...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "Entry" ADD COLUMN "theme" TEXT DEFAULT 'marble';`);
    console.log("✅ Column 'theme' added successfully!");
  } catch (err: any) {
    fs.writeFileSync("error.log", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    console.error("Migration failed");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
