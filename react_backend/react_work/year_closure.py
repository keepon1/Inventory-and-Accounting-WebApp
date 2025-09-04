from datetime import date
from .models import quarter_period, year_period
from .quarter_closure import close_quarter_period

def close_year_period(year: year_period):
    if year.is_closed:
        return

    quarters = quarter_period.objects.filter(year=year).order_by("-end").first()
    if quarters:
        if not quarters.is_closed:
            close_quarter_period(quarter=quarters)
    
    year.is_closed = True
    year.closing_date = date.today()
    year.save()
