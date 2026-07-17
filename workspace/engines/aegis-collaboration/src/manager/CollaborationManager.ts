import { randomUUID } from 'crypto';
import { CollaborationSession } from '../types/index.js';

export class CollaborationManager {
  private sessions = new Map<string, CollaborationSession>();
  private activeInvites = new Map<string, { creatorNodeId: string; metadata: any }>();

  createSession(
    name: string,
    creatorNodeId: string,
    participants: string[],
    metadata: Record<string, any> = {},
    customSessionId?: string
  ): CollaborationSession {
    const sessionId = customSessionId ?? `session-${randomUUID()}`;
    const session: CollaborationSession = {
      sessionId,
      name,
      status: 'active',
      participants: [creatorNodeId, ...participants.filter(p => p !== creatorNodeId)],
      creatorNodeId,
      createdAt: new Date(),
      metadata
    };

    this.sessions.set(sessionId, session);
    console.log(`[CollaborationManager] Created session ${session.sessionId} with ${session.participants.length} nodes`);
    return session;
  }

  inviteNode(sessionId: string, creatorNodeId: string, inviteeNodeId: string, inviteMetadata: any): void {
    const inviteKey = `${sessionId}:${inviteeNodeId}`;
    this.activeInvites.set(inviteKey, { creatorNodeId, metadata: inviteMetadata });
    console.log(`[CollaborationManager] Invitation sent from ${creatorNodeId} to ${inviteeNodeId} for session ${sessionId}`);
  }

  acceptInvite(sessionId: string, inviteeNodeId: string): boolean {
    const inviteKey = `${sessionId}:${inviteeNodeId}`;
    if (!this.activeInvites.has(inviteKey)) {
      console.warn(`[CollaborationManager] Invitation not found: ${inviteKey}`);
      return false;
    }

    this.activeInvites.delete(inviteKey);
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`[CollaborationManager] Session ${sessionId} not found`);
      return false;
    }

    if (!session.participants.includes(inviteeNodeId)) {
      session.participants.push(inviteeNodeId);
      console.log(`[CollaborationManager] Node ${inviteeNodeId} accepted invitation and joined session ${sessionId}`);
    }

    return true;
  }

  leaveSession(sessionId: string, nodeId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    (session as any).participants = session.participants.filter(p => p !== nodeId);
    console.log(`[CollaborationManager] Node ${nodeId} left session ${sessionId}`);
  }

  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.status = 'closed';
    console.log(`[CollaborationManager] Closed session ${sessionId}`);
  }

  getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }

  listActiveSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  listHistory(): CollaborationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'closed');
  }
}
