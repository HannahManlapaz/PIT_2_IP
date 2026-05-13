# app/migrations/0004_semester_alter_loan_semester.py
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0003_category_department_loan_semester_book_category_and_more'),  
    ]

    operations = [
        # 1. Create the Semester table first
        migrations.CreateModel(
            name='Semester',
            fields=[
                ('id',            models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('academic_year', models.CharField(max_length=20)),
                ('semester_type', models.CharField(choices=[('1st_sem', '1st Semester'), ('2nd_sem', '2nd Semester'), ('summer', 'Summer')], max_length=20)),
                ('start_date',    models.DateField()),
                ('end_date',      models.DateField()),
                ('is_active',     models.BooleanField(default=False)),
            ],
            options={
                'ordering': ['-academic_year', 'semester_type'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='semester',
            unique_together={('academic_year', 'semester_type')},
        ),

        # 2. Drop the broken old semester column (could be varchar OR bigint depending on history)
        migrations.RunSQL(
            sql="ALTER TABLE app_loan DROP COLUMN IF EXISTS semester_id;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql="ALTER TABLE app_loan DROP COLUMN IF EXISTS semester;",
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 3. Add the proper FK column
        migrations.AddField(
            model_name='loan',
            name='semester',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='loans',
                to='app.semester',
            ),
        ),
    ]