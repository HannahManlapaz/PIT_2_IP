from django.db import models
from datetime import timedelta, date
from django.conf import settings


class Author(models.Model):
    name        = models.CharField(max_length=100)
    biography   = models.TextField()
    nationality = models.CharField(max_length=50)

    def __str__(self):
        return self.name


class Book(models.Model):
    title            = models.CharField(max_length=200)
    isbn             = models.CharField(max_length=20, unique=True)
    publication_year = models.IntegerField()
    author           = models.ForeignKey(Author, on_delete=models.CASCADE)
    available        = models.BooleanField(default=True)
    cover_image      = models.ImageField(upload_to='book_covers/', null=True, blank=True)
    description      = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.title


class Loan(models.Model):
    RETURN_STATUS_CHOICES = [
        ('none',     'No Request'),
        ('pending',  'Pending Return'),
        ('verified', 'Returned & Verified'),
        ('rejected', 'Return Rejected'),
        ('disputed', 'Disputed'),
    ]

    member                = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='loans')
    book                  = models.ForeignKey(Book, on_delete=models.CASCADE)
    loan_date             = models.DateField()
    due_date              = models.DateField(null=True, blank=True)
    return_date           = models.DateField(null=True, blank=True)
    return_requested_date = models.DateField(null=True, blank=True)
    return_verified_date  = models.DateField(null=True, blank=True)
    return_status         = models.CharField(max_length=20, choices=RETURN_STATUS_CHOICES, default='none')
    verified_by           = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='verified_returns'
    )
    notes = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if self.loan_date and not self.pk:
            if isinstance(self.loan_date, str):
                from datetime import datetime
                self.loan_date = datetime.strptime(self.loan_date, '%Y-%m-%d').date()
            self.due_date = self.loan_date + timedelta(days=14)

        if self.book_id:
            book = Book.objects.get(pk=self.book_id)
            book.available = bool(self.return_verified_date)
            book.save(update_fields=['available'])

        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.book_id and not self.return_verified_date:
            book = Book.objects.get(pk=self.book_id)
            book.available = True
            book.save()
        super().delete(*args, **kwargs)

    @property
    def overdue_days(self):
        if self.return_verified_date or self.return_date:
            return 0
        if self.due_date and date.today() > self.due_date:
            return (date.today() - self.due_date).days
        return 0

    def __str__(self):
        return f"{self.member.name} borrowed {self.book.title} - Status: {self.get_return_status_display()}"


class Reservation(models.Model):
    STATUS_CHOICES = [
        ('waiting',   'Waiting'),
        ('ready',     'Ready to Borrow'),
        ('cancelled', 'Cancelled'),
        ('expired',   'Expired'),
        ('fulfilled', 'Fulfilled'),
    ]

    member         = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reservations')
    book           = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='reservations')
    reserved_date  = models.DateField(auto_now_add=True)
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting')
    notified_date  = models.DateField(null=True, blank=True)
    queue_position = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('member', 'book', 'status')
        ordering        = ['reserved_date']

    def __str__(self):
        return f"{self.member.name} reserved {self.book.title} - {self.get_status_display()}"