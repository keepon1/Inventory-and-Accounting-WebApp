from . import models
from decimal import Decimal
from django.core.paginator import Paginator
from django.db.models import Sum
from collections import defaultdict
from django.db import transaction
from django.db.models import Q
import logging
import json
from datetime import date, datetime
from .coa import retrive_real_account
from .export_format import PDF, XLSX, CSV

logger = logging.getLogger(__name__)


def fetch_sales_for_main_view(search, date_search, business, company, page, user, format, page_quantity=30):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not user_query.admin and not user_query.sales_access:
            return {"status": "error", "message": "User has no access", "data": []}

        sales = models.sale.objects.filter(bussiness_name=business_query)

        if not user_query.admin:
            sales = sales.filter(location_address__location_name__in=user_query.per_location_access)

        if search and search.strip():
            search_filter = (
                Q(description__icontains=search) |
                Q(location_address__location_name__icontains=search) |
                Q(customer_name__icontains=search) |
                Q(customer_info__name__icontains=search) |
                Q(code__icontains=search) |
                Q(status__icontains=search)
            )
            sales = sales.filter(search_filter)
        
        if date_search:
            if date_search.get('start') and date_search.get('end'):
                start_date = date_search.get('start')
                end_date = date_search.get('end')

                sales = sales.filter(date__range=(start_date, end_date))

        sales = sales.order_by('-code').values(
            'code', 'date', 'customer_name', 'customer_info__name', 'created_by__user_name',
            'description', 'sub_total', 'discount', 'tax_levy', 'gross_total', 'status',
            'location_address__location_name', 'customer_contact', 'customer_info__contact'
        )

        if format.strip():
            if format.lower() == 'pdf':
                exporter = PDF(data=sales, user=user_query, location=None, start=None, end=None)
                export_data = exporter.generate_sales_main_pdf()

                return {
                    "status": "success",
                    "message": "Sales PDF generated",
                    "data": export_data
                }
            
            if format.lower() == 'xlsx':
                exporter = XLSX(data=sales, user=user_query, location=None, start=None, end=None)
                export_data = exporter.generate_sales_main_xlsx()

                return {
                    "status": "success",
                    "message": "Sales XLSX generated",
                    "data": export_data
                }
            
            if format.lower() == 'csv':
                exporter = CSV(data=sales, user=user_query, location=None, start=None, end=None)
                export_data = exporter.generate_sales_main_csv()

                return {
                    "status": "success",
                    "message": "Sales CSV generated",
                    "data": export_data
                }
            

        paginator = Paginator(sales, page_quantity)
        current_page = paginator.get_page(page)

        return {
            "status": "success",
            "message": "Sales fetched",
            "data": {"sales": list(current_page.object_list), "has_more": current_page.has_next()}
        }

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {"status": "error", "message": f"Business '{business}' not found", "data": []}

    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return {"status": "error", "message": f"User '{user}' not found", "data": []}

    except Exception:
        logger.exception("Unhandled error in fetch_sales_for_main_view")
        return {"status": "error", "message": "Something went wrong", "data": []}


