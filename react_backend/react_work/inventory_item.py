from re import T
from . import models
from decimal import Decimal
from django.core.paginator import Paginator
from django.db.models import Sum, Q, F
from collections import defaultdict
from django.db import transaction
from django.db.models import Q
import logging
from . import export_format

logger = logging.getLogger(__name__)

def fetch_items_for_main_view(business, page, company, search, user, location, format, count,category, brand, page_quantity=30):
    try:
        business_obj = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_obj, user_name=user)

        if not user_query.item_access and not user_query.admin:
            logger.warning(f"User '{user}' does not have access to view items")
            return {'status': 'error', 'message': f'{user} does not have access to view items'}
        
        if not user_query.admin:
            locations_access = user_query.per_location_access
        else:
            locations = [{'value': 'All Locations', 'label': 'All Locations'}]
            location_query = models.inventory_location.objects.filter(bussiness_name=business_obj)
            locations.extend([{'value': i.location_name, 'label': i.location_name} for i in location_query])
            locations_access = ['All Locations']
            locations_access.extend([loc.location_name for loc in location_query])
           
        if user_query.admin and (not location or location.lower() == 'all locations'):

            items = models.items.objects.filter(bussiness_name=business_obj)

            if count:
                items = items.filter(quantity__gt=0)

            if category and category.lower() != 'all categories':
                items = items.filter(category__name=category)

            if brand and brand.lower() != 'all brands':
                items = items.filter(brand__name=brand)

            if search.strip():
                search_filter = (
                    Q(item_name__icontains=search) |
                    Q(code__icontains=search) |
                    Q(category__name__icontains=search) |
                    Q(model__icontains=search) |
                    Q(brand__name__icontains=search)
                )
                items = items.filter(search_filter)
        
            items = items.order_by(
                '-is_active','category__name', 'brand__name', 'item_name'
            ).values(
                'code', 'brand__name', 'item_name', 'quantity',
                'unit__suffix', 'purchase_price', 'sales_price',
                'category__name', 'model', 'reorder_level', 'is_active'
            )
        else:
            if len(locations_access) < 1:
                logger.warning(f"User '{user}' does not have access to any location")
                return {'status': 'error', 'message': f'{user} does not have access to any location'}

            if not location:
                items = models.location_items.objects.filter(
                    bussiness_name=business_obj,
                    location__location_name=locations_access[0],
                )

            else:
                items = models.location_items.objects.filter(
                    bussiness_name=business_obj,
                    location__location_name=location
                )

            if count:
                items = items.filter(quantity__gt=0)

            if category and category.lower() != 'all categories':
                items = items.filter(item_name__category__name=category)

            if brand and brand.lower() != 'all brands':
                items = items.filter(item_name__brand__name=brand)

            if search.strip():
                search_filter = (
                    Q(item_name__item_name__icontains=search) |
                    Q(item_name__code__icontains=search) |
                    Q(item_name__category__name__icontains=search) |
                    Q(item_name__model__icontains=search) |
                    Q(item_name__brand__name__icontains=search)
                )
                items = items.filter(search_filter)

            items = items.order_by(
                '-item_name__is_active','item_name__category__name', 'item_name__brand__name', 'item_name__item_name'
            ).annotate(
                code=F('item_name__code'),
                brand__name=F('item_name__brand__name'),
                item_name_1=F('item_name__item_name'),
                unit__suffix=F('item_name__unit__suffix'),
                category__name=F('item_name__category__name'),
                model=F('item_name__model'),
                is_active=F('item_name__is_active'),
            ).values(
                'code', 'brand__name', 'item_name', 'quantity',
                'unit__suffix', 'purchase_price', 'sales_price',
                'category__name', 'model', 'reorder_level', 'is_active', 'item_name_1'
            )
            
            locations = [{'value': i, 'label': i} for i in locations_access]

        if page != 0 and not format:
            paginator = Paginator(items, page_quantity)
            current_page = paginator.get_page(page)

            
            items = list(current_page.object_list)

            cagetories = [{'value': 'All Categories', 'label': 'All Categories'}]
            category_query = models.inventory_category.objects.filter(bussiness_name=business_obj).order_by('name')
            cagetories.extend([{'value': i.name, 'label': i.name} for i in category_query])

            brands = [{'value': 'All Brands', 'label': 'All Brands'}]
            brand_query = models.inventory_brand.objects.filter(bussiness_name=business_obj).order_by('name')
            brands.extend([{'value': i.name, 'label': i.name} for i in brand_query])

            result = {"items": items, 'has_more': current_page.has_next(), 'locations': locations, 
                      'categories': cagetories, 'brands': brands}
            logger.info(f"Items fetched for user '{user}' in business '{business}'")
            return {"status": "success", "data": result}

        else:

            if format == 'csv':
                export = export_format.CSV(data=items, location=location, start=None, end=None, user=user_query).generate_item_csv()
                return {"status": "success", "data": export}
            
            if format == 'excel':
                export = export_format.XLSX(data=items, location=location, start=None, end=None, user=user_query).generate_item_xlsx()
                return {"status": "success", "data": export}
            
            if format == 'pdf':
                export = export_format.PDF(data=items, location=location, start=None, end=None, user=user_query).generate_item_pdf()
                return {"status": "success", "data": export}

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {"status": "error", "message": f"Business '{business}' not found."}
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return {"status": "error", "message": f"User '{user}' not found."}
    
    except ValueError as value:
        logger.info(f"ValueError: {value}")
        return {"status": "error", "message": str(value)}
    
    except Exception as error:
        logger.exception('Unhandled error in fetch_items_for_main_view')
        return {"status": "error", "message": 'Something went wrong'}


