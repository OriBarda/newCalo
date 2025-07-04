import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";
import { authRoutes } from "./routes/auth";
import { nutritionRoutes } from "./routes/nutrition";
import { userRoutes } from "./routes/user";
import { calendarRoutes } from "./routes/calendar";
import { deviceRoutes } from "./routes/devices";
import { mealPlanRoutes } from "./routes/mealPlans";
import statisticsRoutes from "./routes/statistics";
import { prisma } from "./lib/database";
import "./services/cron";

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

console.log("🚀 Starting server...");
console.log("📊 Environment:", process.env.NODE_ENV || "development");
console.log("🔌 Port:", PORT);

// Make prisma available to routes
app.locals.prisma = prisma;

// Middleware
app.use(helmet());

// CORS configuration for Expo Go with credentials support
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || "http://localhost:8081",
      "http://localhost:19006", // Expo web
      "http://localhost:19000", // Expo DevTools
      "http://192.168.1.70:19006", // Updated IP for web
      "http://192.168.1.70:8081", // Updated IP for mobile
      "http://192.168.1.70:*", // Allow any port on your IP
      // Add more IP variations if needed for different network configurations
      "http://10.0.0.0/8", // Private network range
      "http://172.16.0.0/12", // Private network range
      "http://192.168.0.0/16", // Private network range
      // Allow all origins for development (remove in production)
      "*",
    ],
    credentials: true, // Enable credentials for cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  })
);

// Cookie parser middleware - MUST be before routes
app.use(cookieParser());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: "supabase-postgresql",
    environment: process.env.NODE_ENV || "development",
    ip: req.ip,
    headers: req.headers,
  });
});

// Test endpoint for connectivity
app.get("/test", (req, res) => {
  console.log("🧪 Test endpoint hit from:", req.ip);
  res.json({
    message: "Server is reachable!",
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    origin: req.headers.origin,
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/nutrition", nutritionRoutes);
app.use("/api/user", userRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/meal-plans", mealPlanRoutes);
app.use("/api", statisticsRoutes);

// Error handler
app.use(errorHandler);

// Start server - binding to 0.0.0.0 allows external connections
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database: Supabase PostgreSQL`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📱 Access from phone: http://192.168.1.70:${PORT}`);
  console.log(`🍪 Cookie-based authentication enabled`);
  console.log(`🧪 Test endpoint: http://192.168.1.70:${PORT}/test`);
  console.log(`💚 Health check: http://192.168.1.70:${PORT}/health`);
});

export default app;