def post_and_save_sales(business, user, company, location, data, totals, items, levy, real_levy):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not user_query.admin and not user_query.create_access and not user_query.sales_access:
            return {"status": "error", "message": "User has no access", "data": {}}
        
        if not (user_query.admin or (user_query.date_access and user_query.sales_access)):
            current_date = datetime.strptime(data['date'], "%Y-%m-%d").date()
            today = date.today()

            if current_date < today:
                return {"status": "error", "message": "User has no access to past dates", "data": {}}
            
            if current_date > today:
                return {"status": "error", "message": "User has no access to future dates", "data": {}}

        if not user_query.admin:
            if location not in user_query.per_location_access:
                return {"status": "error", "message": f"User has no access to location '{location}'", "data": {}}

        current_date = datetime.strptime(data['date'], "%Y-%m-%d").date()
        today = date.today()

        if current_date.month != today.month:
            return {"status": "error", "message": "Cannot post to other period", "data": {}}

        try:
            location_query = models.inventory_location.objects.get(bussiness_name=business_query, location_name=location)
        except models.inventory_location.DoesNotExist:
            logger.warning(f"Location '{location}' not found for business '{business}'.")
            return {"status": "error", "message": f"Location '{location}' not found", "data": {}}

        if data.get('terms') == 'Full Payment':
            amount_paid = totals.get('grandTotal', 0)
        elif data.get('terms') == 'Part Payment':
            amount_paid = data.get('partpayment', 0)
        else:
            amount_paid = 0

        with transaction.atomic():
            p = models.sale(bussiness_name=business_query, creation_date=datetime.now())
            new_code = p.generate_next_code()

            if data.get('type') == 'regular':
                try:
                    customer_query = models.customer.objects.get(name='Regular Customer', bussiness_name=business_query)
                except models.customer.DoesNotExist:
                    logger.warning(f"Customer 'Regular Customer' not found for business '{business}'.")
                    return {"status": "error", "message": "Customer 'Regular Customer' not found", "data": {}}

                from_account = customer_query.account
                sale_info = models.sale(
                    code=new_code, created_by=user_query, bussiness_name=business_query,
                    customer_name=data.get('customer', ''), date=data['date'], customer_info=customer_query,
                    due_date=data.get('dueDate', ''), location_address=location_query,
                    discount_percentage=data.get('discount', 0), status=data.get('terms', ''),
                    sub_total=totals.get('subtotal', 0), gross_total=totals.get('grandTotal', 0),
                    payment_term=data.get('terms', ''), type=data.get('type', ''), amount_paid=amount_paid,
                    discount=totals.get('discountAmount', 0), net_total=totals.get('netTotal', 0),
                    tax_levy=totals.get('levyAmount', 0), tax_levy_types=levy, customer_contact=data.get('contact', '')
                )
            elif data.get('type') == 'registered':
                try:
                    customer_query = models.customer.objects.get(name=data.get('customer', ''), bussiness_name=business_query)
                except models.customer.DoesNotExist:
                    logger.warning(f"Customer '{data.get('customer', '')}' not found for business '{business}'.")
                    return {"status": "error", "message": f"Customer '{data.get('customer', '')}' not found", "data": {}}

                from_account = customer_query.account
                sale_info = models.sale(
                    code=new_code, created_by=user_query, bussiness_name=business_query,
                    customer_info=customer_query, date=data['date'], amount_paid=amount_paid,
                    due_date=data.get('dueDate', ''), location_address=location_query,
                    discount_percentage=data.get('discount', 0), status=data.get('terms', ''),
                    description=data.get('description', ''), sub_total=totals.get('subtotal', 0),
                    gross_total=totals.get('grandTotal', 0), payment_term=data.get('terms', ''),
                    discount=totals.get('discountAmount', 0), net_total=totals.get('netTotal', 0),
                    tax_levy=totals.get('levyAmount', 0), tax_levy_types=levy, type=data.get('type', '')
                )
            else:
                logger.error("Invalid sale type supplied.")
                return {"status": "error", "message": "Must select sales type", "data": {}}

            cogs = Decimal("0")
            total_sales = 0.0
            total_quantity = 0.0
            histories = []

            for raw_item in items:
                try:
                    item = json.loads(raw_item)
                except Exception:
                    logger.exception("Failed to parse item JSON.")
                    return {"status": "error", "message": f"Invalid item format: {raw_item}", "data": {}}

                try:
                    item_info = models.items.objects.get(item_name=item['name'], bussiness_name=business_query)
                except models.items.DoesNotExist:
                    logger.warning(f"Item '{item.get('name', '')}' not found for business '{business}'.")
                    return {"status": "error", "message": f"Item '{item.get('name', '')}' not found", "data": {}}
                
                try:
                    loc_item = models.location_items.objects.get(item_name=item_info, location=location_query, bussiness_name=business_query)
                    
                except models.location_items.DoesNotExist:
                    logger.warning(f"Location item for '{item.get('name', '')}' not found at location '{location}'.")
                    return {"status": "error", "message": f"Item '{item.get('name', '')}' not found in location '{location}'", "data": {}}

                if loc_item.item_name.is_active is False:
                    logger.warning(f"Item '{item.get('name', '')}' is inactive.")
                    return {"status": "error", "message": f"Item '{item_info.item_name}' is inactive", "data": {}}

                if (loc_item.quantity - Decimal(str(item['qty']))) < 0:
                    logger.warning(f"Insufficient stock for item '{item.get('name', '')}'.")
                    return {"status": "error", "message": f"{item_info.item_name} does not have enough quantity at {location}", "data": {}}
                
                else:
                    item_info.quantity -= int(item['qty'])
                    item_info.last_sales = data['date']

                    cogs += Decimal(str(item['qty'])) * item_info.purchase_price
                    total_quantity += float(item['qty'])
                    total_sales += float(item['qty']) * float(item['price'])
                    
                    histories.append({
                        "item_name": item_info,
                        "quantity": item['qty'],
                        "sales_price": item['price'],
                        "purchase_price": item_info.purchase_price,
                        "bussiness_name": business_query,
                    })

                    loc_item.quantity -= Decimal(str(item['qty']))
                    loc_item.purchase_price = Decimal(str(item_info.purchase_price))
                    loc_item.last_sales = data['date']
                    item_info.save()
                    loc_item.save()

            sale_info.total_quantity = Decimal(str(total_quantity))
            sale_info.cog = cogs
            sale_info.save()

            sale_histories = [
                models.sale_history(
                    sales=sale_info,
                    **h
                )
                for h in histories
            ]
            models.sale_history.objects.bulk_create(sale_histories)

            discount = total_sales * (float(data.get('discount', 0)) / 100.0)
            taxable_amount = total_sales - discount
            tax = 0.0
            for levy_item in real_levy:
                tax += taxable_amount * (levy_item.get('rate', 0.0) / 100.0)
            final_total = taxable_amount + tax

            accounts = {
                'inventory': 10301,
                'tax': 20301,
                'payment': str(data.get('account', '')).split()[0] if data.get('account') else None,
                'receivable': 10401,
                'revenue': 40101,
                'cog': 50101,
                'discount': 50801
            }

            result = retrive_real_account(code_map=accounts, business=business, company=company).get_real_accounts()

            head = models.journal_head.objects.create(
                entry_type="Sale", transaction_number=new_code, amount=final_total,
                created_by=user_query, bussiness_name=business_query, description=data.get('description', '')
            )

            models.journal.objects.create(
                entry_type="Sale",
                description=f'Crediting Inventory with {new_code} Amount',
                credit=10300, head=head, amount=cogs, bussiness_name=business_query,
                date=data['date'], transaction_number=new_code
            )

            models.asset_ledger.objects.create(
                bussiness_name=business_query, period=result.get('period'),
                account=result.get('inventory'), transaction_number=new_code, date=data['date'],
                type="Sale", description=data.get('description', ''), credit=cogs, head=head
            )

            models.journal.objects.create(
                entry_type="Sale",
                description=f'Debiting COGS with {new_code} Amount',
                debit=50100, head=head, amount=cogs, bussiness_name=business_query,
                date=data['date'], transaction_number=new_code
            )

            models.expenses_ledger.objects.create(
                bussiness_name=business_query, period=result.get('period'),
                account=result.get('cog'), transaction_number=new_code, date=data['date'],
                type="Sales", description=data.get('description', ''), debit=cogs, head=head
            )

            models.journal.objects.create(
                entry_type="Sale",
                description=f'Crediting Sales Account with {new_code} Amount',
                credit=40100, head=head, amount=total_sales, bussiness_name=business_query,
                date=data['date'], transaction_number=new_code
            )

            models.revenue_ledger.objects.create(
                bussiness_name=business_query, period=result.get('period'),
                account=result.get('revenue'), transaction_number=new_code, date=data['date'],
                type="Sale", description=data.get('description', ''), credit=total_sales, head=head
            )

            models.journal.objects.create(
                entry_type="Sale",
                description=f'Debiting {customer_query.name} for {new_code} on credit',
                debit=customer_query.account, head=head, amount=final_total,
                bussiness_name=business_query, date=data['date'], transaction_number=new_code
            )

            models.asset_ledger.objects.create(
                bussiness_name=business_query, period=result.get('period'),
                account=result.get('receivable'), transaction_number=new_code, date=data['date'],
                type="Sale", description=data.get('description', ''), debit=final_total, head=head
            )

            models.customer_ledger.objects.create(
                bussiness_name=business_query, period=result.get('period'),
                account=customer_query, transaction_number=new_code, date=data['date'],
                type="Sale", description=data.get('description', ''), debit=final_total, head=head
            )

            if customer_query.debit is None:
                customer_query.debit = Decimal("0")
            customer_query.debit += Decimal(str(final_total))
            customer_query.save()

            if data.get('terms') == 'Full Payment':
                cash = models.cash_receipt.objects.create(
                    transaction_number=new_code,
                    description=f"payment of {new_code} from {from_account}",
                    to_account=(data.get('account', '').split())[0] if data.get('account') else None,
                    from_account=from_account,
                    bussiness_name=business_query,
                    amount=final_total,
                    created_by=user_query,
                    status='None',
                    ref_type='sales',
                    external_no=new_code
                )

                models.journal.objects.create(
                    entry_type="Cash Receipt",
                    description=f'Debiting Account used to receive the payment of {new_code}',
                    debit=(data.get('account', '').split())[0] if data.get('account') else None,
                    head=head, amount=cash.amount, bussiness_name=business_query,
                    date=data['date'], transaction_number=new_code
                )

                models.asset_ledger.objects.create(
                    bussiness_name=business_query, period=result.get('period'),
                    account=result.get('payment'), transaction_number=new_code, date=data['date'],
                    type="Cash Receipt", description=data.get('description', ''), debit=cash.amount, head=head
                )

                models.journal.objects.create(
                    entry_type="Cash Receipt",
                    description=f'Crediting {customer_query.name} for payment of {new_code}',
                    credit=customer_query.account, head=head, amount=cash.amount,
                    bussiness_name=business_query, date=data['date'], transaction_number=new_code
                )

                models.asset_ledger.objects.create(
                    bussiness_name=business_query, period=result.get('period'),
                    account=result.get('receivable'), transaction_number=new_code, date=data['date'],
                    type="Cash Receipt", description=data.get('description', ''), credit=cash.amount, head=head
                )

                models.customer_ledger.objects.create(
                    bussiness_name=business_query, period=result.get('period'),
                    account=customer_query, transaction_number=new_code, date=data['date'],
                    type="Cash Receipt", description=data.get('description', ''), credit=cash.amount, head=head
                )

                if customer_query.credit is None:
                    customer_query.credit = Decimal("0")
                customer_query.credit += Decimal(str(cash.amount))
                customer_query.save()

                if discount != 0:
                    models.journal.objects.create(
                        entry_type="Sale", description=data.get('description', ''), debit=50800, head=head,
                        amount=discount, bussiness_name=business_query, date=data['date'], transaction_number=new_code
                    )

                    models.expenses_ledger.objects.create(
                        bussiness_name=business_query, period=result.get('period'),
                        account=result.get('discount'), transaction_number=new_code, date=data['date'],
                        type="Sale", description=data.get('description', ''), debit=discount, head=head
                    )

                if tax != 0:
                    models.journal.objects.create(
                        entry_type="Sale", description=data.get('description', ''), credit=20300, head=head,
                        amount=tax, bussiness_name=business_query, date=data['date'], transaction_number=new_code
                    )

                    models.liabilities_ledger.objects.create(
                        bussiness_name=business_query, period=result.get('period'),
                        account=result.get('tax'), transaction_number=new_code, date=data['date'],
                        type="Sales", description=data.get('description', ''), credit=tax, head=head
                    )

            elif data.get('terms') == 'Credit':
                if tax != 0:
                    models.journal.objects.create(
                        entry_type="Sale", description=data.get('description', ''), credit=20300, head=head,
                        amount=tax, bussiness_name=business_query, date=data['date'], transaction_number=new_code
                    )

                    models.liabilities_ledger.objects.create(
                        bussiness_name=business_query, period=result.get('period'),
                        account=result.get('tax'), transaction_number=new_code, date=data['date'],
                        type="Sales", description=data.get('description', ''), credit=tax, head=head
                    )

            elif data.get('terms') == 'Part Payment':
                cash = models.cash_receipt.objects.create(
                    transaction_number=new_code,
                    description=f"part payment of {new_code} from {from_account}",
                    to_account=(data.get('account', '').split('-'))[0] if data.get('account') else None,
                    from_account=from_account,
                    bussiness_name=business_query,
                    amount=data.get('partpayment', 0),
                    created_by=user_query,
                    status='None',
                    ref_type='sales',
                    external_no=new_code
                )

                models.journal.objects.create(
                    entry_type="Cash Receipt",
                    description=f'Debiting Account used to receive the part payment of {new_code}',
                    debit=(data.get('account', '').split('-'))[0] if data.get('account') else None,
                    head=head, amount=cash.amount, bussiness_name=business_query,
                    date=data['date'], transaction_number=new_code
                )

                models.asset_ledger.objects.create(
                    bussiness_name=business_query, period=result.get('period'),
                    account=result.get('payment'), transaction_number=new_code, date=data['date'],
                    type="Cash Receipt", description=data.get('description', ''), debit=cash.amount, head=head
                )

                models.journal.objects.create(
                    entry_type="Cash Receipt",
                    description=f'Crediting {customer_query.name} for part payment of {new_code}',
                    credit=customer_query.account, head=head, amount=cash.amount,
                    bussiness_name=business_query, date=data['date'], transaction_number=new_code
                )

                models.asset_ledger.objects.create(
                    bussiness_name=business_query, period=result.get('period'),
                    account=result.get('receivable'), transaction_number=new_code, date=data['date'],
                    type="Cash Receipt", description=data.get('description', ''), credit=cash.amount, head=head
                )

                models.customer_ledger.objects.create(
                    bussiness_name=business_query, period=result.get('period'),
                    account=customer_query, transaction_number=new_code, date=data['date'],
                    type="Cash Receipt", description=data.get('description', ''), credit=cash.amount, head=head
                )

                if customer_query.credit is None:
                    customer_query.credit = Decimal("0")
                customer_query.credit += Decimal(str(cash.amount))
                customer_query.save()

                if discount != 0:
                    models.journal.objects.create(
                        entry_type="Sale", description=data.get('description', ''), debit=50800, head=head,
                        amount=discount, bussiness_name=business_query, date=data['date'], transaction_number=new_code
                    )

                    models.expenses_ledger.objects.create(
                        bussiness_name=business_query, period=result.get('period'),
                        account=result.get('discount'), transaction_number=new_code, date=data['date'],
                        type="Sale", description=data.get('description', ''), debit=discount, head=head
                    )

                if tax != 0:
                    models.journal.objects.create(
                        entry_type="Sale", description=data.get('description', ''), credit=20300, head=head,
                        amount=tax, bussiness_name=business_query, date=data['date'], transaction_number=new_code
                    )

                    models.liabilities_ledger.objects.create(
                        bussiness_name=business_query, period=result.get('period'),
                        account=result.get('tax'), transaction_number=new_code, date=data['date'],
                        type="Sales", description=data.get('description', ''), credit=tax, head=head
                    )

        models.tracking_history.objects.create(user=user_query, head=new_code, area='Create Sales', bussiness_name=business_query)

        return {"status": "success", "message": "Sales created successfully", "data": {"code": new_code, "address": business_query.address, "phone": business_query.telephone, "email": business_query.email, 'time': sale_info.creation_date.strftime('%H:%M:%S')}}

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {"status": "error", "message": f"Business '{business}' not found", "data": {}}

    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return {"status": "error", "message": f"User '{user}' not found", "data": {}}

    except Exception:
        logger.exception("Unhandled error in post_and_save_sales")
        return {"status": "error", "message": "Something went wrong, please try again", "data": {}}


