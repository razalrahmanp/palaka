/**
 * ESSL Device Proxy Server
 * 
 * This lightweight proxy server runs on your local network (e.g., 192.168.1.90)
 * and acts as a bridge between Vercel (cloud) and your ESSL device (local).
 * 
 * Setup:
 * 1. Install dependencies: npm install express cors zklib-js dotenv
 * 2. Create .env file with:
 *    PROXY_SECRET=your-random-secret-key
 *    PROXY_PORT=3001
 * 3. Run: node scripts/essl-proxy-server.js
 * 4. Keep this running 24/7 on your office computer
 * 
 * Security:
 * - Requires API key authentication
 * - CORS restricted to your Vercel domain
 * - Rate limiting enabled
 */

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */

const express = require('express');
const cors = require('cors');
const ZKLib = require('zklib-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PROXY_PORT || 3001;
const SECRET = process.env.PROXY_SECRET || 'change-me-in-production';

// Rate limiting (simple in-memory)
const rateLimits = new Map();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

// Middleware
app.use(express.json());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? .split(',') || ['http://localhost:3000'],
    credentials: true,
}));

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} from ${req.ip}`);
    next();
});

// Rate limiting middleware
app.use((req, res, next) => {
    const ip = req.ip;
    const now = Date.now();

    if (!rateLimits.has(ip)) {
        rateLimits.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return next();
    }

    const limit = rateLimits.get(ip);

    if (now > limit.resetTime) {
        rateLimits.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return next();
    }

    if (limit.count >= RATE_LIMIT) {
        return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded. Try again later.',
        });
    }

    limit.count++;
    next();
});

// Auth middleware
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Missing or invalid authorization header',
        });
    }

    const token = authHeader.slice(7);

    if (token !== SECRET) {
        return res.status(403).json({
            success: false,
            error: 'Invalid API key',
        });
    }

    next();
};

// Health check (no auth required)
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

// Connect to ESSL device and fetch logs
app.post('/sync', authenticate, async(req, res) => {
    const { deviceIp, devicePort = 4370, timeout = 10000 } = req.body;

    if (!deviceIp) {
        return res.status(400).json({
            success: false,
            error: 'deviceIp is required',
        });
    }

    console.log(`[SYNC] Connecting to device at ${deviceIp}:${devicePort}...`);
    const startTime = Date.now();

    try {
        // Create ZKLib connection
        const device = new ZKLib(deviceIp, devicePort, timeout, 'v6.60');

        // Connect to device
        await device.createSocket();
        console.log(`[SYNC] Connected successfully to ${deviceIp}`);

        // Get attendance logs
        const logs = await device.getAttendances();
        console.log(`[SYNC] Fetched ${logs?.data?.length || 0} attendance records`);

        // Get device info
        let deviceInfo = {};
        try {
            deviceInfo = await device.getInfo();
        } catch (infoError) {
            console.warn('[SYNC] Failed to get device info:', infoError.message);
        }

        // Disconnect
        await device.disconnect();
        console.log(`[SYNC] Disconnected from ${deviceIp}`);

        const duration = Date.now() - startTime;

        res.json({
            success: true,
            logs: logs ? .data || [],
            deviceInfo,
            recordCount: logs ? .data ? .length || 0,
            duration,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error(`[SYNC] Error connecting to ${deviceIp}:`, error);

        const duration = Date.now() - startTime;
        const errorMessage = error.message || 'Unknown error';

        // Provide helpful error messages
        let userMessage = errorMessage;
        if (errorMessage.includes('ETIMEDOUT')) {
            userMessage = `Device timeout: ${deviceIp} is not responding. Check device power and network.`;
        } else if (errorMessage.includes('ECONNREFUSED')) {
            userMessage = `Connection refused: Device at ${deviceIp}:${devicePort} refused connection. Check port number.`;
        } else if (errorMessage.includes('EHOSTUNREACH') || errorMessage.includes('ENETUNREACH')) {
            userMessage = `Network unreachable: Cannot reach ${deviceIp}. Check network connectivity.`;
        }

        res.status(500).json({
            success: false,
            error: userMessage,
            details: errorMessage,
            duration,
            timestamp: new Date().toISOString(),
        });
    }
});

// Check device connectivity (quick ping)
app.post('/check', authenticate, async(req, res) => {
    const { deviceIp, devicePort = 4370, timeout = 5000 } = req.body;

    if (!deviceIp) {
        return res.status(400).json({
            success: false,
            error: 'deviceIp is required',
        });
    }

    console.log(`[CHECK] Checking connectivity to ${deviceIp}:${devicePort}...`);
    const startTime = Date.now();

    try {
        const device = new ZKLib(deviceIp, devicePort, timeout, 'v6.60');
        await device.createSocket();
        await device.disconnect();

        const duration = Date.now() - startTime;
        console.log(`[CHECK] Device ${deviceIp} is reachable (${duration}ms)`);

        res.json({
            success: true,
            reachable: true,
            duration,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[CHECK] Device ${deviceIp} is unreachable:`, error.message);

        res.json({
            success: true,
            reachable: false,
            error: error.message,
            duration,
            timestamp: new Date().toISOString(),
        });
    }
});

// Error handler
app.use((err, req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('ESSL Device Proxy Server');
    console.log('='.repeat(60));
    console.log(`Server running on: http://0.0.0.0:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API Key: ${SECRET.slice(0, 8)}...`);
    console.log('='.repeat(60));
    console.log('\nEndpoints:');
    console.log('  GET  /health       - Health check (no auth)');
    console.log('  POST /sync         - Sync attendance logs (requires auth)');
    console.log('  POST /check        - Check device connectivity (requires auth)');
    console.log('\nPress Ctrl+C to stop');
    console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down proxy server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down proxy server...');
    process.exit(0);
});