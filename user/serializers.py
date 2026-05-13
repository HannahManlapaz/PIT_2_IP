from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer
from djoser.serializers import UserSerializer as BaseUserSerializer
from rest_framework import serializers
from .models import User


class UserCreateSerializer(BaseUserCreateSerializer):
    name            = serializers.CharField(required=True)
    contact_number  = serializers.CharField(required=True)
    address         = serializers.CharField(required=True)
    re_password     = serializers.CharField(write_only=True, required=True)
    profile_picture = serializers.ImageField(required=False, allow_null=True)

    class Meta(BaseUserCreateSerializer.Meta):
        model  = User
        fields = ['id', 'username', 'email', 'password', 're_password',
                  'name', 'contact_number', 'address', 'profile_picture']

    def validate(self, attrs):
        if attrs['password'] != attrs['re_password']:
            raise serializers.ValidationError({'re_password': "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('re_password', None)
        profile_picture = validated_data.pop('profile_picture', None)
        user = User.objects.create_user(
            username       = validated_data['username'],
            email          = validated_data['email'],
            password       = validated_data['password'],
            name           = validated_data.get('name', ''),
            contact_number = validated_data.get('contact_number', ''),
            address        = validated_data.get('address', ''),
        )
        if profile_picture:
            user.profile_picture = profile_picture
        user.is_active = True
        user.save()

        # Send activation email in background thread so it doesn't block the request
        # import threading
        # request = self.context.get('request')
        # from user.email import CustomActivationEmail
        # def send_email():
           # try:
                # CustomActivationEmail(request, {'user': user}).send([user.email])
            # except Exception as e:
                # print(f"Email send failed: {e}")
        # threading.Thread(target=send_email, daemon=True).start()

        return user


class UserSerializer(BaseUserSerializer):
    class Meta(BaseUserSerializer.Meta):
        model  = User
        fields = ['id', 'username', 'email', 'name', 'contact_number',
                  'address', 'is_staff', 'date_joined', 'profile_picture']


class UserProfileSerializer(serializers.ModelSerializer):
    age             = serializers.SerializerMethodField()
    profile_picture = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model  = User
        fields = ['id', 'name', 'email', 'contact_number', 'address',  # ✅ add 'id' here
                  'birthday', 'age', 'profile_picture']
        read_only_fields = ['email']
        
    def get_age(self, obj):
        if not obj.birthday:
            return None
        from datetime import date
        today = date.today()
        return today.year - obj.birthday.year - (
            (today.month, today.day) < (obj.birthday.month, obj.birthday.day)
        )