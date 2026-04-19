from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer
from djoser.serializers import UserSerializer as BaseUserSerializer
from .models import User


class UserCreateSerializer(BaseUserCreateSerializer):
    class Meta(BaseUserCreateSerializer.Meta):
        model  = User
        fields = [
            'id', 'username', 'email', 'password',
            'name', 'contact_number', 'address'
        ]


class UserSerializer(BaseUserSerializer):
    class Meta(BaseUserSerializer.Meta):
        model  = User
        fields = [
            'id', 'username', 'email', 'name',
            'contact_number', 'address', 'is_staff', 'date_joined'
        ]