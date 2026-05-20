from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.contrib.auth.tokens import default_token_generator
import os


class CustomActivationEmail:
    template_name = "emails/activation.html"

    def __init__(self, request=None, context=None, *args, **kwargs):
        self.request = request
        self.context = context or {}

    def get_context_data(self):
        return self.context

    def send(self, to, *args, **kwargs):
        context = self.get_context_data().copy()
        uid = context.get('uid') or urlsafe_base64_encode(force_bytes(context['user'].pk))
        token = context.get('token') or default_token_generator.make_token(context['user'])

        frontend = os.environ.get('FRONTEND_URL', 'http://localhost:8081').rstrip('/')
        web_url = f"{frontend}/activate/{uid}/{token}"
        mobile_url = f"librium://activate/{uid}/{token}"

        context['web_url'] = web_url
        context['mobile_url'] = mobile_url
        context['url'] = web_url
        context['uid'] = uid
        context['token'] = token

        html_content = render_to_string(self.template_name, context)

        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or getattr(settings, 'EMAIL_HOST_USER', None)
        if not from_email:
            from_email = 'no-reply@example.com'

        if isinstance(to, str):
            to = [to]

        msg = EmailMultiAlternatives(
            subject="Activate your Librium Portal account",
            body=f"Activate your account here: {web_url}",
            from_email=from_email,
            to=to,
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()


def send_activation_email(user, to_email=None, uid=None, token=None, request=None):
    if isinstance(to_email, str):
        to_email = [to_email]
    if to_email is None:
        to_email = [user.email]
    context = {
        'user': user,
        'uid': uid,
        'token': token,
    }
    email_sender = CustomActivationEmail(request=request, context=context)
    email_sender.send(to=to_email)
