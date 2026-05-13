# app/urls.py
from django.urls import path
from . import views
from user.views import RegisterView

urlpatterns = [
    # Authentication
    path('register/', RegisterView.as_view(), name='register'),
    path('login/',  views.LoginView.as_view(),  name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),

    # Superadmin
    path('superadmin/stats/',                      views.SuperadminStatsView.as_view(),           name='superadmin-stats'),
    path('superadmin/staff/',                      views.SuperadminStaffListCreateView.as_view(), name='superadmin-staff-list'),
    path('superadmin/staff/create/',               views.SuperadminStaffListCreateView.as_view(), name='superadmin-staff-create'),
    path('superadmin/staff/<int:user_id>/toggle/', views.SuperadminStaffToggleView.as_view(),     name='superadmin-staff-toggle'),
    path('superadmin/staff/<int:user_id>/delete/', views.SuperadminStaffDetailView.as_view(),     name='superadmin-staff-delete'),
    path('superadmin/staff/<int:user_id>/edit/',   views.SuperadminStaffDetailView.as_view(),     name='superadmin-staff-edit'),

    # Borrower
    path('borrower/profile/',                                 views.BorrowerProfileView.as_view(),           name='borrower-profile'),
    path('borrower/profile/change-password/',                 views.BorrowerChangePasswordView.as_view(),    name='borrower-change-password'),
    path('borrower/books/',                                   views.BorrowerBooksView.as_view(),             name='borrower-books'),
    path('borrower/borrow/',                                  views.BorrowerBorrowView.as_view(),            name='borrower-borrow'),
    path('borrower/return-request/<int:loan_id>/',            views.BorrowerReturnRequestView.as_view(),     name='borrower-return-request'),
    path('borrower/history/',                                 views.BorrowerHistoryView.as_view(),           name='borrower-history'),
    path('borrower/pending-returns/',                         views.BorrowerPendingReturnsView.as_view(),    name='borrower-pending-returns'),
    path('borrower/reserve/',                                 views.BorrowerReserveView.as_view(),           name='borrower-reserve'),
    path('borrower/my-reservations/',                         views.BorrowerMyReservationsView.as_view(),    name='borrower-my-reservations'),
    path('borrower/cancel-reservation/<int:reservation_id>/', views.BorrowerCancelReservationView.as_view(), name='borrower-cancel-reservation'),

    # Admin
    path('admin/pending-returns/', views.AdminPendingReturnsView.as_view(), name='admin-pending-returns'),
    path('admin/verify-return/',   views.AdminVerifyReturnView.as_view(),   name='admin-verify-return'),
    path('admin/reject-return/',   views.AdminRejectReturnView.as_view(),   name='admin-reject-return'),
    path('admin/stats/',           views.AdminStatsView.as_view(),          name='admin-stats'),

    # Admin CRUD
    path('authors/',          views.AuthorListCreateView.as_view(),            name='author-list'),
    path('authors/<int:pk>/', views.AuthorRetrieveUpdateDestroyView.as_view(), name='author-detail'),
    path('books/',            views.BookListCreateView.as_view(),              name='book-list'),
    path('books/<int:pk>/',   views.BookRetrieveUpdateDestroyView.as_view(),   name='book-detail'),
    path('loans/',            views.LoanListCreateView.as_view(),              name='loan-list'),
    path('loans/<int:pk>/',   views.LoanRetrieveUpdateDestroyView.as_view(),   name='loan-detail'),
    path('members/',          views.MemberListView.as_view(),                  name='member-list'),
    path('members/<int:pk>/', views.MemberDetailView.as_view(), name='member-detail'), 
    path('change-password/',  views.ChangePasswordView.as_view(),              name='change-password'),
    
    # Categories
    path('categories/',          views.CategoryListCreateView.as_view(), name='category-list'),
    path('categories/<int:pk>/', views.CategoryDetailView.as_view(),     name='category-detail'),

    # Departments
    path('departments/',          views.DepartmentListCreateView.as_view(), name='department-list'),
    path('departments/<int:pk>/', views.DepartmentDetailView.as_view(),     name='department-detail'),

    # Loans by semester
    path('admin/loans-by-semester/', views.AdminLoansBySemesterView.as_view(), name='admin-loans-by-semester'),
    
    # Semesters
    path('semesters/',                   views.SemesterListCreateView.as_view(), name='semester-list'),
    path('semesters/<int:pk>/',          views.SemesterDetailView.as_view(),     name='semester-detail'),
    path('semesters/<int:pk>/set-active/', views.SemesterSetActiveView.as_view(), name='semester-set-active'),

]