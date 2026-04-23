from rest_framework import serializers
from .models import Author, Book, Loan, Reservation
from datetime import date
from django.contrib.auth import get_user_model

User = get_user_model()


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Author
        fields = '__all__'


class BookSerializer(serializers.ModelSerializer):
    author_name     = serializers.SerializerMethodField()
    cover_image_url = serializers.SerializerMethodField()

    class Meta:
<<<<<<< Updated upstream
        model  = Book
        fields = ['id', 'title', 'isbn', 'publication_year', 'author',
                  'author_name', 'available', 'cover_image', 'cover_image_url', 'description']

    def get_author_name(self, obj):
        return obj.author.name if obj.author else None

    def get_cover_image_url(self, obj):
        if obj.cover_image:
            url = obj.cover_image.url
            url = url.replace('/upload/', '/upload/f_auto/')
            return url
        return None


class LoanSerializer(serializers.ModelSerializer):
    member_name      = serializers.SerializerMethodField()
    book_title       = serializers.SerializerMethodField()
    overdue_days     = serializers.SerializerMethodField()
    verified_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = Loan
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
        return max(0, (date.today() - obj.due_date).days)

    def get_verified_by_name(self, obj):
        return obj.verified_by.username if obj.verified_by else None

    def validate_book(self, value):
        instance = self.instance
        if not value.available and (instance is None or instance.book != value):
            raise serializers.ValidationError("This book is currently on loan and cannot be borrowed.")
        return value


class ReservationSerializer(serializers.ModelSerializer):
    book_title  = serializers.SerializerMethodField()
    member_name = serializers.SerializerMethodField()

    class Meta:
        model  = Reservation
        fields = [
            'id', 'member', 'book', 'book_title', 'member_name',
            'reserved_date', 'status', 'notified_date', 'queue_position'
        ]

    def get_book_title(self, obj):
        return obj.book.title if obj.book else None

    def get_member_name(self, obj):
        return obj.member.name if obj.member else None


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
    notes   = serializers.CharField(required=False, allow_blank=True)

    def validate_loan_id(self, value):
        try:
            loan = Loan.objects.get(pk=value)
            if loan.return_verified_date:
                raise serializers.ValidationError("This return has already been verified.")
        except Loan.DoesNotExist:
            raise serializers.ValidationError("Loan not found.")
        return value
=======
        model = Member
        fields = '__all__'
        
class LoanSerializer(serializers.ModelSerializer):
    # This pulls the 'name' from the related Member model
    member_name = serializers.ReadOnlyField(source='member.name')
    # This pulls the 'title' from the related Book model
    book_title = serializers.ReadOnlyField(source='book.title')

    class Meta:
        model = Loan
        # Include these new fields instead of just relying on the ForeignKey ID
        fields = ['id', 'loan_date', 'return_date', 'member_name', 'book_title']
>>>>>>> Stashed changes
