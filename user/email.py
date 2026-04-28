from djoser import email
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

class CustomActivationEmail(email.ActivationEmail):
    template_name = "emails/activation.html"

    def send(self, to, *args, **kwargs):
        context = self.get_context_data()
        context['url'] = 'http://localhost:3000/activate/{uid}/{token}'.format(
            uid=context['uid'],
            token=context['token'],
        )
        html_content = render_to_string(self.template_name, context)
        msg = EmailMultiAlternatives(
            subject="Activate your Library System account",
            body="Please activate your account.",
            from_email=None,
            to=to,
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()