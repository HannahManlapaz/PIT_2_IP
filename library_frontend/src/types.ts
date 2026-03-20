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
  overdue_days?: number;
}

export interface AuthUser {
  token?: string;
  username?: string;
  role?: 'admin' | 'borrower' | 'superadmin';
  member_id?: number | null;
  error?: string;
}