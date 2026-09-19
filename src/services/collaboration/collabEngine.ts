import { Trip } from '../../domain/types';
import {
  Collaborator,
  CollabMessage,
  CollaborationState,
  CollabEngineListener,
} from './types';

const COLLAB_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

const USER_ID_KEY = 'travel_optimizer_collab_user_id';
const USER_NAME_KEY = 'travel_optimizer_collab_user_name';
const USER_COLOR_KEY = 'travel_optimizer_collab_user_color';

function getOrInitUser(): { id: string; name: string; color: string } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      id: `usr-${Math.random().toString(36).slice(2, 8)}`,
      name: 'Viajero',
      color: COLLAB_COLORS[0],
    };
  }

  let id = window.localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = `usr-${Math.random().toString(36).slice(2, 9)}`;
    window.localStorage.setItem(USER_ID_KEY, id);
  }

  let name = window.localStorage.getItem(USER_NAME_KEY);
  if (!name) {
    name = `Viajero ${Math.floor(100 + Math.random() * 900)}`;
    window.localStorage.setItem(USER_NAME_KEY, name);
  }

  let color = window.localStorage.getItem(USER_COLOR_KEY);
  if (!color || !COLLAB_COLORS.includes(color)) {
    color = COLLAB_COLORS[Math.floor(Math.random() * COLLAB_COLORS.length)];
    window.localStorage.setItem(USER_COLOR_KEY, color);
  }

  return { id, name, color };
}

export class CollabEngine {
  private static instance: CollabEngine;
  private listeners: Set<CollabEngineListener> = new Set();

  private channel: BroadcastChannel | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  private state: CollaborationState;
  private currentTripRef: Trip | null = null;

