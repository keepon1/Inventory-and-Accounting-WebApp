from . import models
from decimal import Decimal
from django.core.paginator import Paginator
from django.db.models import Sum, F, Case, When, Value, CharField
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

        if not (user_query.report_access or user_query.admin):
            return 'no access'
        
        categories = [{'value': 'All Categories', 'label':'All Categories'}]
        category_query = models.inventory_category.objects.filter(bussiness_name=business_obj)
        categories.extend([{'value':i.name, 'label':i.name} for i in category_query])

        brands = [{'value': 'All Brands', 'label':'All Brands'}]
        brand_query = models.inventory_brand.objects.filter(bussiness_name=business_obj)
        brands.extend([{'value':i.name, 'label':i.name} for i in brand_query])

        
        if not user_query.admin:
            locations_access = user_query.per_location_access
        
        else:
            locations = [{'value': 'All Locations', 'label':'All Locations'}]
            location_query = models.inventory_location.objects.filter(bussiness_name=business_obj)

            locations.extend([{'value': i.location_name, 'label': i.location_name} for i in location_query])
            locations_access = ['All Locations']
            locations_access.extend([loc.location_name for loc in location_query])

        report_permission, created = models.report_permissions.objects.get_or_create(user=user_query, bussiness_name=business_obj)

        if report_permission is None or not (report_permission.item_summary or report_permission.user.admin):
            return 'no access'
           
        if user_query.admin and (not location or location.lower() == 'all locations'):
            
            items = models.items.objects.filter(bussiness_name=business_obj, is_active=True, quantity__gt=0)
        
            items = items.order_by(
                'category__name', 'brand__name', 'item_name'
            ).values(
                'item_name', 'quantity', 'code', 'brand__name',
                'unit__suffix', 'purchase_price', 'sales_price',
                'category__name', 'reorder_level', 'last_sales', 
            )

        else:
            if len(locations_access) < 1:
                return 'no location assigned'

            if not location:
                items = models.location_items.objects.filter(bussiness_name=business_obj, location__location_name=locations_access[0])
            
            else:
                items = models.location_items.objects.filter(bussiness_name=business_obj, location__location_name=location, item_name__is_active=True, quantity__gt=0)

            items = items.order_by(
                    'item_name__category__name', 'item_name__brand__name', 'item_name__item_name'
                ).annotate(
                    code=F('item_name__code'),
                    item_name1=F('item_name__item_name'),
                    unit__suffix=F('item_name__unit__suffix'),
                    category__name=F('item_name__category__name'),
                    brand__name=F('item_name__brand__name'),
                ).values(
                    'code', 'item_name', 'item_name1', 'quantity', 'unit__suffix',
                    'purchase_price', 'sales_price', 'category__name',
                    'reorder_level', 'last_sales', 'brand__name'
                )
            
            locations = [{'value':i, 'label':i} for i in locations_access]

        result = {"items":items, 'locations':locations, 'categories':categories, 'brands':brands}

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
        logger.warning(error)
        return 'something happened'
    
def fetch_data_for_report_movements(business, company, user, location, start, end):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not (user_query.report_access or user_query.admin):
            return 'no access'
        
        report_permission, created = models.report_permissions.objects.get_or_create(user=user_query, bussiness_name=business_query)

        if report_permission is None:
            return 'no access'

        if not (report_permission.stock_movement or report_permission.user.admin):
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
    
