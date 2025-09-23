export interface CollaboratorInfo {
  email: string;
  displayName: string;
  photoURL: string;
  userId: string;
  acceptedAt: Date;
  role: 'viewer' | 'editor' | 'admin';
}

export interface TodoInvitation {
  id: string;
  shareId: string;
  createdBy: string;
  createdAt: Date;
  todoIds: string[];
  title: string;
  description?: string;
  expiresAt?: Date;
  invitedUsers: string[];
  acceptedUsers: CollaboratorInfo[];
  status: 'pending' | 'active' | 'expired';
}

// Helper interface for creating new invitations
export interface CreateInvitationData {
  shareId: string;
  createdBy: string;
  todoIds: string[];
  title: string;
  description?: string;
  expiresAt?: Date;
}

// Helper interface for invitation responses
export interface InvitationResponse {
  invitationId: string;
  userId: string;
  action: 'accept' | 'decline';
  userInfo: {
    email: string;
    displayName: string;
    photoURL: string;
  };
}

// Interface for sharing permissions
export interface SharePermissions {
  canView: boolean;
  canEdit: boolean;
  canShare: boolean;
  canDelete: boolean;
}

// Helper type for invitation status updates
export type InvitationStatus = 'pending' | 'active' | 'expired' | 'cancelled';

// Interface for collaboration settings
export interface CollaborationSettings {
  allowPublicSharing: boolean;
  defaultRole: 'viewer' | 'editor';
  maxCollaborators?: number;
  requireApproval: boolean;
  linkExpirationDays: number;
}

// Helper interface for sharing analytics (future feature)
export interface ShareAnalytics {
  shareId: string;
  totalViews: number;
  uniqueVisitors: number;
  acceptanceRate: number;
  createdAt: Date;
  lastAccessed?: Date;
}

// Interface for real-time collaboration events
export interface CollaborationEvent {
  id: string;
  type: 'todo_updated' | 'todo_completed' | 'todo_deleted' | 'user_joined' | 'user_left';
  todoId: string;
  userId: string;
  userInfo: {
    displayName: string;
    photoURL: string;
  };
  timestamp: Date;
  data?: any; // Additional event-specific data
}

// Helper type for collaboration context
export interface CollaborationContext {
  isCollaborating: boolean;
  currentCollaborators: CollaboratorInfo[];
  userRole: 'owner' | 'viewer' | 'editor' | 'admin';
  permissions: SharePermissions;
  settings: CollaborationSettings;
}

// Interface for shared workspace metadata
export interface SharedWorkspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  collaborators: CollaboratorInfo[];
  todoIds: string[];
  settings: CollaborationSettings;
  isActive: boolean;
}

// Helper type for user collaboration summary
export interface UserCollaborationSummary {
  userId: string;
  totalSharedTodos: number;
  totalCollaborations: number;
  activeInvitations: number;
  recentActivity: CollaborationEvent[];
}

// Interface for invitation link metadata
export interface ShareLinkMetadata {
  shareId: string;
  originalUrl: string;
  shortUrl?: string;
  accessCount: number;
  uniqueAccessors: string[];
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

// Helper interface for batch sharing operations
export interface BatchShareOperation {
  todoIds: string[];
  collaborators: string[]; // email addresses
  role: 'viewer' | 'editor';
  message?: string;
  expirationDays?: number;
}

// Interface for collaboration notifications
export interface CollaborationNotification {
  id: string;
  type: 'invitation_received' | 'invitation_accepted' | 'todo_shared' | 'todo_updated';
  fromUserId: string;
  fromUserInfo: {
    displayName: string;
    photoURL: string;
    email: string;
  };
  toUserId: string;
  todoId?: string;
  invitationId?: string;
  message: string;
  createdAt: Date;
  read: boolean;
}

// Helper type for role-based permissions
export const ROLE_PERMISSIONS: Record<CollaboratorInfo['role'], SharePermissions> = {
  viewer: {
    canView: true,
    canEdit: false,
    canShare: false,
    canDelete: false
  },
  editor: {
    canView: true,
    canEdit: true,
    canShare: false,
    canDelete: false
  },
  admin: {
    canView: true,
    canEdit: true,
    canShare: true,
    canDelete: true
  }
};

// Helper functions for role checking
export function hasPermission(role: CollaboratorInfo['role'], permission: keyof SharePermissions): boolean {
  return ROLE_PERMISSIONS[role][permission];
}

export function canUserEdit(collaborator: CollaboratorInfo): boolean {
  return hasPermission(collaborator.role, 'canEdit');
}

export function canUserShare(collaborator: CollaboratorInfo): boolean {
  return hasPermission(collaborator.role, 'canShare');
}

export function canUserDelete(collaborator: CollaboratorInfo): boolean {
  return hasPermission(collaborator.role, 'canDelete');
}

// Helper type for filtering collaborators by role
export type CollaboratorsByRole = {
  viewers: CollaboratorInfo[];
  editors: CollaboratorInfo[];
  admins: CollaboratorInfo[];
};

// Utility function to group collaborators by role
export function groupCollaboratorsByRole(collaborators: CollaboratorInfo[]): CollaboratorsByRole {
  return collaborators.reduce(
    (acc, collaborator) => {
      switch (collaborator.role) {
        case 'viewer':
          acc.viewers.push(collaborator);
          break;
        case 'editor':
          acc.editors.push(collaborator);
          break;
        case 'admin':
          acc.admins.push(collaborator);
          break;
      }
      return acc;
    },
    { viewers: [], editors: [], admins: [] } as CollaboratorsByRole
  );
}
