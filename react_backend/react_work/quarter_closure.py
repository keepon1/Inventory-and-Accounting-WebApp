from datetime import date
from .models import month_period, quarter_period
from .month_closure import close_month_period

def close_quarter_period(quarter: quarter_period):
    if quarter.is_closed:
        return

    months = month_period.objects.filter(quarter=quarter).order_by("-end").first()
    if months:
        if not months.is_closed:
            close_month_period(month=months)

    quarter.is_closed = True
    quarter.closing_date = date.today()
    quarter.save()
