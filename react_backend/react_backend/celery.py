import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'react_backend.settings')


app = Celery('react_backend')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks(['react_work'])

app.conf.beat_schedule = {
    "close-periods-monthly": {
        "task": "react_work.account_closure.auto_close_periods",
        "schedule": crontab(hour=0, minute=0, day_of_month=1),
    },
}
