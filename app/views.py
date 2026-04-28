from .models import Author, Book, Loan, Reservation
from .serializers import (
    AuthorSerializer, BookSerializer,
    LoanSerializer, ReturnVerificationSerializer,
    ReservationSerializer
)
from user.serializers import UserSerializer, UserCreateSerializer, UserProfileSerializer
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import get_user_model
from datetime import date

User = get_user_model()


# ── Auth ──

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken

        email    = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')

        if not email or not password:
            return Response({'error': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.check_password(password):
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'error': 'Account is disabled.'}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        role = 'superadmin' if user.is_superuser else 'staff' if user.is_staff else 'borrower'

        member_id = None
        if role == 'borrower':
            try:
                member_id = user.member.id
            except Exception:
                pass

        return Response({
            'access':    str(refresh.access_token),
            'refresh':   str(refresh),
            'username':  user.username,
            'email':     user.email,
            'role':      role,
            'user_id':   user.id,
            'member_id': member_id,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({'message': 'Logged out successfully.'})


# ── Superadmin ──

class SuperadminStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        return Response({
            'total_books':     Book.objects.count(),
            'total_authors':   Author.objects.count(),
            'total_members':   User.objects.filter(is_staff=False, is_superuser=False).count(),
            'total_loans':     Loan.objects.count(),
            'active_loans':    Loan.objects.filter(return_verified_date__isnull=True, return_requested_date__isnull=True).count(),
            'pending_returns': Loan.objects.filter(return_requested_date__isnull=False, return_verified_date__isnull=True).count(),
            'total_staff':     User.objects.filter(is_staff=True, is_superuser=False).count(),
        })


class SuperadminStaffListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        staff = User.objects.filter(is_staff=True, is_superuser=False)
        return Response(UserSerializer(staff, many=True).data)

    def post(self, request):
        if not request.user.is_superuser:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = User.objects.create_user(
                username = serializer.validated_data['username'],
                password = serializer.validated_data['password'],
                email    = serializer.validated_data.get('email', ''),
                name     = serializer.validated_data.get('name', ''),
                is_staff = True,
            )
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SuperadminStaffDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_staff(self, user_id):
        try:
            return User.objects.get(pk=user_id, is_staff=True, is_superuser=False)
        except User.DoesNotExist:
            return None

    def patch(self, request, user_id):
        if not request.user.is_superuser:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_staff(user_id)
        if not user:
            return Response({'error': 'Staff not found.'}, status=status.HTTP_404_NOT_FOUND)
        user.name  = request.data.get('name',  user.name)
        user.email = request.data.get('email', user.email)
        if request.data.get('password'):
            user.set_password(request.data['password'])
        user.save()
        return Response(UserSerializer(user).data)

    def delete(self, request, user_id):
        if not request.user.is_superuser:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_staff(user_id)
        if not user:
            return Response({'error': 'Staff not found.'}, status=status.HTTP_404_NOT_FOUND)
        user.delete()
        return Response({'message': 'Staff deleted.'}, status=status.HTTP_204_NO_CONTENT)


class SuperadminStaffToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        if not request.user.is_superuser:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            user = User.objects.get(pk=user_id, is_staff=True, is_superuser=False)
        except User.DoesNotExist:
            return Response({'error': 'Staff not found.'}, status=status.HTTP_404_NOT_FOUND)
        user.is_active = not user.is_active
        user.save()
        return Response(UserSerializer(user).data)


# ── Borrower ──

class BorrowerProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        request.user.delete()
        return Response({'message': 'Account deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)

class BorrowerChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user         = request.user
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')

        if not user.check_password(old_password):
            return Response({'error': 'Old password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        if not new_password or len(new_password) < 8:
            return Response({'error': 'New password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password changed successfully.'})


class BorrowerBooksView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        books = Book.objects.all()
        serializer = BookSerializer(books, many=True, context={'request': request})
        return Response(serializer.data)


class BorrowerBorrowView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        book_id = request.data.get('book_id')
        try:
            book = Book.objects.get(pk=book_id)
        except Book.DoesNotExist:
            return Response({'error': 'Book not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not book.available:
            return Response({'error': 'This book is currently on loan.'}, status=status.HTTP_400_BAD_REQUEST)

        loan = Loan.objects.create(member=request.user, book=book, loan_date=date.today())
        Reservation.objects.filter(
            member=request.user, book=book, status='ready'
        ).update(status='fulfilled')

        return Response(LoanSerializer(loan).data, status=status.HTTP_201_CREATED)


class BorrowerReturnRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, loan_id):
        try:
            loan = Loan.objects.get(pk=loan_id, member=request.user)
        except Loan.DoesNotExist:
            return Response({'error': 'Loan not found.'}, status=status.HTTP_404_NOT_FOUND)

        if loan.return_verified_date:
            return Response({'error': 'Book already returned.'}, status=status.HTTP_400_BAD_REQUEST)
        if loan.return_requested_date and loan.return_status == 'pending':
            return Response({'error': 'Return already requested.'}, status=status.HTTP_400_BAD_REQUEST)

        loan.return_requested_date = date.today()
        loan.return_status         = 'pending'
        loan.notes                 = ''
        loan.save()

        return Response({
            'message': 'Return request submitted.',
            'loan': LoanSerializer(loan).data
        })


class BorrowerHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        loans = Loan.objects.filter(member=request.user).order_by('-loan_date')
        return Response(LoanSerializer(loans, many=True).data)


class BorrowerPendingReturnsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        loans = Loan.objects.filter(
            member=request.user,
            return_requested_date__isnull=False,
            return_verified_date__isnull=True
        ).order_by('-return_requested_date')
        return Response(LoanSerializer(loans, many=True).data)


# ── Reservations ──

class BorrowerReserveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        book_id = request.data.get('book_id')
        try:
            book = Book.objects.get(pk=book_id)
        except Book.DoesNotExist:
            return Response({'error': 'Book not found.'}, status=status.HTTP_404_NOT_FOUND)

        if book.available:
            return Response({'error': 'This book is available. You can borrow it directly.'}, status=status.HTTP_400_BAD_REQUEST)

        already = Reservation.objects.filter(
            member=request.user, book=book, status__in=['waiting', 'ready']
        ).exists()
        if already:
            return Response({'error': 'You already have a reservation for this book.'}, status=status.HTTP_400_BAD_REQUEST)

        reservation = Reservation.objects.create(member=request.user, book=book)
        reservation.queue_position = Reservation.objects.filter(book=book, status='waiting').count()
        reservation.save()

        return Response(ReservationSerializer(reservation, context={'request': request}).data, status=status.HTTP_201_CREATED)


class BorrowerMyReservationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reservations = Reservation.objects.filter(
            member=request.user
        ).exclude(status__in=['cancelled', 'fulfilled', 'expired']).order_by('-reserved_date')
        return Response(ReservationSerializer(reservations, many=True, context={'request': request}).data)


class BorrowerCancelReservationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, reservation_id):
        try:
            reservation = Reservation.objects.get(pk=reservation_id, member=request.user)
        except Reservation.DoesNotExist:
            return Response({'error': 'Reservation not found.'}, status=status.HTTP_404_NOT_FOUND)

        if reservation.status not in ['waiting', 'ready']:
            return Response({'error': 'This reservation cannot be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        reservation.status = 'cancelled'
        reservation.save()
        return Response({'message': 'Reservation cancelled successfully.'})


# ── Admin ──

class AdminPendingReturnsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        loans = Loan.objects.filter(
            return_requested_date__isnull=False,
            return_verified_date__isnull=True,
            return_status='pending'
        ).select_related('member', 'book').order_by('return_requested_date')
        return Response(LoanSerializer(loans, many=True).data)


class AdminVerifyReturnView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)

        loan_id = request.data.get('loan_id')
        notes   = request.data.get('notes', '')

        try:
            loan = Loan.objects.get(pk=loan_id)
        except Loan.DoesNotExist:
            return Response({'error': 'Loan not found.'}, status=status.HTTP_404_NOT_FOUND)

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
        })


class AdminRejectReturnView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)

        loan_id          = request.data.get('loan_id')
        rejection_reason = request.data.get('reason', 'Return not verified')

        try:
            loan = Loan.objects.get(pk=loan_id)
        except Loan.DoesNotExist:
            return Response({'error': 'Loan not found.'}, status=status.HTTP_404_NOT_FOUND)

        loan.return_status         = 'rejected'
        loan.notes                 = rejection_reason
        loan.return_requested_date = None
        loan.save()

        return Response({
            'message': f'Return request rejected for "{loan.book.title}"',
            'status': 'rejected'
        })


class AdminStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)
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


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user         = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not user.check_password(old_password):
            return Response({'error': 'Old password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        if not new_password or len(new_password) < 8:
            return Response({'error': 'New password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password changed successfully.'})


# ── Members ──

class MemberListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        members = User.objects.filter(is_staff=False, is_superuser=False)
        return Response(UserProfileSerializer(members, many=True).data)


# ── Admin CRUD ──

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