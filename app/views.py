from django.shortcuts import render
from .models import Author, Book, Member, Loan
from .serializers import (
    AuthorSerializer, BookSerializer, MemberSerializer,
    LoanSerializer, RegisterSerializer, StaffSerializer, CreateStaffSerializer
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
        is_admin      = user.is_staff and not user.is_superuser
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
            'token':     token.key,
            'username':  user.username,
            'role':      role,
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
            'token':     token.key,
            'username':  member.user.username,
            'role':      'borrower',
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
        'total_books':   Book.objects.count(),
        'total_authors': Author.objects.count(),
        'total_members': Member.objects.count(),
        'total_loans':   Loan.objects.count(),
        'active_loans':  Loan.objects.filter(return_date__isnull=True).count(),
        'total_staff':   User.objects.filter(is_staff=True, is_superuser=False).count(),
    })


# ── Borrower views ──

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def borrower_books(request):
    books = Book.objects.all()
    serializer = BookSerializer(books, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def borrower_borrow(request):
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
def borrower_return(request, loan_id):
    try:
        member = request.user.member
    except:
        return Response({'error': 'No member profile found.'}, status=400)
    try:
        loan = Loan.objects.get(pk=loan_id, member=member)
    except Loan.DoesNotExist:
        return Response({'error': 'Loan not found.'}, status=404)
    if loan.return_date:
        return Response({'error': 'Book already returned.'}, status=400)
    loan.return_date = date.today()
    loan.save()
    return Response(LoanSerializer(loan).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def borrower_history(request):
    try:
        member = request.user.member
    except:
        return Response({'error': 'No member profile found.'}, status=400)
    loans = Loan.objects.filter(member=member).order_by('-loan_date')
    return Response(LoanSerializer(loans, many=True).data)


# ── Admin views ──

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