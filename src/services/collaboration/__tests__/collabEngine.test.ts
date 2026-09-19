import { describe, it, expect, beforeEach, vi } from 'vitest';
import { collabEngine } from '../collabEngine';
import { getEuropeGrandTourSampleTrip } from '../../../domain/tripDefaults';

describe('Real-Time Collaboration Engine (CollabEngine)', () => {
  const sampleTrip = getEuropeGrandTourSampleTrip();

  beforeEach(() => {
    // Leave any active room to clean state
    collabEngine.leaveRoom();
  });

  describe('Room Code Generation', () => {
    it('generates valid room code with TRIP- prefix and 4 uppercase chars', () => {
      const code = collabEngine.generateRoomCode();
      expect(code).toMatch(/^TRIP-[A-Z0-9]{4}$/);
    });

    it('generates distinct room codes on successive calls', () => {
      const code1 = collabEngine.generateRoomCode();
      const code2 = collabEngine.generateRoomCode();
      expect(code1).not.toBe(code2);
    });
  });

  describe('User Profile & Customization', () => {
    it('updates user display name and notifies listeners', () => {
      let latestName = '';
      const unsubscribe = collabEngine.subscribe({
        onStateChange: (state) => {
          latestName = state.me.name;
        },
      });

      collabEngine.setUserName('Agustín Explorer');
      expect(latestName).toBe('Agustín Explorer');
      expect(collabEngine.getState().me.name).toBe('Agustín Explorer');

      unsubscribe();
    });

    it('updates user avatar color and notifies listeners', () => {
      collabEngine.setUserColor('#3b82f6');
      expect(collabEngine.getState().me.color).toBe('#3b82f6');
    });

    it('ignores empty user names', () => {
      const original = collabEngine.getState().me.name;
      collabEngine.setUserName('   ');
      expect(collabEngine.getState().me.name).toBe(original);
    });
  });

  describe('Host Room Lifecycle', () => {
    it('creates a room as Host with custom or generated code', () => {
      const roomId = collabEngine.createRoom('Host Capitán', sampleTrip);
      const state = collabEngine.getState();

      expect(roomId).toMatch(/^TRIP-/);
      expect(state.roomId).toBe(roomId);
      expect(state.isHost).toBe(true);
      expect(state.isConnected).toBe(true);
      expect(state.me.isHost).toBe(true);
      expect(state.me.name).toBe('Host Capitán');
    });

    it('leaves the room and resets collaborative state', () => {
      collabEngine.createRoom('Host Test', sampleTrip);
      expect(collabEngine.getState().isConnected).toBe(true);

      collabEngine.leaveRoom();
      const state = collabEngine.getState();
      expect(state.isConnected).toBe(false);
      expect(state.roomId).toBeNull();
      expect(state.isHost).toBe(false);
      expect(state.peers).toEqual([]);
    });
  });

  describe('Guest Room Joining & Updates', () => {
    it('joins an existing room as a guest with normalized uppercase room ID', () => {
      collabEngine.joinRoom('trip-test', 'Viajero Invitado');
      const state = collabEngine.getState();

      expect(state.roomId).toBe('TRIP-TEST');
      expect(state.isHost).toBe(false);
      expect(state.isConnected).toBe(true);
      expect(state.me.isHost).toBe(false);
      expect(state.me.name).toBe('Viajero Invitado');
    });

    it('broadcasts trip update when connected without errors', () => {
      collabEngine.createRoom('Host Broadcaster', sampleTrip);
      const modifiedTrip = { ...sampleTrip, name: 'Viaje Renovado 2026' };

      expect(() => {
        collabEngine.broadcastTripUpdate(modifiedTrip, 'Nombre actualizado');
      }).not.toThrow();
    });
  });

  describe('Listener Subscriptions', () => {
    it('subscribes to state updates and unregisters cleanly', () => {
      const stateListener = vi.fn();
      const unsubscribe = collabEngine.subscribe({
        onStateChange: stateListener,
      });

      expect(stateListener).toHaveBeenCalled();
      const callsBefore = stateListener.mock.calls.length;

      collabEngine.setUserName('Test Listener');
      expect(stateListener.mock.calls.length).toBeGreaterThan(callsBefore);

      unsubscribe();
      const callsAfterUnsub = stateListener.mock.calls.length;
      collabEngine.setUserName('After Unsubscribe');
      expect(stateListener.mock.calls.length).toBe(callsAfterUnsub);
    });
  });
});
