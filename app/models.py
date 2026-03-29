from django.db import models
from datetime import timedelta
from django.contrib.auth.models import User

class Author(models.Model):
    name = models.CharField(max_length=100)
    biography = models.TextField()
    nationality = models.CharField(max_length=50)

    def __str__(self):
        return self.name

class Book(models.Model):
    title = models.CharField(max_length=200)
    isbn = models.CharField(max_length=20, unique=True)
    publication_year = models.IntegerField()
    author = models.ForeignKey(Author, on_delete=models.CASCADE)
    available = models.BooleanField(default=True)
    cover_image = models.ImageField(upload_to='book_covers/', null=True, blank=True)
    
    def __str__(self):
            return self.title
    
class Member(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=100)
    contact_number = models.CharField(max_length=100)
    join_date = models.DateField()
    address = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class Loan(models.Model):
    RETURN_STATUS_CHOICES = [
        ('pending', 'Pending Return'),
        ('verified', 'Returned & Verified'),
        ('disputed', 'Disputed'),
    ]
    
    member = models.ForeignKey(Member, on_delete=models.CASCADE)
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    loan_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    return_date = models.DateField(null=True, blank=True)
    return_requested_date = models.DateField(null=True, blank=True)  # When borrower requests return
    return_verified_date = models.DateField(null=True, blank=True)   # When admin verifies return
    return_status = models.CharField(
        max_length=20, 
        choices=RETURN_STATUS_CHOICES, 
        default='pending'
    )
    verified_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='verified_returns'
    )
    notes = models.TextField(blank=True, null=True)  # For admin notes

    def save(self, *args, **kwargs):
        if self.loan_date:
            if isinstance(self.loan_date, str):
                from datetime import datetime
                self.loan_date = datetime.strptime(self.loan_date, '%Y-%m-%d').date()
            self.due_date = self.loan_date + timedelta(days=14)
        
        # Book is unavailable while on loan; becomes available again when return is verified
        if self.book_id:
            book = Book.objects.get(pk=self.book_id)
            if self.return_verified_date:
                book.available = True
            else:
                book.available = False
            book.save(update_fields=['available'])

        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.book_id and not self.return_verified_date:
            book = Book.objects.get(pk=self.book_id)
            book.available = True
            book.save()
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"{self.member.name} borrowed {self.book.title} - Status: {self.get_return_status_display()}"

