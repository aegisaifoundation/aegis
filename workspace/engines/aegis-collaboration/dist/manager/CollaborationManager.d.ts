import { CollaborationSession } from '../types/index.js';
export declare class CollaborationManager {
    private sessions;
    private activeInvites;
    createSession(name: string, creatorNodeId: string, participants: string[], metadata?: Record<string, any>, customSessionId?: string): CollaborationSession;
    inviteNode(sessionId: string, creatorNodeId: string, inviteeNodeId: string, inviteMetadata: any): void;
    acceptInvite(sessionId: string, inviteeNodeId: string): boolean;
    leaveSession(sessionId: string, nodeId: string): void;
    closeSession(sessionId: string): void;
    getSession(sessionId: string): CollaborationSession | undefined;
    listActiveSessions(): CollaborationSession[];
    listHistory(): CollaborationSession[];
}
