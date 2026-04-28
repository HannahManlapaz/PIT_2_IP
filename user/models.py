from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from cloudinary_storage.storage import MediaCloudinaryStorage  # <-- add this


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user  = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff',     True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    email          = models.EmailField(unique=True)
    username       = models.CharField(max_length=150, unique=True)
    name           = models.CharField(max_length=255, blank=True)
    contact_number = models.CharField(max_length=100, blank=True)
    address        = models.CharField(max_length=255, blank=True)
    birthday       = models.DateField(null=True, blank=True)
    profile_picture = models.ImageField(          # <-- add this
        upload_to='profile_pictures/',
        blank=True,
        null=True,
        storage=MediaCloudinaryStorage()
    )
    is_active      = models.BooleanField(default=True)
    is_staff       = models.BooleanField(default=False)
    date_joined    = models.DateTimeField(auto_now_add=True)

    objects = CustomUserManager()

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.username