def reverse_sales(business, user, company, number):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not user_query.admin and not user_query.reverse_access:
            return {"status": "error", "message": "No access", "data": {}}

        try:
            sale = models.sale.objects.get(code=number, bussiness_name=business_query)
        except models.sale.DoesNotExist:
            logger.warning(f"Sales no. '{number}' not found for business '{business}'.")
            return {"status": "error", "message": f"Sales no. '{number}' not found", "data": {}}

        if sale.is_reversed:
            return {"status": "error", "message": "Already reversed", "data": {}}
    

        history = models.sale_history.objects.filter(sales=sale, bussiness_name=business_query)

        with transaction.atomic():
            for entry in history:
                item = entry.item_name
                item.quantity += entry.quantity
                item.save()

                try:
                    loc_item = models.location_items.objects.get(item_name=item, location=sale.location_address, bussiness_name=business_query)
                except models.location_items.DoesNotExist:
                    logger.warning(f"Location item '{item.item_name}' not found at location '{sale.location_address}'.")
                    return {"status": "error", "message": f"Location item '{item.item_name}' not found at sale's location", "data": {}}

                loc_item.quantity += Decimal(str(entry.quantity))
                loc_item.save()

            try:
                if sale.type.lower() == 'regular':
                    customer = models.customer.objects.filter(name='Regular Customer', bussiness_name=business_query).first()

                else:
                    customer = models.customer.objects.filter(pk=sale.customer_info.pk, bussiness_name=business_query).first()

                if customer is not None:                  
                    if customer.credit is None:
                        customer.credit = Decimal("0")
                    customer.credit += sale.gross_total
                    customer.save()

                else:
                    logger.warning(f"Customer is None while reversing sale '{number}'.")
                    return {"status": "error", "message": f"Customer not found while reversing sale '{number}'", "data": {}}

            except models.customer.DoesNotExist:
                logger.warning(f"Customer '{sale.customer_name.strip() or sale.customer_info.name}' not found while reversing sale '{number}'.")
                return {"status": "error", "message": f"Customer {sale.customer_name.strip() or sale.customer_info.name} not found", "data": {}}

            journal_head_entries = models.journal_head.objects.filter(transaction_number=sale.code, bussiness_name=business_query)
            for head in journal_head_entries:
                head.entry_type = f'{head.entry_type} - Reversed'
                head.reversed = True
                head.save()

            journal_entries = models.journal.objects.filter(transaction_number=sale.code, bussiness_name=business_query)
            for j in journal_entries:
                models.journal.objects.create(
                    entry_type="Reversal",
                    description=f'Rev - {j.description}',
                    debit=j.credit,
                    credit=j.debit,
                    amount=j.amount,
                    bussiness_name=business_query,
                    date=date.today(),
                    transaction_number=f'Rev - {j.transaction_number}',
                    head=j.head
                )

            asset_entries = models.asset_ledger.objects.filter(transaction_number=sale.code, bussiness_name=business_query)
            for a in asset_entries:
                models.asset_ledger.objects.create(
                    bussiness_name=business_query,
                    account=a.account,
                    period=a.period,
                    transaction_number=f'Rev - {a.transaction_number}',
                    date=date.today(),
                    type="Reversal",
                    description=f'Rev - {a.description}',
                    debit=a.credit,
                    credit=a.debit,
                    head=a.head
                )

            liabilities_entries = models.liabilities_ledger.objects.filter(transaction_number=sale.code, bussiness_name=business_query)
            for l in liabilities_entries:
                models.liabilities_ledger.objects.create(
                    bussiness_name=business_query,
                    account=l.account,
                    period=l.period,
                    transaction_number=f'Rev - {l.transaction_number}',
                    date=date.today(),
                    type="Reversal",
                    description=f'Rev - {l.description}',
                    debit=l.credit,
                    credit=l.debit,
                    head=l.head
                )

            revenue_entries = models.revenue_ledger.objects.filter(transaction_number=sale.code, bussiness_name=business_query)
            for r in revenue_entries:
                models.revenue_ledger.objects.create(
                    bussiness_name=business_query,
                    account=r.account,
                    period=r.period,
                    transaction_number=f'Rev - {r.transaction_number}',
                    date=date.today(),
                    type="Reversal",
                    description=f'Rev - {r.description}',
                    debit=r.credit,
                    credit=r.debit,
                    head=r.head
                )

            expense_entries = models.expenses_ledger.objects.filter(transaction_number=sale.code, bussiness_name=business_query)
            for ex in expense_entries:
                models.expenses_ledger.objects.create(
                    bussiness_name=business_query,
                    account=ex.account,
                    period=ex.period,
                    transaction_number=f'Rev - {ex.transaction_number}',
                    date=date.today(),
                    type="Reversal",
                    description=f'Rev - {ex.description}',
                    debit=ex.credit,
                    credit=ex.debit,
                    head=ex.head
                )

            customer_entries = models.customer_ledger.objects.filter(transaction_number=sale.code, bussiness_name=business_query)
            for ce in customer_entries:
                models.customer_ledger.objects.create(
                    bussiness_name=business_query,
                    account=ce.account,
                    period=ce.period,
                    transaction_number=f'Rev - {ce.transaction_number}',
                    date=date.today(),
                    type="Reversal",
                    description=f'Rev - {ce.description}',
                    debit=ce.credit,
                    credit=ce.debit,
                    head=ce.head
                )

            payments = models.cash_receipt.objects.filter(transaction_number=sale.code, bussiness_name=business_query, is_reversed=False)
            for pay in payments:
                pay.status = "Reversed"
                pay.is_reversed = True
                pay.save()

            total_paid = sum(p.amount for p in payments)
            if customer is not None:
                customer = models.customer.objects.get(pk=customer.pk, bussiness_name=business_query)
                if customer.debit is None:
                    customer.debit = Decimal("0")
                customer.debit += Decimal(str(total_paid))
                customer.save()
            else:
                logger.warning("Customer is None while processing reversal payments.")
                return {"status": "error", "message": "Customer not found during reversal", "data": {}}

            sale.status = 'Reversed'
            sale.is_reversed = True
            sale.save()

        models.tracking_history.objects.create(user=user_query, head=sale.code, area='Reverse sales', bussiness_name=business_query)
        return {"status": "success", "message": f"Sale invoice {number} reversed", "data": {"code": sale.code}}

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {"status": "error", "message": f"Business '{business}' not found", "data": {}}

    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return {"status": "error", "message": f"User '{user}' not found", "data": {}}

    except ValueError as ve:
        logger.warning(str(ve))
        return {"status": "error", "message": "Data not match", "data": {}}

    except Exception:
        logger.exception("Unhandled error in reverse_sales")
        return {"status": "error", "message": "Something went wrong", "data": {}}