def fetch_items_for_select(business, user, company, search, location):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        
        if not location:
            items_query = models.items.objects.filter(bussiness_name=business_query)
            if search:
                items_query = items_query.filter(item_name__icontains=search)
            items_query = items_query.order_by('item_name')[:30]
            items_query = [
                {
                    'value': i.item_name, 'label': i.item_name,
                    'item_name': i.item_name, 'brand': i.brand.name if i.brand else '', 'code': i.code,
                    'category__name': i.category.name, 'unit__suffix': i.unit.suffix,
                    'model': i.model, 'cost': i.purchase_price, 'price': i.sales_price,
                    'is_active': i.is_active
                } for i in items_query
            ]
        else:
            
            location_query = models.inventory_location.objects.filter(
                bussiness_name=business_query,
                location_name=location
            ).first()

            if location_query is None:
                logger.warning(f"Location '{location}' not found in business '{business}'")
                return {"status": "error", "message": f"Location '{location}' not found.", "data": []}
            
            items_query = models.location_items.objects.filter(bussiness_name=business_query, location=location_query)
            if search:
                items_query = items_query.filter(item_name__item_name__icontains=search)

            items_query = items_query.order_by('item_name__item_name')[:30]
            
            items_query = [
                {
                    'value': i.item_name.item_name, 'label': i.item_name.item_name,
                    'item_name': i.item_name.item_name, 'brand': i.item_name.brand.name if i.item_name.brand else '',
                    'code': i.item_name.code, 'category__name': i.item_name.category.name,
                    'unit__suffix': i.item_name.unit.suffix, 'model': i.item_name.model,
                    'cost': i.purchase_price, 'price': i.sales_price, 'is_active': i.item_name.is_active
                } for i in items_query
            ]
        
        logger.info(f"Select items fetched for user '{user}' in business '{business}'")
        return {"status": "success", "data": items_query}

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {"status": "error", "message": f"Business '{business}' not found."}
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found")
        return {"status": "error", "message": f"User '{user}' not found."}
    
    except Exception:
        logger.exception("Unhandled error during item select fetch")
        return {"status": "error", "message": "Unhandled error during item fetch"}


def verify_item(name, business):
    
    try:
        business_data = models.bussiness.objects.get(bussiness_name=business)
        
        if models.items.objects.filter(bussiness_name=business_data, item_name=name).exists():
            logger.warning(f"Item name '{name}' already exists in business '{business}'")
            return {'status': 'error', 'message': f"Item name '{name}' already exists"}
       
        return {'status': 'success', 'message': 'Item verified successfully'}
    
    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {"status": "error", "message": f"Business '{business}' not found."}
    
    except Exception:
        logger.exception("Unhandled error during item verification")
        return {"status": "error", "message": "Unhandled error during item verification"}


