from django.shortcuts import render
from .models import Author, Book, Loan, Reservation
from .serializers import (
    AuthorSerializer, BookSerializer,
    LoanSerializer, ReturnRequestSerializer, ReturnVerificationSerializer,
    ReservationSerializer
)
from user.serializers import UserSerializer, UserCreateSerializer
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import get_user_model
from datetime import date

User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    from django.contrib.auth import authenticate
    from rest_framework_simplejwt.tokens import RefreshToken

    username = request.data.get('username')
    email    = request.data.get('email')
    password = request.data.get('password')

    # Try username first, then email
    user = None
    if username:
        user = authenticate(username=username, password=password)
    if not user and email:
        try:
            u = User.objects.get(email=email)
            user = authenticate(username=u.username, password=password)
        except User.DoesNotExist:
            pass

    if user:
        refresh = RefreshToken.for_user(user)
        if user.is_superuser:
            role = 'superadmin'
        elif user.is_staff:
            role = 'admin'
        else:
            role = 'borrower'
        return Response({
            'access':   str(refresh.access_token),
            'refresh':  str(refresh),
            'username': user.username,
            'email':    user.email,
            'role':     role,
            'user_id':  user.id,
        })
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    # JWT is stateless — just tell frontend to discard the token
    return Response({'message': 'Logged out successfully.'})


