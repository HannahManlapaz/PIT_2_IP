import { Author, Book, Member, Loan, AuthUser } from './types';

const BASE_URL = 'http://127.0.0.1:8000/api';

const getToken = () => localStorage.getItem('token');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Authorization': `Token ${getToken()}`,
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    },
    ...options,
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('member_id');
    window.location.href = '/';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err) || `API error: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export const loginApi = (username: string, password: string): Promise<AuthUser> =>
  fetch(`${BASE_URL}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }).then(res => res.json());

export const registerApi = (data: {
  username: string; password: string; name: string;
  email: string; contact_number: string; address: string;
}): Promise<AuthUser> =>
  fetch(`${BASE_URL}/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(res => res.json());

export const logoutApi = () =>
  request<void>('/logout/', { method: 'POST' });

// Authors
export const getAuthors   = () => request<Author[]>('/authors/');
export const createAuthor = (data: Omit<Author, 'id'>) =>
  request<Author>('/authors/', { method: 'POST', body: JSON.stringify(data) });
export const updateAuthor = (id: number, data: Omit<Author, 'id'>) =>
  request<Author>(`/authors/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAuthor = (id: number) =>
  request<void>(`/authors/${id}/`, { method: 'DELETE' });

// Books
export const getBooks = () => request<Book[]>('/books/');
export const createBook = (data: Omit<Book, 'id' | 'author_name' | 'cover_image_url'>) => {
  const fd = new FormData();
  fd.append('title',            data.title);
  fd.append('isbn',             data.isbn);
  fd.append('publication_year', String(data.publication_year));
  fd.append('author',           String(data.author));
  fd.append('available',        String(data.available));
  if (data.cover_image instanceof File) fd.append('cover_image', data.cover_image);
  return request<Book>('/books/', { method: 'POST', body: fd });
};
export const updateBook = (id: number, data: Omit<Book, 'id' | 'author_name' | 'cover_image_url'>) => {
  const fd = new FormData();
  fd.append('title',            data.title);
  fd.append('isbn',             data.isbn);
  fd.append('publication_year', String(data.publication_year));
  fd.append('author',           String(data.author));
  fd.append('available',        String(data.available));
  if (data.cover_image instanceof File) fd.append('cover_image', data.cover_image);
  return request<Book>(`/books/${id}/`, { method: 'PUT', body: fd });
};
export const deleteBook = (id: number) =>
  request<void>(`/books/${id}/`, { method: 'DELETE' });

// Members
export const getMembers   = () => request<Member[]>('/members/');
export const createMember = (data: Omit<Member, 'id'>) =>
  request<Member>('/members/', { method: 'POST', body: JSON.stringify(data) });
export const updateMember = (id: number, data: Omit<Member, 'id'>) =>
  request<Member>(`/members/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteMember = (id: number) =>
  request<void>(`/members/${id}/`, { method: 'DELETE' });

// Loans
export const getLoans   = () => request<Loan[]>('/loans/');
export const createLoan = (data: Omit<Loan, 'id' | 'member_name' | 'book_title'>) =>
  request<Loan>('/loans/', { method: 'POST', body: JSON.stringify(data) });
export const updateLoan = (id: number, data: Omit<Loan, 'id' | 'member_name' | 'book_title'>) =>
  request<Loan>(`/loans/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteLoan = (id: number) =>
  request<void>(`/loans/${id}/`, { method: 'DELETE' });

// Borrower
export const borrowerGetBooks  = () => request<Book[]>('/borrower/books/');
export const borrowerBorrow    = (book_id: number) =>
  request<Loan>('/borrower/borrow/', { method: 'POST', body: JSON.stringify({ book_id }) });
export const borrowerReturn    = (loan_id: number) =>
  request<Loan>(`/borrower/return/${loan_id}/`, { method: 'POST' });
export const borrowerHistory   = () => request<Loan[]>('/borrower/history/');

// Superadmin
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
  total_staff: number;
}

export const superadminGetStats  = () => request<SuperadminStats>('/superadmin/stats/');
export const superadminGetStaff  = () => request<StaffUser[]>('/superadmin/staff/');
export const superadminCreateStaff = (data: { username: string; password: string; email?: string; first_name?: string; last_name?: string }) =>
  request<StaffUser>('/superadmin/staff/create/', { method: 'POST', body: JSON.stringify(data) });
export const superadminToggleStaff = (id: number) =>
  request<StaffUser>(`/superadmin/staff/${id}/toggle/`, { method: 'PATCH' });
export const superadminDeleteStaff = (id: number) =>
  request<void>(`/superadmin/staff/${id}/delete/`, { method: 'DELETE' });