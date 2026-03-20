from django.urls import path
from . import views

urlpatterns = [
    path('login/',    views.login_view,    name='login'),
    path('logout/',   views.logout_view,   name='logout'),
    path('register/', views.register_view, name='register'),

    # Superadmin routes
    path('superadmin/stats/',                    views.superadmin_stats,         name='superadmin-stats'),
    path('superadmin/staff/',                    views.superadmin_get_staff,     name='superadmin-staff-list'),
    path('superadmin/staff/create/',             views.superadmin_create_staff,  name='superadmin-staff-create'),
    path('superadmin/staff/<int:user_id>/toggle/', views.superadmin_toggle_staff, name='superadmin-staff-toggle'),
    path('superadmin/staff/<int:user_id>/delete/', views.superadmin_delete_staff, name='superadmin-staff-delete'),

    # Borrower routes
    path('borrower/books/',                views.borrower_books,   name='borrower-books'),
    path('borrower/borrow/',               views.borrower_borrow,  name='borrower-borrow'),
    path('borrower/return/<int:loan_id>/', views.borrower_return,  name='borrower-return'),
    path('borrower/history/',              views.borrower_history, name='borrower-history'),

    # Admin routes
    path('authors/',          views.AuthorListCreateView.as_view(),           name='author-list'),
    path('authors/<int:pk>/', views.AuthorRetrieveUpdateDestroyView.as_view(), name='author-detail'),
    path('books/',            views.BookListCreateView.as_view(),              name='book-list'),
    path('books/<int:pk>/',   views.BookRetrieveUpdateDestroyView.as_view(),   name='book-detail'),
    path('members/',          views.MemberListCreateView.as_view(),            name='member-list'),
    path('members/<int:pk>/', views.MemberRetrieveUpdateDestroyView.as_view(), name='member-detail'),
    path('loans/',            views.LoanListCreateView.as_view(),              name='loan-list'),
    path('loans/<int:pk>/',   views.LoanRetrieveUpdateDestroyView.as_view(),   name='loan-detail'),
]