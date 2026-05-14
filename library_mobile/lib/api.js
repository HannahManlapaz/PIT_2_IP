// library_mobile/lib/api.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const getToken = async () => await AsyncStorage.getItem("token");

const api = axios.create({ baseURL: BASE_URL });

// Auto-attach token
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.multiRemove(["token", "username", "role", "member_id"]);
      router.replace("/(auth)/login");
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────
export const loginApi = (email, password) =>
  axios.post(`${BASE_URL}/login/`, { email, password }).then((r) => r.data);

export const registerApi = (data) =>
  axios.post(`${BASE_URL}/register/`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);

export const logoutApi = () =>
  api.post("/logout/");

// ── Authors ───────────────────────────────────────
export const getAuthors = () =>
  api.get("/authors/").then((r) => r.data);

export const createAuthor = (data) =>
  api.post("/authors/", data).then((r) => r.data);

export const updateAuthor = (id, data) =>
  api.put(`/authors/${id}/`, data).then((r) => r.data);

export const deleteAuthor = (id) =>
  api.delete(`/authors/${id}/`);

// ── Books ─────────────────────────────────────────
// ── Books ─────────────────────────────────────────
export const getBooks = () =>
  api.get("/books/").then((r) => r.data);

export const createBook = (payload, config = {}) =>
  api.post("/books/", payload, config).then((r) => r.data);

export const updateBook = (id, payload, config = {}) =>
  api.patch(`/books/${id}/`, payload, config).then((r) => r.data);

export const deleteBook = (id) =>
  api.delete(`/books/${id}/`);

// ── Members ───────────────────────────────────────
export const getMembers = () =>
  api.get("/members/").then((r) => r.data);

export const createMember = (data) =>
  api.post("/members/", data).then((r) => r.data);

export const updateMember = (id, data) =>
  api.put(`/members/${id}/`, data).then((r) => r.data);

export const deleteMember = (id) =>
  api.delete(`/members/${id}/`);

// ── Loans ─────────────────────────────────────────
export const getLoans = () =>
  api.get("/loans/").then((r) => r.data);

export const createLoan = (data) =>
  api.post("/loans/", data).then((r) => r.data);

export const updateLoan = (id, data) =>
  api.put(`/loans/${id}/`, data).then((r) => r.data);

export const deleteLoan = (id) =>
  api.delete(`/loans/${id}/`);

// ── Borrower ──────────────────────────────────────
export const getProfile = () =>
  api.get("/borrower/profile/").then((r) => r.data);

export const updateProfile = (data) =>
  api.patch("/borrower/profile/", data).then((r) => r.data);

export const changePassword = (data) =>
  api.post("/borrower/profile/change-password/", data).then((r) => r.data);

export const deleteAccount = () =>
  api.delete("/borrower/profile/");

export const borrowerGetBooks = () =>
  api.get("/borrower/books/").then((r) => r.data);

export const borrowerBorrow = (book_id) =>
  api.post("/borrower/borrow/", { book_id }).then((r) => r.data);

export const borrowerReturnRequest = (loanId) =>
  api.post(`/borrower/return-request/${loanId}/`).then((r) => r.data);

export const borrowerHistory = () =>
  api.get("/borrower/history/").then((r) => r.data);

export const borrowerPendingReturns = () =>
  api.get("/borrower/pending-returns/").then((r) => r.data);

// ── Reservations ──────────────────────────────────
export const borrowerReserve = (book_id) =>
  api.post("/borrower/reserve/", { book_id }).then((r) => r.data);

export const borrowerMyReservations = () =>
  api.get("/borrower/my-reservations/").then((r) => r.data);

export const borrowerCancelReservation = (reservationId) =>
  api.post(`/borrower/cancel-reservation/${reservationId}/`).then((r) => r.data);

// ── Admin ─────────────────────────────────────────
export const getAdminStats = () =>
  api.get("/admin/stats/").then((r) => r.data);

export const getPendingReturns = () =>
  api.get("/admin/pending-returns/").then((r) => r.data);

export const verifyReturn = (loanId, notes) =>
  api.post("/admin/verify-return/", { loan_id: loanId, notes }).then((r) => r.data);

export const rejectReturn = (loanId, reason) =>
  api.post("/admin/reject-return/", { loan_id: loanId, reason }).then((r) => r.data);

// ── Superadmin ────────────────────────────────────
export const superadminGetStats = () =>
  api.get("/superadmin/stats/").then((r) => r.data);

export const superadminGetStaff = () =>
  api.get("/superadmin/staff/").then((r) => r.data);

export const superadminCreateStaff = (data) =>
  api.post("/superadmin/staff/create/", data).then((r) => r.data);

export const superadminToggleStaff = (id) =>
  api.patch(`/superadmin/staff/${id}/toggle/`).then((r) => r.data);

export const superadminDeleteStaff = (id) =>
  api.delete(`/superadmin/staff/${id}/delete/`);

export const superadminEditStaff = (id, data) =>
  api.patch(`/superadmin/staff/${id}/edit/`, data).then((r) => r.data);

// ── Categories ────────────────────────────────────
export const getCategories = () =>
  api.get("/categories/").then((r) => r.data);

export const createCategory = (data) =>
  api.post("/categories/", data).then((r) => r.data);

export const updateCategory = (id, data) =>
  api.put(`/categories/${id}/`, data).then((r) => r.data);

export const deleteCategory = (id) =>
  api.delete(`/categories/${id}/`);

// ── Departments ───────────────────────────────────
export const getDepartments = () =>
  api.get("/departments/").then((r) => r.data);

export const createDepartment = (data) =>
  api.post("/departments/", data).then((r) => r.data);

export const updateDepartment = (id, data) =>
  api.put(`/departments/${id}/`, data).then((r) => r.data);

export const deleteDepartment = (id) =>
  api.delete(`/departments/${id}/`);

// ── Books with filters ────────────────────────────
export const getBooksFiltered = (params = {}) => {
  const query = new URLSearchParams();
  if (params.category)   query.append("category",   params.category);
  if (params.department) query.append("department",  params.department);
  if (params.search)     query.append("search",      params.search);
  const qs = query.toString();
  return api.get(`/books/${qs ? "?" + qs : ""}`).then((r) => r.data);
};

export const borrowerGetBooksFiltered = (params = {}) => {
  const query = new URLSearchParams();
  if (params.category)   query.append("category",   params.category);
  if (params.department) query.append("department",  params.department);
  if (params.search)     query.append("search",      params.search);
  const qs = query.toString();
  return api.get(`/borrower/books/${qs ? "?" + qs : ""}`).then((r) => r.data);
};

// ── Admin loans by semester ───────────────────────
export const getLoansBySemester = (semesterId = "") =>
  api.get(`/admin/loans-by-semester/${semesterId ? "?semester=" + semesterId : ""}`).then((r) => r.data);

// ── Semesters ─────────────────────────────────────
export const getSemesters = () =>
  api.get("/semesters/").then((r) => r.data);

export const createSemester = (data) =>
  api.post("/semesters/", data).then((r) => r.data);

export const updateSemester = (id, data) =>
  api.put(`/semesters/${id}/`, data).then((r) => r.data);

export const deleteSemester = (id) =>
  api.delete(`/semesters/${id}/`);

export const setActiveSemester = (id) =>
  api.patch(`/semesters/${id}/set-active/`).then((r) => r.data);

export default api;