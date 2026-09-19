import { Trip } from '../../domain/types';

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  joinedAt: number;
  lastActive: number;
}

export type CollabMessageType =
  | 'JOIN'
  | 'HEARTBEAT'
  | 'TRIP_UPDATE'
  | 'SYNC_REQUEST'
  | 'LEAVE';

export interface CollabMessage {
  type: CollabMessageType;
  roomId: string;
  sender: Collaborator;
  trip?: Trip;
  changeDescription?: string;
  timestamp: number;
}

export interface CollaborationState {
  roomId: string | null;
  isHost: boolean;
  isConnected: boolean;
  me: Collaborator;
  peers: Collaborator[];
  lastRemoteUpdate?: {
    senderName: string;
    changeDesc: string;
    timestamp: number;
  };
}

export interface CollabEngineListener {
  onStateChange?: (state: CollaborationState) => void;
  onTripRemoteUpdate?: (trip: Trip, sender: Collaborator, description?: string) => void;
  onCollaboratorJoined?: (collaborator: Collaborator) => void;
  onCollaboratorLeft?: (collaborator: Collaborator) => void;
}
