from rest_framework import serializers
from .models import Author, Book, Member, Loan, Reservation
from datetime import date
from django.contrib.auth.models import User

class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = '__all__'

class BookSerializer(serializers.ModelSerializer):
    author_name     = serializers.SerializerMethodField()
    cover_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = ['id', 'title', 'isbn', 'publication_year', 'author', 'author_name', 'available', 'cover_image', 'cover_image_url', 'description']

    def get_author_name(self, obj):
        return obj.author.name if obj.author else None

    def get_cover_image_url(self, obj):
        if obj.cover_image:
            url = obj.cover_image.url
            # Add f_auto for correct format detection
            url = url.replace('/upload/', '/upload/f_auto/')
            return url
        return None

class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = '__all__'

class LoanSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField()
    book_title = serializers.SerializerMethodField()
    overdue_days = serializers.SerializerMethodField()
    verified_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Loan
        fields = [
            'id', 'member', 'book', 'member_name', 'book_title', 
            'loan_date', 'due_date', 'return_date', 'return_requested_date',
            'return_verified_date', 'return_status', 'verified_by', 
            'verified_by_name', 'overdue_days', 'notes'
        ]
        read_only_fields = ['return_verified_date', 'verified_by']

    def get_member_name(self, obj):
        return obj.member.name if obj.member else None

    def get_book_title(self, obj):
        return obj.book.title if obj.book else None

    def get_overdue_days(self, obj):
        if obj.return_verified_date or not obj.due_date:
            return 0
        today = date.today()
        delta = (today - obj.due_date).days
        return max(0, delta)

    def get_verified_by_name(self, obj):
        if obj.verified_by:
            return obj.verified_by.username
        return None

    def validate_book(self, value):
        instance = self.instance
        if not value.available and (instance is None or instance.book != value):
            raise serializers.ValidationError("This book is currently on loan and cannot be borrowed.")
        return value


class ReturnRequestSerializer(serializers.Serializer):
    loan_id = serializers.IntegerField()

    def validate_loan_id(self, value):
        try:
            loan = Loan.objects.get(pk=value)
            if loan.return_verified_date:
                raise serializers.ValidationError("This book has already been returned.")
            if loan.return_status == 'pending' and loan.return_requested_date:
                raise serializers.ValidationError("Return already requested.")
        except Loan.DoesNotExist:
            raise serializers.ValidationError("Loan not found.")
        return value


class ReturnVerificationSerializer(serializers.Serializer):
    loan_id = serializers.IntegerField()
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_loan_id(self, value):
        try:
            loan = Loan.objects.get(pk=value)
            if loan.return_verified_date:
                raise serializers.ValidationError("This return has already been verified.")
        except Loan.DoesNotExist:
            raise serializers.ValidationError("Loan not found.")
        return value


class RegisterSerializer(serializers.Serializer):
    username       = serializers.CharField()
    password       = serializers.CharField(write_only=True)
    name           = serializers.CharField()
    email          = serializers.EmailField()
    contact_number = serializers.CharField()
    address        = serializers.CharField()

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already taken.")
        return value

    def validate_email(self, value):
        if Member.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value

    def create(self, validated_data):
        from datetime import date
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data['email'],
        )
        member = Member.objects.create(
            user=user,
            name=validated_data['name'],
            email=validated_data['email'],
            contact_number=validated_data['contact_number'],
            address=validated_data['address'],
            join_date=date.today(),
        )
        return member


class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'date_joined']


class CreateStaffSerializer(serializers.Serializer):
    username   = serializers.CharField()
    password   = serializers.CharField(write_only=True)
    email      = serializers.EmailField(required=False, allow_blank=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name  = serializers.CharField(required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already taken.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            is_staff=True,
        )
        return user


class ReservationSerializer(serializers.ModelSerializer):
    book_title     = serializers.SerializerMethodField()
    book_cover_url = serializers.SerializerMethodField()
    member_name    = serializers.SerializerMethodField()
    queue_position = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = [
            'id', 'member', 'book', 'book_title', 'book_cover_url',
            'member_name', 'reserved_date', 'status', 'notified_date', 'queue_position'
        ]
        read_only_fields = ['reserved_date', 'status', 'notified_date']

    def get_book_title(self, obj):
        return obj.book.title if obj.book else None

    def get_book_cover_url(self, obj):
        if obj.book and obj.book.cover_image:
            url = obj.book.cover_image.url
            url = url.replace('/upload/', '/upload/f_auto/')
            return url
        return None

    def get_member_name(self, obj):
        return obj.member.name if obj.member else None

    def get_queue_position(self, obj):
        return None