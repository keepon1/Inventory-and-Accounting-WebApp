from . import models
from decimal import Decimal
from django.core.paginator import Paginator
from django.db.models import Q
from django.db import transaction
import logging
import json
from datetime import date as date1, datetime

logger = logging.getLogger(__name__)

def fetch_transfer_main_view(search, date_search, business, company, page, user, page_quantity=30):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)
       
        if not user_query.admin and not user_query.transfer_access:
            return {"status": "error", "message": "User has no access", "data": []}

        transfers = models.inventory_transfer.objects.filter(bussiness_name=business_query)

        if not user_query.admin:
            transfers = transfers.filter(
                Q(from_loc__location_name__in=user_query.per_location_access) |
                Q(to_loc__location_name__in=user_query.per_location_access)
            )

        if search.strip():
            search_filter = (
                Q(description__icontains=search) |
                Q(from_loc__location_name__icontains=search) |
                Q(to_loc__location_name__icontains=search) |
                Q(code__icontains=search) |
                Q(status__icontains=search)
            )
            transfers = transfers.filter(search_filter)
        
        if date_search:
            if date_search.get('type') == 'period':
                start_month = int(date_search.get('start_month', 0))
                end_month = int(date_search.get('end_month', 0))
                if start_month and end_month:
                    transfers = transfers.filter(date__month__gte=start_month, date__month__lte=end_month)

            elif date_search.get('type') == 'date':
                start_date = date_search.get('start_date')
                end_date = date_search.get('end_date')
                if start_date and end_date:
                    transfers = transfers.filter(date__date__range=(start_date, end_date))
        
        transfers = transfers.order_by('-code').values(
            'code', 'created_by__user_name', 'from_loc__location_name',
            'date', 'description', 'total_quantity',
            'to_loc__location_name', 'status'
        )
        
        paginator = Paginator(transfers, page_quantity)
        current_page = paginator.get_page(page)

        return {
            "status": "success",
            "message": "Transfers fetched",
            "data": {"transfer": list(current_page.object_list), "has_more": current_page.has_next()}
        }

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {"status": "error", "message": "Business not found", "data": []}
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return {"status": "error", "message": "User not found", "data": []}
    
    except Exception as error:
        logger.exception('Unhandled error in fetch_transfer_main_view')
        return {"status": "error", "message": "Something went wrong", "data": []}
    

def create_transfer(items, business, user, company, description, date, source, destination):
    try:
        if source.strip() == destination.strip():
            return {"status": "error", "message": "Source and destination cannot be the same"}
        
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)
        source_query = models.inventory_location.objects.get(bussiness_name=business_query, location_name=source)
        destination_query = models.inventory_location.objects.get(bussiness_name=business_query, location_name=destination)

        if not user_query.admin and not user_query.create_access:
            return {"status": "error", "message": "No access to create transfer"}
        
        if not user_query.admin and source not in user_query.per_location_access:
            return {"status": "error", "message": f"No access to source location {source}"}
        
        current_date = datetime.strptime(date, "%Y-%m-%d").date()
        today = date1.today()

        if current_date.month != today.month:
            return {"status": "error", "message": "Cannot post transfer to a different accounting period"}
        
        total = sum([float(str(json.loads(i)['qty'])) for i in items])

        with transaction.atomic():
            p = models.inventory_transfer(bussiness_name=business_query, creation_date=datetime.now())
            new_code = p.generate_next_code()
            transfer = models.inventory_transfer.objects.create(
                code=new_code, date=date, description=description,
                from_loc=source_query, status='Not Received',
                to_loc=destination_query, total_quantity=total,
                created_by=user_query, bussiness_name=business_query
            )

            for i in items:
                i = json.loads(i)
                item = models.location_items.objects.get(
                    bussiness_name=business_query,
                    item_name__item_name=i['name'],
                    location=source_query
                )

                if item.quantity - Decimal(str(i['qty'])) < 0:
                    return {"status": "error", "message": f"Not enough quantity for {i['name']}"}
                
                item.quantity -= Decimal(str(i['qty']))
                item.save()
                models.transfer_history.objects.create(
                    transfer=transfer, item_name=item.item_name,
                    quantity=i['qty'], bussiness_name=business_query
                )
            
            models.tracking_history.objects.create(
                user=user_query, head=new_code,
                area='Create transfer', bussiness_name=business_query
            )

            return {"status": "success", "message": "Transfer created successfully", "data": {'id':new_code, 'status': transfer.status}}

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {"status": "error", "message": f"Business '{business}' not found"}
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return {"status": "error", "message": f"User '{user}' not found"}
    
    except models.inventory_location.DoesNotExist:
        logger.warning(f"Location '{source}' or '{destination}' not found.")
        return {"status": "error", "message": "Invalid source or destination location"}
    
    except Exception as error:
        logger.exception('Unhandled error in create_transfer')
        return {"status": "error", "message": "Something went wrong, please try again"}


