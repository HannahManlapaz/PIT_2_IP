# app/views.py
from django.shortcuts import render
from .models import Author, Book, Member, Loan
from .serializers import (
    AuthorSerializer, BookSerializer, MemberSerializer,
    LoanSerializer, RegisterSerializer, StaffSerializer, CreateStaffSerializer,
    ReturnRequestSerializer, ReturnVerificationSerializer
)
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from datetime import date


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if user:
        token, created = Token.objects.get_or_create(user=user)
        is_superadmin = user.is_superuser
        is_admin = user.is_staff and not user.is_superuser
        if is_superadmin:
            role = 'superadmin'
        elif is_admin:
            role = 'admin'
        else:
            role = 'borrower'
        member_id = None
        if role == 'borrower':
            try:
                member_id = user.member.id
            except:
                pass
        return Response({
            'token': token.key,
            'username': user.username,
            'role': role,
            'member_id': member_id,
        })
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        member = serializer.save()
        token, _ = Token.objects.get_or_create(user=member.user)
        return Response({
            'token': token.key,
            'username': member.user.username,
            'role': 'borrower',
            'member_id': member.id,
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    request.user.auth_token.delete()
    return Response({'message': 'Logged out'})


# ── Superadmin views ──

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def superadmin_get_staff(request):
    if not request.user.is_superuser:
        return Response({'error': 'Unauthorized.'}, status=403)
    staff = User.objects.filter(is_staff=True, is_superuser=False)
    serializer = StaffSerializer(staff, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def superadmin_create_staff(request):
    if not request.user.is_superuser:
        return Response({'error': 'Unauthorized.'}, status=403)
    serializer = CreateStaffSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(StaffSerializer(user).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def superadmin_toggle_staff(request, user_id):
    if not request.user.is_superuser:
        return Response({'error': 'Unauthorized.'}, status=403)
    try:
        user = User.objects.get(pk=user_id, is_staff=True, is_superuser=False)
    except User.DoesNotExist:
        return Response({'error': 'Staff not found.'}, status=404)
    user.is_active = not user.is_active
    user.save()
    return Response(StaffSerializer(user).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def superadmin_delete_staff(request, user_id):
    if not request.user.is_superuser:
        return Response({'error': 'Unauthorized.'}, status=403)
    try:
        user = User.objects.get(pk=user_id, is_staff=True, is_superuser=False)
    except User.DoesNotExist:
        return Response({'error': 'Staff not found.'}, status=404)
    user.delete()
    return Response({'message': 'Staff deleted.'}, status=204)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def superadmin_stats(request):
    if not request.user.is_superuser:
        return Response({'error': 'Unauthorized.'}, status=403)
    
    return Response({
        'total_books': Book.objects.count(),
        'total_authors': Author.objects.count(),
        'total_members': Member.objects.count(),
        'total_loans': Loan.objects.count(),
        'active_loans': Loan.objects.filter(return_verified_date__isnull=True, return_requested_date__isnull=True).count(),
        'pending_returns': Loan.objects.filter(
            return_requested_date__isnull=False, 
            return_verified_date__isnull=True
        ).count(),
        'total_staff': User.objects.filter(is_staff=True, is_superuser=False).count(),
    })


# ── Borrower views ──

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def borrower_books(request):
    """Get all books for borrowers"""
    books = Book.objects.all()
    serializer = BookSerializer(books, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def borrower_borrow(request):
    """Borrow a book"""
    try:
        member = request.user.member
    except:
        return Response({'error': 'No member profile found.'}, status=400)
    
    book_id = request.data.get('book_id')
    try:
        book = Book.objects.get(pk=book_id)
    except Book.DoesNotExist:
        return Response({'error': 'Book not found.'}, status=404)
    
    if not book.available:
        return Response({'error': 'This book is currently on loan.'}, status=400)
    
    loan = Loan.objects.create(member=member, book=book, loan_date=date.today())
    return Response(LoanSerializer(loan).data, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def borrower_return_request(request, loan_id):
    """Borrower requests to return a book (admin must verify later)"""
    try:
        member = request.user.member
    except:
        return Response({'error': 'No member profile found.'}, status=400)
    
    try:
        loan = Loan.objects.get(pk=loan_id, member=member)
    except Loan.DoesNotExist:
        return Response({'error': 'Loan not found.'}, status=404)
    
    if loan.return_verified_date:
        return Response({'error': 'Book already returned.'}, status=400)
    
    if loan.return_requested_date:
        return Response({'error': 'Return already requested. Please wait for admin verification.'}, status=400)
    
    # Request return
    loan.return_requested_date = date.today()
    loan.return_status = 'pending'
    loan.save()
    
    return Response({
        'message': 'Return request submitted. Please bring the book to the library for verification.',
        'loan': LoanSerializer(loan).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def borrower_history(request):
    """Get borrower's loan history with return status"""
    try:
        member = request.user.member
    except:
        return Response({'error': 'No member profile found.'}, status=400)
    
    loans = Loan.objects.filter(member=member).order_by('-loan_date')
    serializer = LoanSerializer(loans, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def borrower_pending_returns(request):
    """Get borrower's pending return requests"""
    try:
        member = request.user.member
    except:
        return Response({'error': 'No member profile found.'}, status=400)
    
    pending_loans = Loan.objects.filter(
        member=member, 
        return_requested_date__isnull=False,
        return_verified_date__isnull=True
    ).order_by('-return_requested_date')
    
    serializer = LoanSerializer(pending_loans, many=True)
    return Response(serializer.data)


# ── Admin views for return verification ──

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_pending_returns(request):
    """Get all pending return requests for admin verification"""
    if not request.user.is_staff:
        return Response({'error': 'Unauthorized.'}, status=403)
    
    pending_loans = Loan.objects.filter(
        return_requested_date__isnull=False,
        return_verified_date__isnull=True
    ).select_related('member', 'book').order_by('return_requested_date')
    
    serializer = LoanSerializer(pending_loans, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_verify_return(request):
    """Admin verifies that a book has been physically returned"""
    if not request.user.is_staff:
        return Response({'error': 'Unauthorized.'}, status=403)
    
    serializer = ReturnVerificationSerializer(data=request.data)
    if serializer.is_valid():
        loan_id = serializer.validated_data['loan_id']
        notes = serializer.validated_data.get('notes', '')
        
        try:
            loan = Loan.objects.get(pk=loan_id)
        except Loan.DoesNotExist:
            return Response({'error': 'Loan not found.'}, status=404)
        
        # Verify the return
        loan.return_verified_date = date.today()
        loan.return_date = date.today()  # Keep for backward compatibility
        loan.return_status = 'verified'
        loan.verified_by = request.user
        loan.notes = notes
        loan.save()
        
        return Response({
            'message': f'Return verified for "{loan.book.title}" by {loan.member.name}',
            'loan': LoanSerializer(loan).data
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_reject_return(request):
    """Admin rejects a return request (book not actually returned)"""
    if not request.user.is_staff:
        return Response({'error': 'Unauthorized.'}, status=403)
    
    loan_id = request.data.get('loan_id')
    rejection_reason = request.data.get('reason', 'Return not verified')
    
    try:
        loan = Loan.objects.get(pk=loan_id)
    except Loan.DoesNotExist:
        return Response({'error': 'Loan not found.'}, status=404)
    
    if not loan.return_requested_date:
        return Response({'error': 'No return request found for this loan.'}, status=400)
    
    if loan.return_verified_date:
        return Response({'error': 'Return already verified.'}, status=400)
    
    # Reject the return request
    loan.return_requested_date = None
    loan.return_status = 'pending'
    loan.notes = f"Return request rejected: {rejection_reason}"
    loan.save()
    
    return Response({
        'message': f'Return request rejected for "{loan.book.title}"',
        'reason': rejection_reason
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    """Admin dashboard statistics"""
    if not request.user.is_staff:
        return Response({'error': 'Unauthorized.'}, status=403)
    
    return Response({
        'pending_returns': Loan.objects.filter(
            return_requested_date__isnull=False,
            return_verified_date__isnull=True
        ).count(),
        'active_loans': Loan.objects.filter(
            return_verified_date__isnull=True,
            return_requested_date__isnull=True
        ).count(),
        'overdue_loans': Loan.objects.filter(
            due_date__lt=date.today(),
            return_verified_date__isnull=True
        ).count(),
        'total_members': Member.objects.count(),
        'total_books': Book.objects.count(),
    })


# ── Admin CRUD views ──

class AuthorListCreateView(ListCreateAPIView):
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer


class AuthorRetrieveUpdateDestroyView(RetrieveUpdateDestroyAPIView):
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer


class BookListCreateView(ListCreateAPIView):
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_context(self):
        return {'request': self.request}


class BookRetrieveUpdateDestroyView(RetrieveUpdateDestroyAPIView):
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_context(self):
        return {'request': self.request}


class MemberListCreateView(ListCreateAPIView):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer


class MemberRetrieveUpdateDestroyView(RetrieveUpdateDestroyAPIView):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer


class LoanListCreateView(ListCreateAPIView):
    queryset = Loan.objects.all()
    serializer_class = LoanSerializer


class LoanRetrieveUpdateDestroyView(RetrieveUpdateDestroyAPIView):
    queryset = Loan.objects.all()
    serializer_class = LoanSerializer