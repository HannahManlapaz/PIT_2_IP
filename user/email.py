from djoser import email
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
import os

class CustomActivationEmail(email.ActivationEmail):
    template_name = "emails/activation.html"

    def send(self, to, *args, **kwargs):
        context = self.get_context_data()
        uid     = context['uid']
        token   = context['token']

        frontend = os.environ.get('FRONTEND_URL', 'http://localhost:8081')

        # Web link (Vercel or localhost)
        web_url    = f"{frontend}/activate/{uid}/{token}"
        # Mobile deep link
        mobile_url = f"librium://activate/{uid}/{token}"

        context['web_url']    = web_url
        context['mobile_url'] = mobile_url
        context['url']        = web_url

        html_content = render_to_string(self.template_name, context)
        msg = EmailMultiAlternatives(
            subject="Activate your Librium Portal account",
            body=f"Activate your account here: {web_url}",
            from_email=None,
            to=to,
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()