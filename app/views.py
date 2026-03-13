from django.shortcuts import render
from .models import Author, Book, Member, Loan
from .serializers import AuthorSerializer, BookSerializer, MemberSerializer, LoanSerializer
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework import status


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if user:
        token, created = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'username': user.username})
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    request.user.auth_token.delete()
    return Response({'message': 'Logged out'})


class AuthorListCreateView(ListCreateAPIView):
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer

class AuthorRetrieveUpdateDestroyView(RetrieveUpdateDestroyAPIView):
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer

class BookListCreateView(ListCreateAPIView):
    queryset = Book.objects.all()
    serializer_class = BookSerializer

class BookRetrieveUpdateDestroyView(RetrieveUpdateDestroyAPIView):
    queryset = Book.objects.all()
    serializer_class = BookSerializer

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