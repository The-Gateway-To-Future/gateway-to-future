import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import router from './routes';
import { apiLimiter } from './middleware/rate-limit.middleware';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://api.fontshare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://api.fontshare.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://api.fontshare.com", "https://fonts.gstatic.com"],
        connectSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https://gatewaytofuture.com"],
        frameSrc: ["'self'", "https://www.youtube.com"],
      },
    },
  })
);

// Cross-Origin Resource Sharing (CORS) setup
app.use(cors());

// Express json parser with raw body retention for webhook verification
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint (exposed at root for deployment checks)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Apply rate limiting to all API requests
app.use('/api', apiLimiter);

// API routes entry point
app.use('/api', router);

// Serve Premium Front-End Client Static Files
app.use(express.static(path.join(__dirname, '../public')));

// Fallback routing to index.html for Single Page Application behavior
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Centralized error handling
app.use(errorHandler);

export default app;
