from . import models
from decimal import Decimal
from django.core.paginator import Paginator
from django.db.models import Sum
from collections import defaultdict
from django.db import transaction
from django.db.models import Q
import logging
from . import report_class

logger = logging.getLogger(__name__)

def fetch_items_for_report(business, company, user, location):
    try:
        business_obj = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_obj, user_name=user)

        if not user_query.report_access and not user_query.admin:
            return 'no_access'
        
        categories = [{'value': 'All Categories', 'label':'All Categories'}]
        category_query = models.inventory_category.objects.filter(bussiness_name=business_obj)
        categories.extend([{'value':i.name, 'label':i.name} for i in category_query])

        
        if not user_query.admin:
            locations_access = user_query.per_location_access
        
        else:
            locations = [{'value': 'All Locations', 'label':'All Locations'}]
            location_query = models.inventory_location.objects.filter(bussiness_name=business_obj)

            locations.extend([{'value': i.location_name, 'label': i.location_name} for i in location_query])
            locations_access = ['All Locations']
            locations_access.extend([loc.location_name for loc in location_query])
           
        if user_query.admin and (not location or location.lower() == 'all locations'):
            
            items = models.items.objects.filter(bussiness_name=business_obj)
        
            items = items.order_by(
                'category__name', 'item_name'
            ).values(
                'item_name', 'quantity', 'code',
                'unit__suffix', 'purchase_price', 'sales_price',
                'category__name', 'reorder_level', 'last_sales'
            )

        else:
            if len(locations_access) < 1:
                return 'no location assigned'

            if not location:
                items = models.location_items.objects.filter(bussiness_name=business_obj, location__location_name=locations_access[0])

            else:
                items = models.location_items.objects.filter(bussiness_name=business_obj, location__location_name=location)

            items = items.order_by(
                    'item_name__category__name', 'item_name__brand', 'item_name__item_name'
                ).values(
                    'item_name__item_name', 'quantity', 'item_name__code',
                    'item_name__unit__suffix', 'purchase_price', 'sales_price',
                    'item_name__category__name', 'reorder_level', 'last_sales'
                )
            
            locations = [{'value':i, 'label':i} for i in locations_access]

        if not(user_query.admin and not location or location.lower() == 'all locations'):
            items = [
                {
                    'code': i['item_name__code'],
                    'item_name': i['item_name__item_name'],
                    'quantity': i['quantity'],
                    'unit__suffix': i['item_name__unit__suffix'],
                    'purchase_price': i['purchase_price'],
                    'sales_price': i['sales_price'],
                    'category__name': i['item_name__category__name'],
                    'reorder_level': i['reorder_level'],
                    'last_sales': i['last_sales']
                }
                for i in items
            ]

            
        result = {"items":items, 'locations':locations, 'categories':categories}

        return result
    
    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return "Business not found"
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return "User not found"
    
    except ValueError as value:
        logger.info(value)
        return 'error'
    
    except Exception as error:
        logger.exception('unhandled error')
        return 'something happened'
    
def fetch_data_for_report_movements(business, company, user, location, start, end):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not user_query.report_access and not user_query.admin:
            return 'no access'
        
        if user_query.admin and location.lower() == 'all locations':
            locations = models.inventory_location.objects.filter(bussiness_name=business_query)
            locations_access = [i.location_name for i in locations]

        elif not user_query.admin and location.lower() == 'all locations':
            locations_access = [i for i in user_query.per_location_access]

        else:
            locations_access = [location]

        movement_data = report_class.Report_Data(
            business=business_query,
            company=company,
            user=user_query,
            location_access=locations_access,
            start=start,
            end=end
        ).fetch_all_movements()

        locs = [{'value': 'All Locations', 'label': 'All Locations'}]

        if user_query.admin:
            locs.extend([{'value': i.location_name, 'label': i.location_name} for i in models.inventory_location.objects.filter(bussiness_name=business_query)])

        else:
            locs.extend([{'value': i, 'label': i} for i in user_query.per_location_access])

        result = {
            'sales': movement_data['sales'],
            'purchases': movement_data['purchases'],
            'transfers': movement_data['transfers'],
            'locations': locs
        }

        return result
    
    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return "Business not found"
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return "User not found"
    
    except ValueError as value:
        logger.info(value)
        return 'error'  
    
    except Exception as error:
        logger.exception('unhandled error')
        return 'something happened'
    
