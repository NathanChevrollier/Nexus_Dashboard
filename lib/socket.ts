import { createHmac } from 'crypto';

const SOCKET_BASE = (process.env.SOCKET_EMIT_URL || process.env.SOCKET_SERVER_URL || 'http://localhost:4001').replace(/\/$/, '');
const SOCKET_EMIT_ENDPOINT = `${SOCKET_BASE}/emit`;

export async function emitToUser(targetUserId: string, event: string, payload: any = {}) {
  const secret = process.env.SOCKET_SERVER_SECRET || process.env.SOCKET_EMIT_SECRET;
  try {
    const ts = Date.now().toString();
    const canonical = `${event}|${targetUserId}|${ts}|${JSON.stringify(payload || {})}`;
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (secret) {
      const sig = createHmac('sha256', secret).update(canonical).digest('hex');
      headers['x-socket-signature'] = sig;
      headers['x-socket-timestamp'] = ts;
    }
    // Backwards-compat header for very old servers
    if (!headers['x-socket-token'] && secret) headers['x-socket-token'] = secret;

    await fetch(SOCKET_EMIT_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ event, targetUserId, payload, timestamp: Number(ts) }),
    });
  } catch (e) {
    console.warn('emitToUser error', e);
  }
}

export default { emitToUser };
