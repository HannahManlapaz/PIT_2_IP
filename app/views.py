# app/views.py
from .models import Author, Book, Department, Loan, Reservation, Category, Semester
from .serializers import (
    AuthorSerializer, BookSerializer,
    LoanSerializer, ReturnVerificationSerializer,
    ReservationSerializer, CategorySerializer, DepartmentSerializer, SemesterSerializer
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
        books      = Book.objects.all()
        category   = request.query_params.get('category')    # filter by category id
        department = request.query_params.get('department')  # filter by department id
        search     = request.query_params.get('search')
        if category:
            books = books.filter(category_id=category)
        if department:
            books = books.filter(department_id=department)
        if search:
            books = books.filter(title__icontains=search)
        return Response(BookSerializer(books, many=True, context={'request': request}).data)


class BookListCreateView(ListCreateAPIView):
    serializer_class = BookSerializer
    parser_classes   = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset   = Book.objects.all()
        category   = self.request.query_params.get('category')
        department = self.request.query_params.get('department')
        search     = self.request.query_params.get('search')
        if category:
            queryset = queryset.filter(category_id=category)
        if department:
            queryset = queryset.filter(department_id=department)
        if search:
            queryset = queryset.filter(title__icontains=search)
        return queryset

    def get_serializer_context(self):
        return {'request': self.request}

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

        # Mark book as unavailable
        book.available = False
        book.save()

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

        waiting_count = Reservation.objects.filter(book=book, status='waiting').count()
        reservation = Reservation.objects.create(
            member=request.user,
            book=book,
            queue_position=waiting_count + 1
        )

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
            reservation = Reservation.objects.get(
                pk=reservation_id, member=request.user
            )
        except Reservation.DoesNotExist:
            return Response(
                {'error': 'Reservation not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if reservation.status not in ['waiting', 'ready']:
            return Response(
                {'error': 'This reservation cannot be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        book = reservation.book
        reservation.status = 'cancelled'
        reservation.save()

        # Reorder queue positions for remaining waiting reservations
        remaining = Reservation.objects.filter(
            book=book, status='waiting'
        ).order_by('reserved_date')

        for i, r in enumerate(remaining, start=1):
            if r.queue_position != i:
                r.queue_position = i
                r.save()

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
        ).select_related('member', 'book').order_by('-return_requested_date')
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

        # Restore book availability
        loan.book.available = True
        loan.book.save()

        next_reservation = Reservation.objects.filter(
            book=loan.book, status='waiting'
        ).order_by('reserved_date').first()

        if next_reservation:
            next_reservation.status        = 'ready'
            next_reservation.notified_date = date.today()
            next_reservation.save()
            # Book stays unavailable — next person in queue gets it
            loan.book.available = False
            loan.book.save()

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

    def post(self, request):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = UserProfileSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MemberDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return User.objects.get(pk=pk, is_staff=False, is_superuser=False)
        except User.DoesNotExist:
            return None

    def put(self, request, pk):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object(pk)
        if not user:
            return Response({'error': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = UserProfileSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object(pk)
        if not user:
            return Response({'error': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)
        user.delete()
        return Response({'message': 'Member deleted.'}, status=status.HTTP_204_NO_CONTENT)


# ── Admin CRUD ──

class AuthorListCreateView(ListCreateAPIView):
    queryset         = Author.objects.all()
    serializer_class = AuthorSerializer


class AuthorRetrieveUpdateDestroyView(RetrieveUpdateDestroyAPIView):
    queryset         = Author.objects.all()
    serializer_class = AuthorSerializer

class BookRetrieveUpdateDestroyView(RetrieveUpdateDestroyAPIView):
    queryset         = Book.objects.all()
    serializer_class = BookSerializer
    parser_classes   = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_context(self):
        return {'request': self.request}

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        partial  = kwargs.pop('partial', False)
        instance = self.get_object()

        # Only strip cover_image if it's a string (URL), not a real uploaded file
        if request.content_type and 'application/json' in request.content_type:
            # JSON request — safe to use request.data directly, no cover_image expected
            data = request.data
        else:
            # FormData request — copy and check if cover_image is a real file
            data = request.data.copy()
            if 'cover_image' in data:
                # InMemoryUploadedFile and TemporaryUploadedFile both have .read()
                val = request.FILES.get('cover_image')
                if val is None:
                    del data['cover_image']
                # else keep it — it's a real uploaded file from request.FILES

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class LoanListCreateView(ListCreateAPIView):
    queryset = Loan.objects.all().order_by('-loan_date')
    serializer_class = LoanSerializer


class LoanRetrieveUpdateDestroyView(RetrieveUpdateDestroyAPIView):
    queryset         = Loan.objects.all()
    serializer_class = LoanSerializer

# ── Category CRUD (admin only) ──

class CategoryListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # both borrowers and staff can list categories for filtering
        categories = Category.objects.all()
        return Response(CategorySerializer(categories, many=True).data)

    def post(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = CategorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CategoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return Category.objects.get(pk=pk)
        except Category.DoesNotExist:
            return None

    def put(self, request, pk):
        if not request.user.is_staff:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        category = self.get_object(pk)
        if not category:
            return Response({'error': 'Category not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CategorySerializer(category, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not request.user.is_staff:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        category = self.get_object(pk)
        if not category:
            return Response({'error': 'Category not found.'}, status=status.HTTP_404_NOT_FOUND)
        category.delete()
        return Response({'message': 'Category deleted.'}, status=status.HTTP_204_NO_CONTENT)


# ── Department CRUD (admin only) ──

class DepartmentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        departments = Department.objects.all()
        return Response(DepartmentSerializer(departments, many=True).data)

    def post(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = DepartmentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DepartmentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return Department.objects.get(pk=pk)
        except Department.DoesNotExist:
            return None

    def put(self, request, pk):
        if not request.user.is_staff:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        dept = self.get_object(pk)
        if not dept:
            return Response({'error': 'Department not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = DepartmentSerializer(dept, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not request.user.is_staff:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        dept = self.get_object(pk)
        if not dept:
            return Response({'error': 'Department not found.'}, status=status.HTTP_404_NOT_FOUND)
        dept.delete()
        return Response({'message': 'Department deleted.'}, status=status.HTTP_204_NO_CONTENT)


# ── Admin loans by semester ──

class AdminLoansBySemesterView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        semester_id = request.query_params.get('semester')
        loans = Loan.objects.select_related('member', 'book', 'semester') \
            .all().order_by('-loan_date')
        if semester_id:
            loans = loans.filter(semester_id=semester_id)
        return Response(LoanSerializer(loans, many=True).data)
    
# ── Semester CRUD ──

class SemesterListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # everyone can list semesters
        semesters = Semester.objects.all()
        return Response(SemesterSerializer(semesters, many=True).data)

    def post(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = SemesterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SemesterDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return Semester.objects.get(pk=pk)
        except Semester.DoesNotExist:
            return None

    def get(self, request, pk):
        sem = self.get_object(pk)
        if not sem:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(SemesterSerializer(sem).data)

    def put(self, request, pk):
        if not request.user.is_staff:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        sem = self.get_object(pk)
        if not sem:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = SemesterSerializer(sem, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not request.user.is_staff:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        sem = self.get_object(pk)
        if not sem:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        sem.delete()
        return Response({'message': 'Semester deleted.'}, status=status.HTTP_204_NO_CONTENT)


class SemesterSetActiveView(APIView):
    """Marks one semester as active, deactivates all others."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not request.user.is_staff:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            sem = Semester.objects.get(pk=pk)
        except Semester.DoesNotExist:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        Semester.objects.all().update(is_active=False)
        sem.is_active = True
        sem.save()
        return Response(SemesterSerializer(sem).data)