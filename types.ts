export type SQLUserType = {
    id: string;
    name: string;
    avatar: string;
  };
  
  export type SQLCommentType = {
    id: string;
    user_id: string;
    created_at: string;
    text: string;
    upvotes: string[];
  };
  
  export type CommentType = {
    id: string;
    replies: CommentType[];
    upvotes: [];
    time: string;
    text: string;
    user: SQLUserType;
  };
  
  export type SQLUserThreadsType = {
    id: string;
  };
  