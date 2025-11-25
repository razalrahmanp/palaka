# ESSL Device Connection Issue - Vercel Deployment

## Problem

When running locally (`npm run dev`), the attendance sync works because:
- Your dev server runs on `localhost` (192.168.1.90/115)
- It can directly reach the ESSL device at 192.168.1.71 on the same network

When deployed to Vercel, sync fails because:
- Vercel servers are in the cloud (AWS/Google Cloud)
- They **cannot** reach your private network (192.168.1.x)
- The ESSL device is behind your router/firewall

```
❌ Vercel Deployment Flow:
Browser (192.168.1.90) → Vercel (cloud) → 192.168.1.71 ❌ CANNOT REACH

✅ Local Development Flow:
Browser (192.168.1.90) → Localhost (192.168.1.90) → 192.168.1.71 ✅ SUCCESS
```

## Solutions

### Option 1: Local Proxy Server (Recommended)

Deploy a lightweight proxy server on one of your office machines (192.168.1.90 or 192.168.1.115) that stays running 24/7.

**Pros:**
- Simple to implement
- Secure (only accepts requests from your Vercel app)
- No changes to existing device setup

**Cons:**
- Requires one machine to stay on

**Implementation:**
See `scripts/essl-proxy-server.js` for the proxy server code.

### Option 2: VPN/Tunnel to Device

Use Cloudflare Tunnel, ngrok, or Tailscale to expose the ESSL device to Vercel.

**Pros:**
- No need for dedicated proxy server
- Official solution from tunnel providers

**Cons:**
- More complex setup
- Potential security concerns
- May require paid plans

### Option 3: Move Back to Self-Hosted

Deploy the entire application on a server within your office network instead of Vercel.

**Pros:**
- Full control
- No connectivity issues
- Can use existing server hardware

**Cons:**
- Need to manage server yourself
- Setup complexity
- Requires static IP or DDNS

### Option 4: Hybrid Approach (Best for Production)

- Keep main app on Vercel (fast, reliable)
- Run small ESSL sync service on local network
- Services communicate via secure API

**Pros:**
- Best of both worlds
- Vercel handles main app (fast, scalable)
- Local service handles device communication

**Cons:**
- Two deployments to manage
- Need authentication between services

## Recommended Implementation

**Step 1:** Set up the local proxy server (10 minutes)

```bash
# On your office computer (192.168.1.90 or .115)
cd g:\PROJECT\Al_Rams\palaka\scripts
node essl-proxy-server.js
```

**Step 2:** Update environment variables on Vercel

```
ESSL_PROXY_URL=http://YOUR_PUBLIC_IP:3001
ESSL_PROXY_SECRET=your-random-secret-key
```

**Step 3:** Update the sync API to use the proxy

The sync API will detect if `ESSL_PROXY_URL` is set and route requests through it.

## Testing

1. **Local test:**
   ```bash
   # Terminal 1: Start proxy
   node scripts/essl-proxy-server.js
   
   # Terminal 2: Test from curl
   curl http://localhost:3001/health
   ```

2. **Remote test from Vercel:**
   - Deploy to Vercel with ESSL_PROXY_URL set
   - Access attendance page
   - Should now work from any network!

## Security Considerations

- Proxy uses API key authentication (ESSL_PROXY_SECRET)
- Only accepts requests from your Vercel domain
- Rate limiting enabled (10 req/min per IP)
- HTTPS recommended (use nginx reverse proxy)

## Port Forwarding Setup

If you need to access from Vercel, you'll need to:

1. **Port forward on your router:**
   - Forward port 3001 → 192.168.1.90:3001
   - Get your public IP from https://whatismyip.com

2. **Use DDNS (if IP changes):**
   - Sign up for No-IP or DuckDNS
   - Point domain to your public IP
   - Update ESSL_PROXY_URL to use domain

## Alternative: Tailscale (Easiest)

Install Tailscale on:
- Your office computer (proxy server)
- Vercel (via Tailscale API)

This creates a VPN so Vercel can reach your local network without port forwarding.
