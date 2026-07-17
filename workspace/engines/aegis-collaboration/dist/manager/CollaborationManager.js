import { randomUUID } from 'crypto';
export class CollaborationManager {
    sessions = new Map();
    activeInvites = new Map();
    createSession(name, creatorNodeId, participants, metadata = {}, customSessionId) {
        const sessionId = customSessionId ?? `session-${randomUUID()}`;
        const session = {
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
    inviteNode(sessionId, creatorNodeId, inviteeNodeId, inviteMetadata) {
        const inviteKey = `${sessionId}:${inviteeNodeId}`;
        this.activeInvites.set(inviteKey, { creatorNodeId, metadata: inviteMetadata });
        console.log(`[CollaborationManager] Invitation sent from ${creatorNodeId} to ${inviteeNodeId} for session ${sessionId}`);
    }
    acceptInvite(sessionId, inviteeNodeId) {
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
    leaveSession(sessionId, nodeId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        session.participants = session.participants.filter(p => p !== nodeId);
        console.log(`[CollaborationManager] Node ${nodeId} left session ${sessionId}`);
    }
    closeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        session.status = 'closed';
        console.log(`[CollaborationManager] Closed session ${sessionId}`);
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    listActiveSessions() {
        return Array.from(this.sessions.values()).filter(s => s.status === 'active');
    }
    listHistory() {
        return Array.from(this.sessions.values()).filter(s => s.status === 'closed');
    }
}
