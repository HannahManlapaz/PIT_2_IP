# app/models.py
from django.db import models
from datetime import timedelta, date
from django.conf import settings


class Author(models.Model):
    name        = models.CharField(max_length=100)
    biography   = models.TextField()
    nationality = models.CharField(max_length=50)

    def __str__(self):
        return self.name

class Category(models.Model):
    name        = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name
    
class Department(models.Model):
    name        = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name
    
class Semester(models.Model):
    SEMESTER_CHOICES = [
        ('1st_sem', '1st Semester'),
        ('2nd_sem', '2nd Semester'),
        ('summer',  'Summer'),
    ]

    academic_year = models.CharField(max_length=20)         # e.g. "2024-2025"
    semester_type = models.CharField(max_length=20, choices=SEMESTER_CHOICES)
    start_date    = models.DateField()
    end_date      = models.DateField()
    is_active     = models.BooleanField(default=False)      # marks the current semester

    class Meta:
        unique_together = ('academic_year', 'semester_type')
        ordering        = ['-academic_year', 'semester_type']

    def __str__(self):
        return f"{self.get_semester_type_display()} — {self.academic_year}"


class Book(models.Model):
    title            = models.CharField(max_length=200)
    isbn             = models.CharField(max_length=20, unique=True)
    publication_year = models.IntegerField()
    author           = models.ForeignKey(Author, on_delete=models.CASCADE)
    available        = models.BooleanField(default=True)
    cover_image      = models.ImageField(upload_to='book_covers/', null=True, blank=True)
    description      = models.TextField(blank=True, null=True)
    category         = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)    
    department       = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)  

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
    
    SEMESTER_CHOICES = [
        ('1st_sem', '1st Semester'),
        ('2nd_sem', '2nd Semester'),
        ('summer',  'Summer'),
    ]

    member                = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='loans')
    semester              = models.ForeignKey('Semester', on_delete=models.SET_NULL, null=True, blank=True, related_name='loans')
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
    class Meta:
        ordering = ['-loan_date']  

    def save(self, *args, **kwargs):
        if self.loan_date and not self.pk:
            if isinstance(self.loan_date, str):
                from datetime import datetime
                self.loan_date = datetime.strptime(self.loan_date, '%Y-%m-%d').date()
            self.due_date = self.loan_date + timedelta(days=14)

            # ── Auto-assign semester if not manually set ──
            if not self.semester_id:
                matched = Semester.objects.filter(
                    start_date__lte=self.loan_date,
                    end_date__gte=self.loan_date
                ).first()
                if matched:
                    self.semester = matched

        
        if self.book_id:
            book = Book.objects.get(pk=self.book_id)

            if self.return_verified_date:
                book.available = True

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

    member         = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reservations'
    )
    book           = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name='reservations'
    )
    reserved_date  = models.DateField(auto_now_add=True)
    status         = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='waiting'
    )
    notified_date  = models.DateField(null=True, blank=True)
    queue_position = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['reserved_date']   

    def __str__(self):
        return f"{self.member.name} reserved {self.book.title} - {self.get_status_display()}"