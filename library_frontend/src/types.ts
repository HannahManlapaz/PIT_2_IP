// src/types.ts
export interface Author {
  id: number;
  name: string;
  biography: string;
  nationality: string;
}

export interface Book {
  id: number;
  title: string;
  isbn: string;
  publication_year: number;
  author: number;
  author_name?: string;
  available: boolean;
  cover_image?: File | string | null;
  cover_image_url?: string | null;
  description?: string;
}

export interface Member {
  id: number;
  name: string;
  email: string;
  contact_number: string;
  join_date: string;
  address: string;
}

export interface Loan {
  id: number;
  member: number;
  book: number;
  member_name?: string;
  book_title?: string;
  loan_date: string;
  due_date?: string | null;
  return_date: string | null;
  return_requested_date?: string | null;
  return_verified_date?: string | null;
  return_status?: 'none' | 'pending' | 'verified' | 'rejected' | 'disputed';
  verified_by?: number | null;
  verified_by_name?: string | null;
  notes?: string | null;
  overdue_days?: number;
}

// ── New: Reservation ──
export interface Reservation {
  id: number;
  member: number;
  book: number;
  book_title?: string;
  book_cover_url?: string | null;
  member_name?: string;
  reserved_date: string;
  status: 'waiting' | 'ready' | 'cancelled' | 'expired' | 'fulfilled';
  notified_date?: string | null;
  queue_position?: number | null;
}

export interface AuthUser {
  token?: string;
  access?: string;
  refresh?: string;
  username?: string;
  email?: string;
  user_id?: number;
  role?: 'admin' | 'borrower' | 'superadmin';
  member_id?: number | null;
  error?: string;
}

export interface StaffUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
}

export interface SuperadminStats {
  total_books: number;
  total_authors: number;
  total_members: number;
  total_loans: number;
  active_loans: number;
  pending_returns: number;
  total_staff: number;
}

export interface AdminStats {
  pending_returns: number;
  active_loans: number;
  overdue_loans: number;
  total_members: number;
  total_books: number;
}

export interface PendingReturn {
  id: number;
  book_title: string;
  member_name: string;
  return_requested_date: string;
  notes?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  address?: string;
  birthday?: string;
  age?: number;
  contact_number?: string;
}