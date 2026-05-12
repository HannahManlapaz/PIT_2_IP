import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
      // router.replace("/(auth)/login"); // uncomment after router setup
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────
export const loginApi = (email, password) =>
  axios.post(`${BASE_URL}/login/`, { email, password }).then((r) => r.data);

export const registerApi = (data) =>
  axios.post(`${BASE_URL}/register/`, data).then((r) => r.data);

export const logoutApi = () =>
  api.post("/logout/");

// ── Books ─────────────────────────────────────────
export const getBooks = () =>
  api.get("/books/").then((r) => r.data);

export const borrowerGetBooks = () =>
  api.get("/borrower/books/").then((r) => r.data);

// ── Borrower ──────────────────────────────────────
export const getProfile = () =>
  api.get("/borrower/profile/").then((r) => r.data);

export const updateProfile = (data) =>
  api.patch("/borrower/profile/", data).then((r) => r.data);

export const changePassword = (data) =>
  api.post("/borrower/profile/change-password/", data).then((r) => r.data);

export const deleteAccount = () =>
  api.delete("/borrower/profile/");

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

// ── Authors ───────────────────────────────────────
export const getAuthors = () =>
  api.get("/authors/").then((r) => r.data);

// ── Members ───────────────────────────────────────
export const getMembers = () =>
  api.get("/members/").then((r) => r.data);

// ── Loans ─────────────────────────────────────────
export const getLoans = () =>
  api.get("/loans/").then((r) => r.data);

export default api;