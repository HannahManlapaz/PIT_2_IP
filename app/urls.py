from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),

    path('authors/', views.AuthorListCreateView.as_view(), name='author-list'),
    path('authors/<int:pk>/', views.AuthorRetrieveUpdateDestroyView.as_view(), name='author-detail'),
    path('books/', views.BookListCreateView.as_view(), name='book-list'),
    path('books/<int:pk>/', views.BookRetrieveUpdateDestroyView.as_view(), name='book-detail'),
    path('members/', views.MemberListCreateView.as_view(), name='member-list'),
    path('members/<int:pk>/', views.MemberRetrieveUpdateDestroyView.as_view(), name='member-detail'),
    path('loans/', views.LoanListCreateView.as_view(), name='loan-list'),
    path('loans/<int:pk>/', views.LoanRetrieveUpdateDestroyView.as_view(), name='loan-detail'),
]