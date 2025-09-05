import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { loadEnvironmentConfig } from "./config/environment";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

async function startServer() {
  try {
    log('🚀 Starting AJAI server...');
    
    // Step 1: Load and validate environment configuration
    log('📋 Loading environment configuration...');
    const config = loadEnvironmentConfig();
    log(`✅ Environment loaded (NODE_ENV: ${config.NODE_ENV})`);
    
    // Step 2: Register routes and create HTTP server
    log('🛣️  Registering routes...');
    const server = await registerRoutes(app);
    log('✅ Routes registered successfully');

    // Step 3: Setup global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      console.error(`❌ Server Error [${status}]:`, message);
      if (err.stack) console.error('Stack:', err.stack);

      res.status(status).json({ message });
    });

    // Step 4: Setup development/production serving
    log(`🔧 Setting up ${config.NODE_ENV} environment...`);
    if (config.NODE_ENV === "development") {
      await setupVite(app, server);
      log('✅ Vite development server configured');
    } else {
      try {
        serveStatic(app);
        log('✅ Static files configured for production');
      } catch (error: any) {
        console.error('❌ Static file setup failed:', error.message);
        throw new Error(`Static file serving failed: ${error.message}`);
      }
    }

    // Step 5: Start listening with proper error handling
    log(`🌐 Starting server on port ${config.PORT}...`);
    return new Promise<void>((resolve, reject) => {
      const serverInstance = server.listen({
        port: config.PORT,
        host: "0.0.0.0",
        reusePort: true,
      }, (error?: Error) => {
        if (error) {
          console.error('❌ Server failed to start:', error.message);
          reject(error);
          return;
        }
        
        log(`✅ Server running on http://0.0.0.0:${config.PORT}`);
        log(`🌍 Environment: ${config.NODE_ENV}`);
        log(`📊 Trading: ${config.ENABLE_LIVE_TRADING ? 'LIVE' : 'SIMULATION'}`);
        resolve();
      });

      // Handle server errors
      serverInstance.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ Port ${config.PORT} is already in use`);
          reject(new Error(`Port ${config.PORT} is already in use`));
        } else {
          console.error('❌ Server error:', error.message);
          reject(error);
        }
      });

      // Graceful shutdown handling
      const gracefulShutdown = () => {
        log('📥 Received shutdown signal, closing server gracefully...');
        serverInstance.close(() => {
          log('✅ Server closed successfully');
          process.exit(0);
        });
        
        // Force exit after 10 seconds
        setTimeout(() => {
          log('⚠️  Force closing server after timeout');
          process.exit(1);
        }, 10000);
      };

      process.on('SIGTERM', gracefulShutdown);
      process.on('SIGINT', gracefulShutdown);
    });

  } catch (error: any) {
    console.error('💥 Failed to start server:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('💥 Server startup failed:', error.message);
  process.exit(1);
});
