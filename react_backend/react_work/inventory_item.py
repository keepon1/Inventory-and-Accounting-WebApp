from . import models
from decimal import Decimal
from django.core.paginator import Paginator
from django.db.models import Sum
from collections import defaultdict
from django.db import transaction
from django.db.models import Q
import logging

logger = logging.getLogger(__name__)

def fetch_items_for_main_view(business, page, company, search, user, location, page_quantity=30):
    try:
        business_obj = models.bussiness.objects.get(bussiness_name=business, company_id=company)
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
            if search.strip():
                search_filter = (
                    Q(item_name__icontains=search) |
                    Q(code__icontains=search) |
                    Q(category__name__icontains=search) |
                    Q(model__icontains=search) |
                    Q(brand__icontains=search)
                )
                items = items.filter(search_filter)
        
            items = items.order_by(
                'category__name', 'brand', 'item_name'
            ).values(
                'code', 'brand', 'item_name', 'quantity',
                'unit__suffix', 'purchase_price', 'sales_price',
                'category__name', 'model', 'reorder_level'
            )
        else:
            if len(locations_access) < 1:
                logger.warning(f"User '{user}' does not have access to any location")
                return {'status': 'error', 'message': f'{user} does not have access to any location'}

            if not location:
                items = models.location_items.objects.filter(
                    bussiness_name=business_obj,
                    location__location_name=locations_access[0]
                )
            else:
                items = models.location_items.objects.filter(
                    bussiness_name=business_obj,
                    location__location_name=location
                )

            if search.strip():
                search_filter = (
                    Q(item_name__item_name__icontains=search) |
                    Q(item_name__code__icontains=search) |
                    Q(item_name__category__name__icontains=search) |
                    Q(item_name__model__icontains=search) |
                    Q(item_name__brand__icontains=search)
                )
                items = items.filter(search_filter)

            items = items.order_by(
                'item_name__category__name', 'item_name__brand', 'item_name__item_name'
            ).values(
                'item_name__code', 'item_name__brand', 'item_name__item_name', 'quantity',
                'item_name__unit__suffix', 'purchase_price', 'sales_price',
                'item_name__category__name', 'item_name__model', 'reorder_level'
            )
            
            locations = [{'value': i, 'label': i} for i in locations_access]

        if page != 0:
            paginator = Paginator(items, page_quantity)
            current_page = paginator.get_page(page)

            if not (user_query.admin and (not location or location.lower() == 'all locations')):
                items = [
                    {
                        'code': i['item_name__code'],
                        'brand': i['item_name__brand'],
                        'item_name': i['item_name__item_name'],
                        'quantity': i['quantity'],
                        'unit__suffix': i['item_name__unit__suffix'],
                        'purchase_price': i['purchase_price'],
                        'sales_price': i['sales_price'],
                        'category__name': i['item_name__category__name'],
                        'model': i['item_name__model'],
                        'reorder_level': i['reorder_level'],
                    }
                    for i in list(current_page.object_list)
                ]
            else:
                items = list(current_page.object_list)

            result = {"items": items, 'has_more': current_page.has_next(), 'locations': locations}
            logger.info(f"Items fetched for user '{user}' in business '{business}'")
            return {"status": "success", "data": result}
    
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
        business_query = models.bussiness.objects.get(bussiness_name=business, company_id=company)
        
        if not location:
            items_query = models.items.objects.filter(bussiness_name=business_query)
            if search:
                items_query = items_query.filter(item_name__icontains=search)
            items_query = items_query.order_by('item_name')[:30]
            items_query = [
                {
                    'value': i.item_name, 'label': i.item_name,
                    'item_name': i.item_name, 'brand': i.brand, 'code': i.code,
                    'category__name': i.category.name, 'unit__suffix': i.unit.suffix,
                    'model': i.model, 'cost': i.purchase_price, 'price': i.sales_price
                } for i in items_query
            ]
        else:
            location_query = models.inventory_location.objects.get(
                bussiness_name=business_query,
                location_name=location
            )
            items_query = models.location_items.objects.filter(bussiness_name=business_query, location=location_query)
            if search:
                items_query = items_query.filter(item_name__item_name__icontains=search)
            items_query = items_query.order_by('item_name__item_name')[:30]
            items_query = [
                {
                    'value': i.item_name.item_name, 'label': i.item_name.item_name,
                    'item_name': i.item_name.item_name, 'brand': i.item_name.brand,
                    'code': i.item_name.code, 'category__name': i.item_name.category.name,
                    'unit__suffix': i.item_name.unit.suffix, 'model': i.item_name.model,
                    'cost': i.purchase_price, 'price': i.sales_price
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


def verify_item(name, code, image, business, company):
    valid_extensions = ['.jpg', 'png', '.jpeg', 'webp', 'avif']
    
    try:
        business_data = models.bussiness.objects.get(bussiness_name=business, company_id=company)
        if models.items.objects.filter(bussiness_name=business_data, code=code).exists():
            logger.warning(f"Item code '{code}' already exists in business '{business}'")
            return {'status': 'error', 'message': f"Item code '{code}' already exists"}
        
        if models.items.objects.filter(bussiness_name=business_data, item_name=name).exists():
            logger.warning(f"Item name '{name}' already exists in business '{business}'")
            return {'status': 'error', 'message': f"Item name '{name}' already exists"}
            
        if image != 'null':
            if not image.name.lower().endswith(tuple(valid_extensions)):
                logger.warning(f"Invalid image type for item '{name}'")
                return {"status": "error", "message": "Invalid image type"}
        
        logger.info(f"Item '{name}' verified for business '{business}'")
        return {'status': 'success', 'message': 'Item verified successfully'}
    
    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {"status": "error", "message": f"Business '{business}' not found."}
    
    except Exception:
        logger.exception("Unhandled error during item verification")
        return {"status": "error", "message": "Unhandled error during item verification"}


def add_inventory_item(business, user, company, code, name, reorder, model, category, suffix, image, description, brand):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business, company_id=company)
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

                models.items.objects.create(
                    code=code[j],
                    brand=brand[j],
                    item_name=i,
                    model=model[j],
                    description=description[j],
                    reorder_level=float(reorder[j]),
                    quantity=0,
                    purchase_price=0.0,
                    sales_price="0",
                    image=image[j],
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
    valid_extensions = ['.jpg', 'png', '.jpeg', 'webp', 'avif']

    if data['newImage'] != 'null' and data['newImage'] != 'undefined':
        if not data['newImage'].name.lower().endswith(tuple(valid_extensions)):
            logger.warning(f"Invalid image type for item '{data['oldName']}'")
            return {"status": "error", "message": "Invalid image type"}
            
    try:
        business_query = models.bussiness.objects.get(bussiness_name=data['business'], company_id=company)
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

        item = models.items.objects.get(item_name=data['oldName'], bussiness_name=business_query)
        item.brand = data['newBrand']
        item.item_name = data['newName']
        item.code = data['newCode']
        item.description = data['newDescription']
        item.model = data['newModel']
        item.reorder_level = float(data['newReorder'])
        item.image = data['newImage']
        item.unit = unit
        item.category = category

        item.save()

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
