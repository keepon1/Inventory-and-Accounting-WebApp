from . import models
from decimal import Decimal
from django.core.paginator import Paginator
from django.db.models import Sum
from collections import defaultdict
from django.db import transaction
from django.db.models import Q, Sum, F, ExpressionWrapper, DecimalField
import logging


logger = logging.getLogger(__name__)

def fetch_locations_for_select(business, user, company, search):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)
        
        location_query = models.inventory_location.objects.filter(bussiness_name=business_query)

        if search:
            location_query = location_query.filter(location_name__icontains=search)

        location_query = location_query.order_by('location_name').values('location_name').annotate(value=F('location_name'), label=F('location_name'))
        
        return {'status':'success', 'data':location_query}

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {'status': 'error', 'message': f'Business {business} not found'}
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found")
        return {'status': 'error', 'message': f'User {user} not found'}
    
    except Exception:
        logger.exception("Unhandled error during item verification")
        return {'status': 'error', 'message': 'something happened'}
    
def fetch_source_locations_for_select(business, user, company, search):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)
        
        location_query = models.inventory_location.objects.filter(bussiness_name=business_query)

        if not user_query.admin:
            locations = user_query.per_location_access
            location_query = location_query.filter(location_name__in=locations)

        if search:
            location_query = location_query.filter(location_name__icontains=search)

        location_query = location_query.order_by('location_name')[:30].values('location_name').annotate(value=F('location_name'), label=F('location_name'))

        
        return {'status':'success', 'data':location_query}

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {'status': 'error', 'message': f'Business {business} not found'}
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found")
        return {'status': 'error', 'message': f'User {user} not found'}
    
    except ValueError as value:
        logger.info(value)
        return {'status': 'error', 'message': 'Invalid data was submitted'}
    
    except Exception:
        logger.exception("Unhandled error during item verification")
        return {'status': 'error', 'message': 'something happened'}

def fetch_location_for_main_view(business, user, search, company):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(user_name=user, bussiness_name=business_query)

        if not user_query.admin and not user_query.location_access:
            return {'status': 'error', 'message': 'User has no location access'}
        
        location = models.inventory_location.objects.filter(bussiness_name=business_query)

        if not user_query.admin:
            location = location.filter(location_name__in=user_query.per_location_access)

        if search.strip():
            location = location.filter(location_name__icontains=search)

        location_ids = location.values_list('id', flat=True)

        value_expression = ExpressionWrapper(F('quantity') * F('purchase_price'), output_field=DecimalField())

        results = (
            models.location_items.objects
            .filter(location_id__in=location_ids, bussiness_name=business_query)
            .values(
                'location__location_name',
                'location__description',
                'location__creation_date'
            )
            .annotate(
                total_quantity=Sum('quantity'),
                total_value=Sum(value_expression)
            )
        )

        data = []
        for r in results:
            data.append({
                'loc': r['location__location_name'],
                'description': r['location__description'],
                'date': r['location__creation_date'].date(),
                'qty': r['total_quantity'],
                'value': r['total_value']
            })

        return {'status': 'success', 'data': data}
    
    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {'status': 'error', 'message': f'Business {business} not found'}
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return {'status': 'error', 'message': f'User {user} not found'}
    
    except ValueError as value:
        logger.info(value)
        return {'status': 'error', 'message': 'Invalid data was submitted'}
    
    except Exception:
        logger.exception("Unhandled error during item verification")
        return {'status': 'error', 'message': 'something happened'}