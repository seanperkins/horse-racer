# WebSocket Authentication Troubleshooting

## Current Issue

WebSocket connections are being rejected with "Authentication required" error, even after logging in.

## Root Cause

The WebSocket auth handler uses `next-auth/jwt` to decode session cookies, but there's a mismatch between:
1. The secret NextAuth uses to **encode** the session (during login)
2. The secret we use to **decode** the session (during WebSocket connection)

## Quick Fix

On the production server, ensure the `.env` file has **both** these variables set to the **same value**:

```bash
# Check current values
cd /root/horse-racer
grep -E "AUTH_SECRET|NEXTAUTH_SECRET" .env

# They should both be set to the same value
AUTH_SECRET="your-secret-here"
NEXTAUTH_SECRET="your-secret-here"
```

If they're different or only one is set:
1. Copy the value of whichever one exists
2. Set both to the same value
3. Restart the app: `pm2 restart all`
4. **Log out and log back in** to create a fresh session with the correct secret

## Verification Steps

1. **Check the secret is loaded**:
   ```bash
   pm2 logs | grep "Secret available"
   # Should show: "🔒 Secret available: yes (length: XX)"
   ```

2. **Check cookie detection**:
   ```bash
   pm2 logs | grep "Found NextAuth token"
   # Should show: "🔒 Found NextAuth token in cookie: __Secure-authjs.session-token"
   ```

3. **Check for decode errors**:
   ```bash
   pm2 logs | grep "Error extracting"
   # Should NOT show "no matching decryption secret" error
   # Should show: "🔒 Successfully decoded token for user: <user-id>"
   ```

## Why This Happened

When WebSocket authentication was added (commit 708e590), it introduced server-side JWT decoding. Before that, the client would send the `userId` in the `join_lobby` message and the server would trust it.

The new approach is more secure but requires:
- NextAuth to create sessions with a specific secret
- WebSocket handler to decode with the **exact same** secret
- The secret to be available when both NextAuth and the WebSocket handler initialize

## Long-term Solution

Update production `.env` to use `AUTH_SECRET` (NextAuth v5 standard) instead of `NEXTAUTH_SECRET` (legacy):

```bash
# Modern NextAuth v5
AUTH_SECRET="your-secret-value"

# Legacy (can be removed if AUTH_SECRET is set)
# NEXTAUTH_SECRET="your-secret-value"
```

The code supports both for backwards compatibility, but NextAuth v5 prefers `AUTH_SECRET`.
