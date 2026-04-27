from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer
from djoser.serializers import UserSerializer as BaseUserSerializer
from rest_framework import serializers
from .models import User


class UserCreateSerializer(BaseUserCreateSerializer):
    name           = serializers.CharField(required=True)
    contact_number = serializers.CharField(required=True)
    address        = serializers.CharField(required=True)
    re_password    = serializers.CharField(write_only=True, required=True)

    class Meta(BaseUserCreateSerializer.Meta):
        model  = User
        fields = ['id', 'username', 'email', 'password', 're_password', 'name', 'contact_number', 'address']

    def validate(self, attrs):
        if attrs['password'] != attrs['re_password']:  
            raise serializers.ValidationError({'re_password': "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('re_password', None)
        return User.objects.create_user(
            username       = validated_data['username'],
            email          = validated_data['email'],
            password       = validated_data['password'],
            name           = validated_data.get('name', ''),
            contact_number = validated_data.get('contact_number', ''),
            address        = validated_data.get('address', ''),
        )


class UserSerializer(BaseUserSerializer):
    class Meta(BaseUserSerializer.Meta):
        model  = User
        fields = ['id', 'username', 'email', 'name', 'contact_number', 'address', 'is_staff', 'date_joined']


class UserProfileSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['name', 'email', 'contact_number', 'address', 'birthday', 'age']
        read_only_fields = ['email']

    def get_age(self, obj):
        if not obj.birthday:
            return None
        from datetime import date
        today = date.today()
        return today.year - obj.birthday.year - (
            (today.month, today.day) < (obj.birthday.month, obj.birthday.day)
        )