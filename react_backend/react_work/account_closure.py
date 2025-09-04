import logging
from celery import shared_task
from datetime import datetime
from django.db import transaction
from .models import year_period, month_period, quarter_period, bussiness
from .month_closure import close_month_period
from .quarter_closure import close_quarter_period
from .year_closure import close_year_period

logger = logging.getLogger("celery")

@shared_task(name="react_work.account_closure.auto_close_periods")
def auto_close_periods():
    today = datetime.now().date()
    logger.info("Auto-close task started for %s", today)

    try:
        with transaction.atomic():
            for biz in bussiness.objects.all():
                yp, created = year_period.objects.update_or_create(
                    bussiness_name=biz,
                    year=str(today.year),
                    defaults={"is_closed": False, "closing_date": None}
                )
                if created:
                    logger.info("Created new year period for business=%s year=%s", biz, today.year)
                else:
                    logger.info("Year period already exists for business=%s year=%s", biz, today.year)

            months = month_period.objects.filter(end__lt=today, is_closed=False).order_by('-end').first()
            if months:
                close_month_period(month=months)
                logger.info("Closed month period: %s", months)

            quarters = quarter_period.objects.filter(end__lt=today, is_closed=False).order_by('-end').first()
            if quarters and not month_period.objects.filter(quarter=quarters, is_closed=False).exists():
                close_quarter_period(quarter=quarters)
                logger.info("Closed quarter period: %s", quarters)

            years = year_period.objects.filter(year__lt=today.year, is_closed=False).order_by('-year').first()
            if years and not quarter_period.objects.filter(year=years, is_closed=False).exists():
                close_year_period(year=years)
                logger.info("Closed year period: %s", years)

        logger.info("Auto-close task finished successfully")

    except Exception as e:
        logger.exception("Auto-close task failed: %s", e)
        raise 
