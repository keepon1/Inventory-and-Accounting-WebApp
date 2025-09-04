from django.apps import AppConfig


class ReactWorkConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'react_work'

    def ready(self):
        import react_work.signals
