from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.contrib.auth import get_user_model, authenticate
from .serializers import UserCreateSerializer, UserSerializer
from datetime import date
from djoser.utils import encode_uid
from django.contrib.auth.tokens import default_token_generator
from user.email import CustomActivationEmail
from djoser.utils import decode_uid

User = get_user_model()


from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

class RegisterView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.save()
            user.is_active = False  # inactive until email confirmed
            user.save()

            try:
                from djoser.utils import encode_uid
                from django.contrib.auth.tokens import default_token_generator
                from user.email import CustomActivationEmail

                uid   = encode_uid(user.pk)
                token = default_token_generator.make_token(user)
                CustomActivationEmail(
                    request=request,
                    context={'user': user, 'uid': uid, 'token': token}
                ).send(to=[user.email])
            except Exception as e:
                print(f"Email failed: {e}")
                # Don't crash — registration still succeeds

            return Response(
                {'message': 'Account created! Please check your email to activate your account.'},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email    = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')

        if not email or not password:
            return Response(
                {'error': 'Email and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Look up user by email first
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Authenticate using email as USERNAME_FIELD
        user = authenticate(request, email=email, password=password)
        if not user:
            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'Account is disabled.'},
                status=status.HTTP_403_FORBIDDEN
            )

        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)

        # Determine role
        if user.is_superuser:
            role = 'superadmin'
        elif user.is_staff:
            role = 'staff'
        else:
            role = 'borrower'

        # Get member_id if borrower
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
            'role':      role,
            'user_id':   user.id,
            'member_id': member_id,
        }, status=status.HTTP_200_OK)


class StaffListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        staff = User.objects.filter(is_staff=True)
        return Response(UserSerializer(staff, many=True).data)

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = User.objects.create_user(
                email    = serializer.validated_data['email'],
                password = serializer.validated_data['password'],
                username = serializer.validated_data['username'],
                name     = serializer.validated_data.get('name', ''),
                is_staff = True,
            )
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StaffDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get_object(self, pk):
        try:
            return User.objects.get(pk=pk, is_staff=True)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response({'error': 'Staff not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserSerializer(user).data)

    def patch(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response({'error': 'Staff not found.'}, status=status.HTTP_404_NOT_FOUND)
        user.name  = request.data.get('name',  user.name)
        user.email = request.data.get('email', user.email)
        if request.data.get('password'):
            user.set_password(request.data['password'])
        user.save()
        return Response(UserSerializer(user).data)