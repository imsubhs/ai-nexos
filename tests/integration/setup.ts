import { config as loadEnv } from "dotenv";

// The integration suite targets the real project described by .env.local.
// Loaded before any spec imports application code, so env validation sees it.
loadEnv({ path: [".env.local", ".env"] });
