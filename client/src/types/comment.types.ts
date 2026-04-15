export interface CommentUser {
  id?: string;
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
}

export interface TaskComment {
  id?: string;
  _id?: string;
  content: string;
  taskId: string;
  userId?: string | CommentUser;
  authorId?: string | CommentUser;
  parentId?: string | null;
  mentions?: string[];
  isEdited?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentInput {
  content: string;
}

export interface UpdateCommentInput {
  content: string;
}
