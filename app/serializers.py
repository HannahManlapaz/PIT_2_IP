from rest_framework import serializers
from .models import Author, Book, Member, Loan

class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = '__all__'

class BookSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    cover_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = ['id', 'title', 'isbn', 'publication_year', 'author', 'author_name', 'available', 'cover_image', 'cover_image_url']

    def get_author_name(self, obj):
        return obj.author.name if obj.author else None

    def get_cover_image_url(self, obj):
        request = self.context.get('request')
        if obj.cover_image and request:
            return request.build_absolute_uri(obj.cover_image.url)
        return None

class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = '__all__'

class LoanSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField()
    book_title  = serializers.SerializerMethodField()

    class Meta:
        model = Loan
        fields = ['id', 'member', 'book', 'member_name', 'book_title', 'loan_date', 'return_date']

    def get_member_name(self, obj):
        return obj.member.name if obj.member else None

    def get_book_title(self, obj):
        return obj.book.title if obj.book else None

class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = '__all__'