def add_inventory_item(business, user, price, name, reorder, model, category, suffix, status, description, brand):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not user_query.admin and not user_query.create_access:
            logger.warning(f"User '{user}' does not have permission to create items")
            return {"status": "error", "message": f"{user} does not have permission to create items"}
        
        with transaction.atomic(using='default', durable=False, savepoint=False):
            for j, i in enumerate(name):

                if models.items.objects.filter(item_name=i, bussiness_name=business_query).exists():
                    logger.warning(f"Item '{i}' already exists in business '{business}'")
                    raise ValueError(f"Item '{i}' already exists")

                unit_query = models.inventory_unit.objects.get(suffix=suffix[j], bussiness_name=business_query)
                category_query = models.inventory_category.objects.get(name=category[j], bussiness_name=business_query)
                brand_query = models.inventory_brand.objects.filter(name=brand[j], bussiness_name=business_query).first()

                models.items.objects.create(
                    brand=brand_query,
                    item_name=i.strip(),
                    model=model[j],
                    description=description[j],
                    reorder_level=float(reorder[j]),
                    quantity=0,
                    purchase_price=0.0,
                    sales_price=price[j] if price[j] else 0.0,
                    is_active= True if status[j].lower() == 'active' else False,
                    created_by=user_query,
                    bussiness_name=business_query,
                    category=category_query,
                    unit=unit_query,
                )

                models.tracking_history.objects.create(
                    user=user_query,
                    area=f'Created item: {i}',
                    head='Item creation',
                    bussiness_name=business_query
                )

            logger.info(f"{len(name)} items successfully added by '{user}' in business '{business}'")
            return {"status": "success", "message": f"{len(name)} items successfully added"}
        
    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {"status": "error", "message": f"Business '{business}' not found."}
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found")
        return {"status": "error", "message": f"User '{user}' not found."}
    
    except models.inventory_unit.DoesNotExist:
        logger.warning(f"Unit '{suffix[j]}' not found")
        return {"status": "error", "message": f"Unit '{suffix[j]}' not found"}
    
    except models.inventory_category.DoesNotExist:
        logger.warning(f"Category '{category[j]}' not found")
        return {"status": "error", "message": f"Category '{category[j]}' not found"}
    
    except ValueError as e:
        logger.warning(f"Value error while processing item: {e}")
        return {"status": "error", "message": str(e)}
    
    except Exception:
        logger.exception('Unhandled error during item creation')
        return {"status": "error", "message": "Unhandled error during item creation"}


def update_item(data, company):
            
    try:
        business_query = models.bussiness.objects.get(bussiness_name=data['business'])
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=data['user'])

        if not user_query.admin and not user_query.edit_access:
            logger.warning(f"User '{user_query.user_name}' does not have access to edit items")
            return {'status': 'error', 'message': f'{user_query.user_name} does not have access to edit items'}

        if models.items.objects.filter(bussiness_name=business_query, code=data['newCode']).exclude(code=data['oldCode']).exists():
            logger.warning(f"Item code '{data['newCode']}' already exists in business '{data['business']}'")
            return {"status": "error", "message": "Item code already exists"}
        
        if models.items.objects.filter(bussiness_name=business_query, item_name=data['newName']).exclude(item_name=data['oldName']).exists():
            logger.warning(f"Item name '{data['newName']}' already exists in business '{data['business']}'")
            return {"status": "error", "message": "Item name already exists"}
        
        unit = models.inventory_unit.objects.get(suffix=data['newUnit'], bussiness_name=business_query)
        category = models.inventory_category.objects.get(name=data['newCategory'], bussiness_name=business_query)
        brand = models.inventory_brand.objects.filter(name=data['newBrand'], bussiness_name=business_query).first()

        item = models.items.objects.get(item_name=data['oldName'], bussiness_name=business_query)
        item.brand = brand
        item.item_name = data['newName']
        item.sales_price = Decimal(str(data['newPrice'])) if data['newPrice'] else Decimal('0.0')
        item.description = data['newDescription']
        item.model = data['newModel']
        item.reorder_level = float(data['newReorder'])
        item.is_active = True if data['status'] == 'active' else False
        item.unit = unit
        item.category = category

        item.save()

        location_items = models.location_items.objects.filter(item_name=item, bussiness_name=business_query)
        for loc_item in location_items:
            loc_item.sales_price = item.sales_price
            loc_item.save()

        models.tracking_history.objects.create(
            user=user_query,
            area=f'Edited {item.item_name}',
            head='Item edit',
            bussiness_name=business_query
        )

        logger.info(f"Item '{item.item_name}' updated successfully in business '{data['business']}'")
        return {"status": "success", "message": "Item updated successfully"}
    
    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{data['business']}' not found.")
        return {"status": "error", "message": f"Business '{data['business']}' not found."}
    
    except models.inventory_unit.DoesNotExist:
        logger.warning(f"Unit '{data['newUnit']}' not found")
        return {"status": "error", "message": f"Unit '{data['newUnit']}' not found"}
    
    except models.inventory_category.DoesNotExist:
        logger.warning(f"Category '{data['newCategory']}' not found")
        return {"status": "error", "message": f"Category '{data['newCategory']}' not found"}
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{data['user']}' not found")
        return {"status": "error", "message": f"User '{data['user']}' not found."}
    
    except models.items.DoesNotExist:
        logger.warning(f"Item '{data['oldName']}' not found")
        return {"status": "error", "message": f"Item '{data['oldName']}' not found"}
    
    except ValueError as e:
        logger.warning(f"Value error while processing item update: {e}")
        return {"status": "error", "message": str(e)}
    
    except Exception:
        logger.exception('Unhandled error during item update')
        return {"status": "error", "message": "Unhandled error during item update"}