def fetch_data_for_sales_performance(business, company, user, location, start, end, reference, category=None, brand=None, supplier=None):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not (user_query.report_access or user_query.admin):
            return 'no access'
        
        report_permission, created = models.report_permissions.objects.get_or_create(user=user_query, bussiness_name=business_query)

        if report_permission is None and user_query.admin is False:
            return 'no access'
        
        if user_query.admin and location.lower() == 'all locations':
            locations = models.inventory_location.objects.filter(bussiness_name=business_query)
            locations_access = [i.location_name for i in locations]

        elif not user_query.admin and location.lower() == 'all locations':
            locations_access = [i for i in user_query.per_location_access]

        else:
            locations_access = [location]

        if reference == 'sales_performance':

            if report_permission.sales_performance is False:
                return 'no access'

            sales_data = report_class.Report_Data(
                business=business_query,
                company=company,
                user=user_query,
                location_access=locations_access,
                start=start,
                end=end
            ).fetch_sales()

        elif reference == 'customer_aging':

            if report_permission.aged_payables is False and report_permission.user.admin is False:
                return 'no access'
            
            sales_data = report_class.Report_Data(
                business=business_query,
                company=company,
                user=user_query,
                location_access=locations_access,
                end=end
            ).fetch_customer_insights()

        elif reference == 'supplier_performance':

            if report_permission.supplier_insights is False and report_permission.user.admin is False:
                return 'no access'
            
            sales_data = report_class.Report_Data(
                business=business_query,
                company=company,
                user=user_query,
                location_access=locations_access,
                start=start,
                end=end
            ).fetch_supplier_insights()

        elif reference == 'purchase_metric':

            if report_permission.purchase_metrics is False and report_permission.user.admin is False:
                return 'no access'
            
            sales_data = report_class.Report_Data(
                business=business_query,
                company=company,
                user=user_query,
                location_access=locations_access,
                start=start,
                end=end
            ).fetch_purchase()

        elif reference == 'sales_records':

            if report_permission.sales_records is False and report_permission.user.admin is False:
                return 'no access'

            sales_data = report_class.Report_Data(
                business=business_query,
                company=company,
                user=user_query,
                location_access=locations_access,
                start=start,
                end=end,
                category=category,
                brand=brand
            ).fetch_sales_records()

        elif reference == 'purchase_records':

            if report_permission.purchase_records is False and report_permission.user.admin is False:
                return 'no access'

            sales_data = report_class.Report_Data(
                business=business_query,
                company=company,
                user=user_query,
                location_access=locations_access,
                start=start,
                end=end,
                category=category,
                brand=brand
            ).fetch_purchase_records(supplier=supplier)


        locs = [{'value': 'All Locations', 'label': 'All Locations'}]

        if user_query.admin:
            locs.extend([{'value': i.location_name, 'label': i.location_name} for i in models.inventory_location.objects.filter(bussiness_name=business_query)])
            
        else:
            locs.extend([{'value': i, 'label': i} for i in user_query.per_location_access])

        brands = [{'value': 'all', 'label':'All Brands'}]
        brand_query = models.inventory_brand.objects.filter(bussiness_name=business_query)
        brands.extend([{'value':i.name, 'label':i.name} for i in brand_query])

        categories = [{'value': 'all', 'label':'All Categories'}]
        category_query = models.inventory_category.objects.filter(bussiness_name=business_query)
        categories.extend([{'value':i.name, 'label':i.name} for i in category_query])

        result = {
            'sales': sales_data,
            'locations': locs,
            'brands': brands,
            'categories': categories
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
        return f'something happened {str(error)}'
    
    
def fetch_data_for_dashboard(business, company, user, location):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not (user_query.report_access or user_query.admin):
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
            'low_stock': dashboard_items['low_stock'] or [],
            'category': dashboard_items['category'] or [],
            'brand': dashboard_items['brand'] or [],
            'total_quantity': dashboard_items['quantity'] or 0,
            'dashboard_data': dashboard_values or {},
            'locations': locs or [],
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

        if not (user_query.report_access or user_query.admin):
            return 'no access'
        
        report_permission, created = models.report_permissions.objects.get_or_create(user=user_query, bussiness_name=business_query)

        if report_permission is None:
            return 'no access'

        if report_permission.profit_and_loss is False and report_permission.user.admin is False:
            return 'no access'

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
            return 'no access'
        
        report_permission, created = models.report_permissions.objects.get_or_create(user=user_query, bussiness_name=business_query)

        if report_permission is None:
            return 'no access'

        if report_permission.inventory_valuation is False and report_permission.user.admin is False:
            return 'no access'

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

        if not (user_query.report_access or user_query.admin):
            return 'no access'
        
        report_permission, created = models.report_permissions.objects.get_or_create(user=user_query, bussiness_name=business_query)

        if report_permission is None:
            return 'no access'

        if report_permission.trial_balance is False and report_permission.user.admin is False:
            return 'no access'

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