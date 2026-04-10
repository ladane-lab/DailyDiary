import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Use WebSocket for Neon connection (works when TCP port 5432 is blocked)
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set in backend/.env");
}

// Prisma v7: datasource URL + adapter for serverless/WebSocket-based Neon
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: connectionString,
  },
  migrate: {
    adapter: (env) => new PrismaNeon({ connectionString: env.DATABASE_URL! }),
  },
});
