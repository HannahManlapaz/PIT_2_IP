# app/serializers.py
from rest_framework import serializers
from .models import Author, Book, Loan, Reservation, Category, Department, Semester
from datetime import date
from django.contrib.auth import get_user_model

User = get_user_model()


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Author
        fields = '__all__'

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Category
        fields = '__all__'


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Department
        fields = '__all__'
        
class SemesterSerializer(serializers.ModelSerializer):
    semester_type_display = serializers.SerializerMethodField()
    loan_count            = serializers.SerializerMethodField()

    class Meta:
        model  = Semester
        fields = ['id', 'academic_year', 'semester_type', 'semester_type_display',
                  'start_date', 'end_date', 'is_active', 'loan_count']

    def get_semester_type_display(self, obj):
        return obj.get_semester_type_display()

    def get_loan_count(self, obj):
        return obj.loans.count()


class BookSerializer(serializers.ModelSerializer):
    author_name     = serializers.SerializerMethodField()
    cover_image_url = serializers.SerializerMethodField()
    category_name   = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    cover_image     = serializers.ImageField(required=False, allow_null=True)  

    class Meta:
        model  = Book
        fields = ['id', 'title', 'isbn', 'publication_year', 'author',
                  'author_name', 'available', 'cover_image', 'cover_image_url',
                  'description', 'category', 'category_name',
                  'department', 'department_name']    

    def get_author_name(self, obj):
        return obj.author.name if obj.author else None

    def get_cover_image_url(self, obj):
        if obj.cover_image:
            url = obj.cover_image.url
            url = url.replace('/upload/', '/upload/f_auto/')
            return url
        return None

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None    

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None  


class LoanSerializer(serializers.ModelSerializer):
    member_name      = serializers.SerializerMethodField()
    book_title       = serializers.SerializerMethodField()
    book_category    = serializers.SerializerMethodField()    
    book_department  = serializers.SerializerMethodField() 
    overdue_days     = serializers.SerializerMethodField()
    verified_by_name = serializers.SerializerMethodField()
    semester_label   = serializers.SerializerMethodField()

    class Meta:
        model  = Loan
        fields = [
            'id', 'member', 'book', 'member_name', 'book_title',
            'book_category', 'book_department',
            'loan_date', 'due_date', 'return_date', 'return_requested_date',
            'return_verified_date', 'return_status', 'verified_by',
            'verified_by_name', 'overdue_days', 'notes',
            'semester', 'semester_label'
        ]
        read_only_fields = ['return_verified_date', 'verified_by']

    def get_semester_label(self, obj):
        return str(obj.semester) if obj.semester else None

    def get_member_name(self, obj):
        return obj.member.name if obj.member else None

    def get_book_title(self, obj):
        return obj.book.title if obj.book else None
    
    def get_book_category(self, obj):
        return obj.book.category.name if obj.book and obj.book.category else None

    def get_book_department(self, obj):
        return obj.book.department.name if obj.book and obj.book.department else None

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

    def create(self, validated_data):
        # Auto-assign semester if not provided
        if not validated_data.get('semester'):
            loan_date = validated_data.get('loan_date')
            if loan_date:
                matched = Semester.objects.filter(
                    start_date__lte=loan_date,
                    end_date__gte=loan_date
                ).first()
                if matched:
                    validated_data['semester'] = matched
        return super().create(validated_data)


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