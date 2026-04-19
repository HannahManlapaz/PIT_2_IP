from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models


class CustomUserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError('Username is required')
        if not extra_fields.get('email'):
            raise ValueError('Email is required')
        extra_fields['email'] = self.normalize_email(extra_fields['email'])
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(username, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    username       = models.CharField(max_length=150, unique=True)
    email          = models.EmailField(unique=True)
    name           = models.CharField(max_length=255)
    is_active      = models.BooleanField(default=True)
    is_staff       = models.BooleanField(default=False)
    date_joined    = models.DateTimeField(auto_now_add=True)
    contact_number = models.CharField(max_length=100, blank=True)
    address        = models.CharField(max_length=255, blank=True)
    join_date      = models.DateField(null=True, blank=True)

    objects = CustomUserManager()

    USERNAME_FIELD  = 'username'
    REQUIRED_FIELDS = ['email']

    def __str__(self):
        return self.username