def view_transfer(business, transfer_no, company):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        transfer_query = models.inventory_transfer.objects.get(code=transfer_no, bussiness_name=business_query)
        items = models.transfer_history.objects.filter(transfer=transfer_query, bussiness_name=business_query)

        details = {
            'from': transfer_query.from_loc.location_name,
            'number': transfer_query.code,
            'issueDate': transfer_query.date,
            'to': transfer_query.to_loc.location_name,
            'description': transfer_query.description,
            'by': transfer_query.created_by.user_name,
            'total': transfer_query.total_quantity,
            'status': transfer_query.status
        }
        items_data = [
            {
                'name': i.item_name.item_name,
                'brand': i.item_name.brand,
                'code': i.item_name.code,
                'qty': i.quantity,
                'category': i.item_name.category.name,
                'model': i.item_name.model,
                'unit': i.item_name.unit.suffix
            }
            for i in items
        ]

        return {"status": "success", "message": "Transfer details fetched", "data": {"detail": details, "items": items_data}}

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {"status": "error", "message": f"Business '{business}' not found"}
    
    except models.inventory_transfer.DoesNotExist:
        logger.warning(f"Transfer no. '{transfer_no}' not found.")
        return {"status": "error", "message": f"Transfer '{transfer_no}' not found"}
    
    except Exception as error:
        logger.exception('Unhandled error in view_transfer')
        return {"status": "error", "message": "Something went wrong"}


def reject_transfer(business, user, company, number):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not user_query.admin and not user_query.edit_access:
            return {"status": "error", "message": "No access"}
        
        transfer_query = models.inventory_transfer.objects.get(code=number, bussiness_name=business_query)
        history = models.transfer_history.objects.filter(transfer=transfer_query, bussiness_name=business_query)

        if not user_query.admin and transfer_query.to_loc.location_name not in user_query.per_location_access:
            return {"status": "error", "message": "No access to this transfer"}
        
        with transaction.atomic():
            for i in history:
                item = models.location_items.objects.get(
                    bussiness_name=business_query, item_name=i.item_name, location=transfer_query.from_loc
                )
                item.quantity += Decimal(str(i.quantity))
                item.save()
            transfer_query.status = 'Rejected'
            transfer_query.save()

        models.tracking_history.objects.create(
            user=user_query, head=transfer_query.code, area='Reject transfer',
            bussiness_name=business_query
        )
        return {"status": "success", "message": "Transfer rejected"}

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {"status": "error", "message": f"Business '{business}' not found"}
    
    except models.inventory_transfer.DoesNotExist:
        logger.warning(f"Transfer no. '{number}' not found.")
        return {"status": "error", "message": f"Transfer '{number}' not found"}
    
    except Exception as error:
        logger.exception('Unhandled error in reject_transfer')
        return {"status": "error", "message": "Something went wrong"}


def receive_transfer(business, user, company, number):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not user_query.admin and not user_query.edit_access:
            return {"status": "error", "message": "No access"}
        
        transfer_query = models.inventory_transfer.objects.get(code=number, bussiness_name=business_query)
        history = models.transfer_history.objects.filter(transfer=transfer_query, bussiness_name=business_query)

        if not user_query.admin and transfer_query.to_loc.location_name not in user_query.per_location_access:
            return {"status": "error", "message": "No access to this transfer"}

        with transaction.atomic():
            for i in history:
                item = models.location_items.objects.get(
                    bussiness_name=business_query, item_name=i.item_name, location=transfer_query.to_loc
                )
                item.quantity += Decimal(str(i.quantity))
                item.purchase_price = i.item_name.purchase_price
                item.sales_price = i.item_name.sales_price
                item.save()
            transfer_query.status = 'Received'
            transfer_query.save()

        models.tracking_history.objects.create(
            user=user_query, head=transfer_query.code, area='Receive transfer',
            bussiness_name=business_query
        )
        return {"status": "success", "message": "Transfer received"}

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {"status": "error", "message": f"Business '{business}' not found"}
    
    except models.inventory_transfer.DoesNotExist:
        logger.warning(f"Transfer no. '{number}' not found.")
        return {"status": "error", "message": f"Transfer '{number}' not found"}
    
    except Exception as error:
        logger.exception('Unhandled error in receive_transfer')
        return {"status": "error", "message": "Something went wrong"}