  private constructor() {
    const user = getOrInitUser();
    this.state = {
      roomId: null,
      isHost: false,
      isConnected: false,
      me: {
        id: user.id,
        name: user.name,
        color: user.color,
        isHost: false,
        joinedAt: Date.now(),
        lastActive: Date.now(),
      },
      peers: [],
    };

    // Listen for storage events as fallback bus
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent);
      window.addEventListener('beforeunload', () => this.leaveRoom());
    }
  }

  public static getInstance(): CollabEngine {
    if (!CollabEngine.instance) {
      CollabEngine.instance = new CollabEngine();
    }
    return CollabEngine.instance;
  }

  public getState(): CollaborationState {
    return { ...this.state, peers: [...this.state.peers] };
  }

  public setUserName(name: string): void {
    if (typeof name !== 'string') return;
    const trimmed = name.trim();
    if (!trimmed) return;
    this.state.me.name = trimmed;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(USER_NAME_KEY, trimmed);
    }
    this.notifyStateChange();
    if (this.state.isConnected) {
      this.sendMessage({
        type: 'HEARTBEAT',
        roomId: this.state.roomId!,
        sender: this.state.me,
        timestamp: Date.now(),
      });
    }
  }

  public setUserColor(color: string): void {
    this.state.me.color = color;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(USER_COLOR_KEY, color);
    }
    this.notifyStateChange();
  }

  public setCurrentTripRef(trip: Trip | null): void {
    this.currentTripRef = trip;
  }

  /**
   * Generates a unique 6-character room code (e.g. TRIP-7492)
   */
  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return `TRIP-${code}`;
  }

  /**
   * Creates a new collaborative room as Host
   */
  public createRoom(hostName?: string, initialTrip?: Trip): string {
    if (this.state.isConnected) {
      this.leaveRoom();
    }

    if (hostName) {
      this.setUserName(hostName);
    }

    const roomId = this.generateRoomCode();
    this.state.roomId = roomId;
    this.state.isHost = true;
    this.state.isConnected = true;
    this.state.me.isHost = true;
    this.state.peers = [];

    if (initialTrip) {
      this.currentTripRef = initialTrip;
    }

    this.connectTransport(roomId);
    this.startHeartbeat();
    this.notifyStateChange();

    return roomId;
  }

  /**
   * Joins an existing collaborative room as Guest
   */
  public joinRoom(roomId: string, guestName?: string): void {
    const normalized = roomId.trim().toUpperCase();
    if (!normalized) return;

    if (this.state.isConnected) {
      this.leaveRoom();
    }

    if (guestName) {
      this.setUserName(guestName);
    }

    this.state.roomId = normalized;
    this.state.isHost = false;
    this.state.isConnected = true;
    this.state.me.isHost = false;
    this.state.peers = [];

    this.connectTransport(normalized);
    this.startHeartbeat();

    // Broadcast JOIN message
    this.sendMessage({
      type: 'JOIN',
      roomId: normalized,
      sender: this.state.me,
      timestamp: Date.now(),
    });

    this.notifyStateChange();
  }

  /**
   * Disconnects and leaves the current collaborative room
   */
  public leaveRoom(): void {
    if (!this.state.isConnected || !this.state.roomId) return;

    // Broadcast LEAVE
    try {
      this.sendMessage({
        type: 'LEAVE',
        roomId: this.state.roomId,
        sender: this.state.me,
        timestamp: Date.now(),
      });
    } catch {
      // Ignore
    }

    this.disconnectTransport();
    this.stopHeartbeat();

    this.state.roomId = null;
    this.state.isHost = false;
    this.state.isConnected = false;
    this.state.me.isHost = false;
    this.state.peers = [];
    this.state.lastRemoteUpdate = undefined;

    this.notifyStateChange();
  }

  /**
   * Broadcasts a trip change made by the local user to all peers in the room
   */
  public broadcastTripUpdate(trip: Trip, description?: string): void {
    if (!this.state.isConnected || !this.state.roomId) return;

    this.currentTripRef = trip;
    this.sendMessage({
      type: 'TRIP_UPDATE',
      roomId: this.state.roomId,
      sender: this.state.me,
      trip,
      changeDescription: description,
      timestamp: Date.now(),
    });
  }

  public subscribe(listener: CollabEngineListener): () => void {
    this.listeners.add(listener);
    listener.onStateChange?.(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private connectTransport(roomId: string): void {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(`travel_optimizer_collab_${roomId}`);
      this.channel.onmessage = (e) => this.handleMessage(e.data);
    }
  }

  private disconnectTransport(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }

  private sendMessage(msg: CollabMessage): void {
    // 1. Broadcast via BroadcastChannel
    if (this.channel) {
      this.channel.postMessage(msg);
    }

    // 2. Broadcast via localStorage bus for multi-tab fallback
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const busKey = `travel_optimizer_bus_${msg.roomId}`;
        window.localStorage.setItem(busKey, JSON.stringify({ ...msg, _nonce: Math.random() }));
      } catch (err) {
        console.warn('[CollabEngine] Error writing to storage bus:', err);
      }
    }
  }

  private handleStorageEvent = (e: StorageEvent): void => {
    if (!this.state.isConnected || !this.state.roomId) return;
    if (e.key === `travel_optimizer_bus_${this.state.roomId}` && e.newValue) {
      try {
        const msg: CollabMessage = JSON.parse(e.newValue);
        this.handleMessage(msg);
      } catch {
        // Ignore
      }
    }
  };

  private handleMessage(msg: CollabMessage): void {
    if (!msg || msg.roomId !== this.state.roomId) return;
    if (msg.sender?.id === this.state.me.id) return; // Ignore own echoes

    const now = Date.now();
    const sender = { ...msg.sender, lastActive: now };

    switch (msg.type) {
      case 'JOIN': {
        this.upsertPeer(sender);
        // If we are host or have current trip, send current state to newly joined peer
        if (this.state.isHost && this.currentTripRef) {
          this.sendMessage({
            type: 'TRIP_UPDATE',
            roomId: this.state.roomId,
            sender: this.state.me,
            trip: this.currentTripRef,
            changeDescription: 'Initial state sync',
            timestamp: now,
          });
        }
        // Respond with HEARTBEAT so newcomer knows we are here
        this.sendMessage({
          type: 'HEARTBEAT',
          roomId: this.state.roomId,
          sender: this.state.me,
          timestamp: now,
        });

        this.listeners.forEach((l) => l.onCollaboratorJoined?.(sender));
        break;
      }

      case 'HEARTBEAT': {
        this.upsertPeer(sender);
        break;
      }

      case 'TRIP_UPDATE': {
        this.upsertPeer(sender);
        if (msg.trip) {
          this.currentTripRef = msg.trip;
          this.state.lastRemoteUpdate = {
            senderName: sender.name,
            changeDesc: msg.changeDescription || 'Itinerary updated',
            timestamp: now,
          };
          this.notifyStateChange();
          this.listeners.forEach((l) =>
            l.onTripRemoteUpdate?.(msg.trip!, sender, msg.changeDescription)
          );
        }
        break;
      }

      case 'LEAVE': {
        this.removePeer(sender.id);
        this.listeners.forEach((l) => l.onCollaboratorLeft?.(sender));
        break;
      }
    }
  }

  private upsertPeer(peer: Collaborator): void {
    const idx = this.state.peers.findIndex((p) => p.id === peer.id);
    if (idx >= 0) {
      this.state.peers[idx] = { ...this.state.peers[idx], ...peer, lastActive: Date.now() };
    } else {
      this.state.peers.push({ ...peer, lastActive: Date.now() });
    }
    this.notifyStateChange();
  }

  private removePeer(peerId: string): void {
    this.state.peers = this.state.peers.filter((p) => p.id !== peerId);
    this.notifyStateChange();
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    // Broadcast heartbeat every 3 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.state.isConnected && this.state.roomId) {
        this.sendMessage({
          type: 'HEARTBEAT',
          roomId: this.state.roomId,
          sender: this.state.me,
          timestamp: Date.now(),
        });
      }
    }, 3000);

    // Prune peers inactive for > 10 seconds
    this.cleanupInterval = setInterval(() => {
      const threshold = Date.now() - 10000;
      const initialCount = this.state.peers.length;
      this.state.peers = this.state.peers.filter((p) => p.lastActive > threshold);
      if (this.state.peers.length !== initialCount) {
        this.notifyStateChange();
      }
    }, 4000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private notifyStateChange(): void {
    const currentState = this.getState();
    this.listeners.forEach((l) => l.onStateChange?.(currentState));
  }
}

export const collabEngine = CollabEngine.getInstance();
