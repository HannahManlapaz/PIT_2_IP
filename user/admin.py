from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display   = ['username', 'email', 'name', 'is_staff', 'is_superuser', 'is_active']
    search_fields  = ['username', 'email', 'name']
    list_filter    = ['is_staff', 'is_superuser', 'is_active']
    ordering       = ['username']

    fieldsets = (
        (None,           {'fields': ('username', 'password')}),
        ('Personal Info', {'fields': ('name', 'email', 'contact_number', 'address', 'join_date')}),
        ('Permissions',  {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields':  ('username', 'email', 'name', 'password1', 'password2',
                        'contact_number', 'address', 'is_staff', 'is_superuser'),
        }),
    )