# ── Superadmin views ──

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def superadmin_get_staff(request):
    if not request.user.is_superuser:
        return Response({'error': 'Unauthorized.'}, status=403)
    staff = User.objects.filter(is_staff=True, is_superuser=False)
    serializer = UserSerializer(staff, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def superadmin_create_staff(request):
    if not request.user.is_superuser:
        return Response({'error': 'Unauthorized.'}, status=403)
    serializer = UserCreateSerializer(data=request.data)
    if serializer.is_valid():
        user = User.objects.create_user(
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password'],
            email=serializer.validated_data.get('email', ''),
            name=serializer.validated_data.get('name', ''),
            is_staff=True,
        )
        return Response(UserSerializer(user).data, status=201)
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
    return Response(UserSerializer(user).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def superadmin_edit_staff(request, user_id):
    if not request.user.is_superuser:
        return Response({'error': 'Unauthorized.'}, status=403)
    try:
        user = User.objects.get(pk=user_id, is_staff=True, is_superuser=False)
    except User.DoesNotExist:
        return Response({'error': 'Staff not found.'}, status=404)
    user.name  = request.data.get('name',  user.name)
    user.email = request.data.get('email', user.email)
    if request.data.get('password'):
        user.set_password(request.data['password'])
    user.save()
    return Response(UserSerializer(user).data)


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
        'total_books':      Book.objects.count(),
        'total_authors':    Author.objects.count(),
        'total_members':    User.objects.filter(is_staff=False, is_superuser=False).count(),
        'total_loans':      Loan.objects.count(),
        'active_loans':     Loan.objects.filter(return_verified_date__isnull=True, return_requested_date__isnull=True).count(),
        'pending_returns':  Loan.objects.filter(return_requested_date__isnull=False, return_verified_date__isnull=True).count(),
        'total_staff':      User.objects.filter(is_staff=True, is_superuser=False).count(),
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
    book_id = request.data.get('book_id')
    try:
        book = Book.objects.get(pk=book_id)
    except Book.DoesNotExist:
        return Response({'error': 'Book not found.'}, status=404)

    if not book.available:
        return Response({'error': 'This book is currently on loan.'}, status=400)

    loan = Loan.objects.create(member=request.user, book=book, loan_date=date.today())

    Reservation.objects.filter(
        member=request.user, book=book, status='ready'
    ).update(status='fulfilled')

    return Response(LoanSerializer(loan).data, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def borrower_return_request(request, loan_id):
    try:
        loan = Loan.objects.get(pk=loan_id, member=request.user)
    except Loan.DoesNotExist:
        return Response({'error': 'Loan not found.'}, status=404)

    if loan.return_verified_date:
        return Response({'error': 'Book already returned.'}, status=400)
    if loan.return_requested_date and loan.return_status == 'pending':
        return Response({'error': 'Return already requested.'}, status=400)

    loan.return_requested_date = date.today()
    loan.return_status         = 'pending'
    loan.notes                 = ''
    loan.save()

    return Response({
        'message': 'Return request submitted.',
        'loan': LoanSerializer(loan).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def borrower_history(request):
    loans = Loan.objects.filter(member=request.user).order_by('-loan_date')
    return Response(LoanSerializer(loans, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def borrower_pending_returns(request):
    loans = Loan.objects.filter(
        member=request.user,
        return_requested_date__isnull=False,
        return_verified_date__isnull=True
    ).order_by('-return_requested_date')
    return Response(LoanSerializer(loans, many=True).data)


# ── Reservation views ──

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def borrower_reserve(request):
    book_id = request.data.get('book_id')
    try:
        book = Book.objects.get(pk=book_id)
    except Book.DoesNotExist:
        return Response({'error': 'Book not found.'}, status=404)

    if book.available:
        return Response({'error': 'This book is available. You can borrow it directly.'}, status=400)

    already = Reservation.objects.filter(
        member=request.user, book=book, status__in=['waiting', 'ready']
    ).exists()
    if already:
        return Response({'error': 'You already have a reservation for this book.'}, status=400)

    reservation = Reservation.objects.create(member=request.user, book=book)
    reservation.queue_position = Reservation.objects.filter(book=book, status='waiting').count()
    reservation.save()

    return Response(ReservationSerializer(reservation, context={'request': request}).data, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def borrower_cancel_reservation(request, reservation_id):
    try:
        reservation = Reservation.objects.get(pk=reservation_id, member=request.user)
    except Reservation.DoesNotExist:
        return Response({'error': 'Reservation not found.'}, status=404)

    if reservation.status not in ['waiting', 'ready']:
        return Response({'error': 'This reservation cannot be cancelled.'}, status=400)

    reservation.status = 'cancelled'
    reservation.save()
    return Response({'message': 'Reservation cancelled successfully.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def borrower_my_reservations(request):
    reservations = Reservation.objects.filter(
        member=request.user
    ).exclude(status__in=['cancelled', 'fulfilled', 'expired']).order_by('-reserved_date')
    return Response(ReservationSerializer(reservations, many=True, context={'request': request}).data)


# ── Admin views ──

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_pending_returns(request):
    if not request.user.is_staff:
        return Response({'error': 'Unauthorized.'}, status=403)
    loans = Loan.objects.filter(
        return_requested_date__isnull=False,
        return_verified_date__isnull=True,
        return_status='pending'
    ).select_related('member', 'book').order_by('return_requested_date')
    return Response(LoanSerializer(loans, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_verify_return(request):
    if not request.user.is_staff:
        return Response({'error': 'Unauthorized.'}, status=403)

    serializer = ReturnVerificationSerializer(data=request.data)
    if serializer.is_valid():
        loan_id = serializer.validated_data['loan_id']
        notes   = serializer.validated_data.get('notes', '')
        try:
            loan = Loan.objects.get(pk=loan_id)
        except Loan.DoesNotExist:
            return Response({'error': 'Loan not found.'}, status=404)

        loan.return_verified_date = date.today()
        loan.return_date          = date.today()
        loan.return_status        = 'verified'
        loan.verified_by          = request.user
        loan.notes                = notes
        loan.save()

        next_reservation = Reservation.objects.filter(
            book=loan.book, status='waiting'
        ).order_by('reserved_date').first()

        if next_reservation:
            next_reservation.status        = 'ready'
            next_reservation.notified_date = date.today()
            next_reservation.save()

        return Response({
            'message': f'Return verified for "{loan.book.title}" by {loan.member.name}',
            'loan': LoanSerializer(loan).data
        }, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_reject_return(request):
    if not request.user.is_staff:
        return Response({'error': 'Unauthorized.'}, status=403)

    loan_id          = request.data.get('loan_id')
    rejection_reason = request.data.get('reason', 'Return not verified')

    try:
        loan = Loan.objects.get(pk=loan_id)
    except Loan.DoesNotExist:
        return Response({'error': 'Loan not found.'}, status=404)

    loan.return_status         = 'rejected'
    loan.notes                 = rejection_reason
    loan.return_requested_date = None
    loan.save()

    return Response({
        'message': f'Return request rejected for "{loan.book.title}"',
        'status': 'rejected'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    if not request.user.is_staff:
        return Response(status=403)
    return Response({
        'pending_returns': Loan.objects.filter(
            return_status='pending',
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
        'total_members': User.objects.filter(is_staff=False, is_superuser=False).count(),
        'total_books':   Book.objects.count(),
    })


# ── Admin CRUD views ──

class AuthorListCreateView(ListCreateAPIView):
    queryset         = Author.objects.all()
    serializer_class = AuthorSerializer


class AuthorRetrieveUpdateDestroyView(RetrieveUpdateDestroyAPIView):
    queryset         = Author.objects.all()
    serializer_class = AuthorSerializer


class BookListCreateView(ListCreateAPIView):
    queryset         = Book.objects.all()
    serializer_class = BookSerializer
    parser_classes   = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_context(self):
        return {'request': self.request}


class BookRetrieveUpdateDestroyView(RetrieveUpdateDestroyAPIView):
    queryset         = Book.objects.all()
    serializer_class = BookSerializer
    parser_classes   = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_context(self):
        return {'request': self.request}


class LoanListCreateView(ListCreateAPIView):
    queryset         = Loan.objects.all()
    serializer_class = LoanSerializer


class LoanRetrieveUpdateDestroyView(RetrieveUpdateDestroyAPIView):
    queryset         = Loan.objects.all()
    serializer_class = LoanSerializer



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')

    if not user.check_password(old_password):
        return Response({'error': 'Old password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

    if not new_password or len(new_password) < 8:
        return Response({'error': 'New password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    return Response({'message': 'Password changed successfully.'})