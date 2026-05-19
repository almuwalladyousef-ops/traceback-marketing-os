export type CompanyStatus = "Not Started" | "In Progress" | "Replied" | "In Conversation" | "Dead";
export type InfluencerPlatform = "IG" | "X";
export type InfluencerStatus = "Active" | "Archived" | "Deleted";
export type PersonalStatus = "Active" | "Archived" | "Dead";
export type ContentScope = "personal" | "traceback";
export type ContentKind = "long_form" | "short_form" | "blogs";
export type ContentStatus = "Idea" | "Outline" | "Script Draft" | "Script Final" | "Filming" | "Editing" | "Published" | "Deleted";

export interface Company {
  id: string;
  name: string;
  url: string | null;
  industry: string | null;
  outreach_date: string | null;
  follow_up_date: string | null;
  follow_up_2_date: string | null;
  follow_up_3_date: string | null;
  status: CompanyStatus;
  reply_notes: string | null;
  archived: boolean;
  soft_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  company_id: string;
  name: string;
  role: string | null;
  email: string | null;
  x_handle: string | null;
  linkedin_url: string | null;
  phone: string | null;
  email_copy_used: string | null;
  dm_copy_used: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Influencer {
  id: string;
  link: string;
  platform: InfluencerPlatform;
  touch_1: boolean;
  touch_2: boolean;
  touch_3: boolean;
  touch_1_date: string | null;
  touch_2_date: string | null;
  touch_3_date: string | null;
  status: InfluencerStatus;
  archive_date: string | null;
  cycle_count: number;
  replied: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonalLead {
  id: string;
  name: string;
  handle_or_url: string | null;
  phone: string | null;
  email: string | null;
  where_found: string | null;
  date_found: string | null;
  follow_up_date: string | null;
  date_contacted: string | null;
  notes: string | null;
  status: PersonalStatus;
  created_at: string;
  updated_at: string;
}

export interface ContentPiece {
  id: string;
  scope: ContentScope;
  kind: ContentKind;
  title: string;
  inspiration_link: string | null;
  status: ContentStatus;
  notes: string | null;
  finish_link: string | null;
  publish_date: string | null;
  about: string | null;
  copy: string | null;
  visual_url: string | null;
  todo_draft_copy: boolean;
  todo_create_visual: boolean;
  todo_schedule_post: boolean;
  todo_publish_post: boolean;
  archived: boolean;
  user_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentAnalysis {
  id: string;
  scope: ContentScope;
  content_piece_id: string | null;
  what_worked: string | null;
  what_didnt: string | null;
  key_lesson: string | null;
  apply_to_next: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  content_pieces?: Pick<ContentPiece, "id" | "title"> | null;
}

export interface CommentLog {
  id: string;
  log_date: string;
  count: number;
  created_at: string;
  updated_at: string;
}

// supabase-js v2 Database generic — must match exactly
export type Database = {
  public: {
    Tables: {
      companies: {
        Row: Company;
        Insert: Omit<Company, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Company, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      contacts: {
        Row: Contact;
        Insert: Omit<Contact, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Contact, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      influencers: {
        Row: Influencer;
        Insert: Omit<Influencer, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Influencer, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      personal_leads: {
        Row: PersonalLead;
        Insert: Omit<PersonalLead, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<PersonalLead, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      content_pieces: {
        Row: ContentPiece;
        Insert: Omit<ContentPiece, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<ContentPiece, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      content_analysis: {
        Row: ContentAnalysis;
        Insert: Omit<ContentAnalysis, "id" | "created_at" | "updated_at" | "content_pieces"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<ContentAnalysis, "id" | "created_at" | "updated_at" | "content_pieces">>;
        Relationships: [];
      };
      comment_logs: {
        Row: CommentLog;
        Insert: Omit<CommentLog, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<CommentLog, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};