def fetch_data_for_sales_performance(business, company, user, location, start, end, reference):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not user_query.report_access and not user_query.admin:
            return f'{user} has no permission to view this report'
        
        if user_query.admin and location.lower() == 'all locations':
            locations = models.inventory_location.objects.filter(bussiness_name=business_query)
            locations_access = [i.location_name for i in locations]

        elif not user_query.admin and location.lower() == 'all locations':
            locations_access = [i for i in user_query.per_location_access]

        else:
            locations_access = [location]

        if reference == 'sales_performance':

            sales_data = report_class.Report_Data(
                business=business_query,
                company=company,
                user=user_query,
                location_access=locations_access,
                start=start,
                end=end
            ).fetch_sales()

        elif reference == 'customer_aging':
            sales_data = report_class.Report_Data(
                business=business_query,
                company=company,
                user=user_query,
                location_access=locations_access,
                end=end
            ).fetch_customer_insights()

        elif reference == 'supplier_performance':
            sales_data = report_class.Report_Data(
                business=business_query,
                company=company,
                user=user_query,
                location_access=locations_access,
                start=start,
                end=end
            ).fetch_supplier_insights()

        elif reference == 'purchase_metric':
            sales_data = report_class.Report_Data(
                business=business_query,
                company=company,
                user=user_query,
                location_access=locations_access,
                start=start,
                end=end
            ).fetch_purchase()

        elif reference == 'sales_records':
            sales_data = report_class.Report_Data(
                business=business_query,
                company=company,
                user=user_query,
                location_access=locations_access,
                start=start,
                end=end
            ).fetch_sales_records()

            print(sales_data)

        locs = [{'value': 'All Locations', 'label': 'All Locations'}]

        if user_query.admin:
            locs.extend([{'value': i.location_name, 'label': i.location_name} for i in models.inventory_location.objects.filter(bussiness_name=business_query)])
            
        else:
            locs.extend([{'value': i, 'label': i} for i in user_query.per_location_access])

        result = {
            'sales': sales_data,
            'locations': locs
        }

        return result
    
    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return "Business not found"
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return "User not found"
    
    except ValueError as value:
        logger.warning(value)
        return 'error'  
    
    except Exception as error:
        logger.exception(error)
        return 'something happened'
    
    
def fetch_data_for_dashboard(business, company, user, location):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not user_query.report_access and not user_query.admin:
            return 'no access'
        
        if user_query.admin and location.lower() == 'all locations':
            locations = models.inventory_location.objects.filter(bussiness_name=business_query)
            locations_access = [i.location_name for i in locations]

        elif not user_query.admin and location.lower() == 'all locations':
            locations_access = [i for i in user_query.per_location_access]

        else:
            locations_access = [location]

        dashboard_items = report_class.Dashboard_Report(
            business=business_query,
            company=company,
            user=user_query,
            location_access=location
        ).fetch_total_item_quantity()

        dashboard_values = report_class.Dashboard_Report(
            business=business_query,
            company=company,
            user=user_query,
            location_access=locations_access
        ).dashboard_data()

        

        locs = [{'value': 'All Locations', 'label': 'All Locations'}]

        if user_query.admin:
            locs.extend([{'value': i.location_name, 'label': i.location_name} for i in models.inventory_location.objects.filter(bussiness_name=business_query)])
            
        else:
            locs.extend([{'value': i, 'label': i} for i in user_query.per_location_access])

        result = {
            'low_stock': dashboard_items['low_stock'],
            'category': dashboard_items['category'],
            'total_quantity': dashboard_items['quantity'],
            'dashboard_data': dashboard_values,
            'locations': locs
        }

        return result
    
    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return "Business not found"
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return "User not found"
    
    except ValueError as value:
        logger.info(value)
        return 'error'  
    
    except Exception as error:
        logger.exception(error)
        return 'something happened'
    
def fetch_pl_report(business, user, start, end, period_type, company):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not user_query.report_access and not user_query.admin:
            return f'{user} has no permission to view this report'

        data = report_class.Financial_Report(business=business_query, start=start, end=end, period_type=period_type).pl_data()

        return data
        
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return "User not found"
    
    except ValueError as value:
        logger.info(value)
        return 'error'  
    
    except Exception as error:
        logger.exception(error)
        return 'something happened'
    
def fetch_iv_report(business, user, start, end, category, company):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not user_query.report_access and not user_query.admin:
            return f'{user} has no permission to view this report'

        data = report_class.Inventory_Valuation(business=business_query, start=start, end=end, category=category).close_inventory()

        return   data
        
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return "User not found"
    
    except ValueError as value:
        logger.info(value)
        return 'error'  
    
    except Exception as error:
        logger.exception(error)
        return 'something happened'
    
def fetch_tb_report(business, user, start, end, company):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not user_query.report_access and not user_query.admin:
            return f'{user} has no permission to view this report'

        data = report_class.Trial_Balance(business=business_query, start=start, end=end).tb_data()

        return   data
        
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return "User not found"
    
    except ValueError as value:
        logger.info(value)
        return 'error'  
    
    except Exception as error:
        logger.exception(error)
        return 'something happened'