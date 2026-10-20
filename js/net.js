// Euro Flow – Online-Spiel über WebRTC (PeerJS). Kein eigener Server nötig:
// Der Host-Browser hält den Spielstand, die anderen verbinden sich direkt mit ihm.
const PREFIX = 'euroflow02-';
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const newCode = () => Array.from({ length: 5 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');

const peerOptions = { debug: 1 };

export function hostRoom(code, { onMessage, onPeers, onError }) {
  return new Promise((resolve, reject) => {
    const peer = new window.Peer(PREFIX + code, peerOptions);
    const conns = new Map();
    const api = {
      code, id: 'host',
      broadcast(msg) { for (const c of conns.values()) if (c.open) c.send(msg); },
      send(peerId, msg) { const c = conns.get(peerId); if (c?.open) c.send(msg); },
      count: () => conns.size,
      close() { peer.destroy(); },
    };
    peer.on('open', () => resolve(api));
    peer.on('connection', conn => {
      conn.on('open', () => { conns.set(conn.peer, conn); onPeers?.(conns.size); });
      conn.on('data', msg => onMessage(conn.peer, msg));
      conn.on('close', () => { conns.delete(conn.peer); onPeers?.(conns.size); });
    });
    peer.on('error', e => {
      if (e.type === 'unavailable-id') reject(new Error('Dieser Raum-Code ist schon vergeben.'));
      else if (!peer.open) reject(e); else onError?.(e);
    });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch { /* ignore */ } });
  });
}

export function joinRoom(code, { onMessage, onClose }) {
  return new Promise((resolve, reject) => {
    const peer = new window.Peer(peerOptions);
    let done = false;
    peer.on('open', id => {
      const conn = peer.connect(PREFIX + code.toUpperCase(), { reliable: true });
      const timer = setTimeout(() => { if (!done) reject(new Error('Raum nicht gefunden. Ist der Host noch online?')); }, 12000);
      conn.on('open', () => {
        done = true; clearTimeout(timer);
        resolve({ id, send: msg => conn.open && conn.send(msg), close: () => peer.destroy() });
      });
      conn.on('data', onMessage);
      conn.on('close', () => onClose?.());
    });
    peer.on('error', e => {
      if (!done) reject(e.type === 'peer-unavailable' ? new Error('Raum nicht gefunden. Code prüfen!') : e);
    });
  });
}
