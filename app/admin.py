from django.contrib import admin
from .models import Author, Book, Loan, Reservation


admin.site.register(Author)
admin.site.register(Loan)
admin.site.register(Reservation)


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display  = ['title', 'author', 'publication_year', 'available']
    search_fields = ['title', 'author__name']
    list_filter   = ['available']
    fields        = [
        'title',
        'author',
        'isbn',
        'publication_year',
        'cover_image',
        'available',
        'description',
    ]