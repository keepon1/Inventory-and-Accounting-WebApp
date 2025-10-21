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

logger = logging.getLogger(__name__)

def fetch_purchase_for_main_view(search, date_search, business, company, page, user, page_quantity=30):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)
       
        if not user_query.admin and not user_query.purchase_access:
            return {'status': 'error', 'message': f'User {user} has no access'}

        purchase = models.purchase.objects.filter(bussiness_name=business_query)

        if not user_query.admin:
            purchase = purchase.filter(location_address__location_name__in=user_query.per_location_access)

        if search.strip():
            search_filter= (
                Q(description__icontains=search) |
                Q(location_address__location_name__icontains=search) |
                Q(supplier__name__icontains=search) |
                Q(code__icontains=search) |
                Q(status__icontains=search)
            )

            purchase = purchase.filter(search_filter)
        
        if date_search:

            if date_search.get('start') and date_search.get('end'):
                start_date = date_search.get('start')
                end_date = date_search.get('end')

                purchase = purchase.filter(date__range=(start_date, end_date))
        
        purchase = purchase.order_by('-code').values(
            'code', 'date', 'supplier__name', 'created_by__user_name', 'description', 'sub_total', 'discount', 'tax_levy', 'gross_total', 'status',
            'location_address__location_name'
        )
        
        paginator = Paginator(purchase, page_quantity)
        current_page = paginator.get_page(page)

        result = {'purchases':list(current_page.object_list), 'has_more':current_page.has_next()}

        return {'status': 'success', 'data': result}

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {'status': 'error', 'message': f'Business {business} not found'}
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return {'status': 'error', 'message': f'User {user} not found'}
    
    except Exception as error:
        logger.exception(error)
        return {'status': 'error', 'message': 'something happened'}
    
def post_and_save_purchase(business, user, company, location, data, totals, items, levy, real_levy, supplier):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)
       
        if not user_query.admin and not user_query.create_access and not user_query.purchase_access:
            return {'status': 'error', 'message': f'User {user} has no access'}
        
        if not user_query.admin:
            if location not in user_query.per_location_access:
                return {'status': 'error', 'message': f'User {user} has no access to location {location}'}
            
        current_date = datetime.strptime(data['date'], "%Y-%m-%d").date()
        today = date.today()

        if current_date.month != today.month:
            return {'status': 'error', 'message': 'Transaction date must be within the current month'}
            
        location_query = models.inventory_location.objects.get(bussiness_name=business_query, location_name=location)
        supplier_query = models.supplier.objects.get(name=supplier, bussiness_name=business_query)

        if data['terms'] == 'Full Payment':
            amount_paid = totals['grandTotal']
        elif data['terms'] == 'Part Payment':
            amount_paid = data['partpayment']
        else:
            amount_paid = 0

        with transaction.atomic(savepoint=False, durable=True, using='default'):
            p = models.purchase(bussiness_name=business_query, creation_date=datetime.now())
            new_code = p.generate_next_code()
            purchase_info = models.purchase.objects.create( code=new_code, created_by=user_query, bussiness_name=business_query, supplier=supplier_query, date=data['date'], amount_paid=amount_paid,
                                            due_date=data['dueDate'], location_address=location_query, discount_percentage=data['discount'], status=data['terms'],
                                            description=data['description'], sub_total=totals['subtotal'], gross_total=totals['grandTotal'], payment_term=data['terms'],
                                            discount=totals['discountAmount'], net_total=totals['netTotal'], tax_levy=totals['levyAmount'], tax_levy_types=levy)
                
            total_purchase = 0
            total_quantity = 0

            for i in items:
                item = json.loads(i)
                item_info = models.items.objects.get(item_name=item['name'], bussiness_name=business_query)

                if item_info.is_active is False:
                    return {'status': 'error', 'message': f'Item {item_info.item_name} is inactive'}

                models.purchase_history.objects.create(item_name=item_info, purchase=purchase_info, quantity=item['qty'], purchase_price=item['price'],
                                                               bussiness_name=business_query) 
                
                total_purchase += float(item['qty']) * float(item['price'])
                total_quantity += float(item['qty'])

                if item_info.quantity <= 0:
                    item_info.purchase_price = Decimal(str(float(item['price'])))
                    item_info.quantity += int(item['qty'])
                    item_info.save()

                else:
                    total_value = 0
                    target_qty = item_info.quantity + int(item['qty'])

                    history = models.purchase_history.objects.filter(item_name=item_info, bussiness_name=business_query).order_by('-id')
                        
                    for j in history:
                        cost = Decimal(str(min(target_qty, j.quantity))) * j.purchase_price
                        total_value += float(cost)
                        target_qty -= min(target_qty, j.quantity)

                        if target_qty == 0:
                            item_info.purchase_price = Decimal(str(total_value/(item_info.quantity + int(item['qty']))))
                            item_info.quantity += int(item['qty'])
                            item_info.save()
                            break
                        


                loc_item = models.location_items.objects.get(item_name__item_name=item['name'], location=location_query,  bussiness_name=business_query)
                loc_item.quantity += Decimal(str(float(item['qty'])))
                loc_item.purchase_price = item_info.purchase_price
                loc_item.save()

            purchase_info.total_quantity = Decimal(str(total_quantity))
            purchase_info.save()

            discount = total_purchase * (float(data['discount']) / 100)
            taxable_amount = total_purchase - discount
            tax = 0
            for i in real_levy:
                tax += taxable_amount * (float(i['rate']) / 100)

            final_total = taxable_amount + tax

            accounts = {'inventory':10301, 'tax_received':10601, 'payment':data['account'].split()[0], 
                        'discount':40201, 'payable':20101, 'tax_paid':20301}
            
            result = retrive_real_account(code_map=accounts, business=business, company=company).get_real_accounts()

            head = models.journal_head.objects.create(entry_type="Purchase", transaction_number=new_code, 
                                                        amount=final_total, created_by=user_query, bussiness_name=business_query,
                                                        description=data['description'])
            
            models.journal.objects.create(entry_type="Purchase", description=f'crediting Supplier {supplier_query.name} Account with invoice {new_code} amount', credit=supplier_query.account,
                                            amount=final_total, bussiness_name=business_query, date=data['date'], transaction_number=new_code, head=head)
            
            models.journal.objects.create(entry_type="Purchase", description=f'debiting Inventory Account - {new_code}', debit=10300,
                                            amount=total_purchase, bussiness_name=business_query, date=data['date'], transaction_number=new_code, head=head)
                
            models.liabilities_ledger.objects.create(bussiness_name=business_query, period=result.get('period'),
                                                    account=result.get('payable'), transaction_number=new_code, date=data['date'], type="Purchase",
                                                    description=data['description'], credit=final_total, head=head)
            
            models.supplier_ledger.objects.create(bussiness_name=business_query, period=result.get('period'),
                                                    account=supplier_query, transaction_number=new_code, date=data['date'], type="Purchase",
                                                    description=data['description'], credit=final_total, head=head)
            
            models.asset_ledger.objects.create(bussiness_name=business_query, period=result.get('period'),
                                                account=result.get('inventory'), transaction_number=new_code, date=data['date'], type="Purchase",
                                                description=data['description'], debit=total_purchase, head=head)

            if supplier_query.credit is None:
                supplier_query.credit = Decimal('0')
            supplier_query.credit += Decimal(str(final_total))

            if data['terms'] == 'Full Payment':
                payment = models.payment.objects.create(transaction_number=new_code, description=f'Payment of {new_code} to {supplier_query.account}', from_account=(data['account'].split())[0],
                                                to_account=supplier_query.account,
                                                bussiness_name=business_query, amount=final_total, created_by=user_query, status='None', ref_type='purchase', external_no=new_code)
                
                if supplier_query.debit is None:
                    supplier_query.debit = Decimal('0')
                supplier_query.debit += Decimal(str(final_total))
                supplier_query.save()

                models.journal.objects.create(entry_type="Payment", description=f'Debiting Supplier {supplier_query.name} for payment of {new_code}', debit=supplier_query.account,
                                            amount=payment.amount, bussiness_name=business_query, date=data['date'], transaction_number=new_code, head=head)
                
                models.liabilities_ledger.objects.create(bussiness_name=business_query, period=result.get('period'),
                                                    account=result.get('payable'), transaction_number=new_code, date=data['date'], type="Payment",
                                                    description=data['description'], debit=payment.amount, head=head)
                
                models.supplier_ledger.objects.create(bussiness_name=business_query, period=result.get('period'),
                                                    account=supplier_query, transaction_number=new_code, date=data['date'], type="Payment",
                                                    description=data['description'], debit=payment.amount, head=head)
                    
                models.journal.objects.create(entry_type="Payment", description=f'Crediting Account used for payment of {new_code}', credit=(data['account'].split())[0],
                                            amount=payment.amount, bussiness_name=business_query, date=data['date'], transaction_number=new_code, head=head)
                
                models.asset_ledger.objects.create(bussiness_name=business_query, period=result.get('period'),
                                                    account=result.get('payment'), transaction_number=new_code, date=data['date'], type="Payment",
                                                    description=data['description'], credit=payment.amount, head=head)
                if tax != 0:
                    models.journal.objects.create(entry_type="Purchase", description=f'debiting Tax Receivable Account - {new_code}', debit=10600,
                                            amount=tax, bussiness_name=business_query, date=data['date'], transaction_number=new_code, head=head)
                    
                    models.asset_ledger.objects.create(bussiness_name=business_query, period=result.get('period'),
                                                    account=result.get('tax_received'), transaction_number=new_code, date=data['date'], type="Purchase",
                                                    description=data['description'], debit=tax, head=head)
                if discount != 0:
                    models.journal.objects.create(entry_type="Purchase", description=f'crediting Discount Received Account - {new_code}', credit=40200,
                                            amount=discount, bussiness_name=business_query, date=data['date'], transaction_number=new_code, head=head)
                                        
                    models.revenue_ledger.objects.create(bussiness_name=business_query, period=result.get('period'),
                                                    account=result.get('discount'), transaction_number=new_code, date=data['date'], type="Purchase",
                                                    description=data['description'], credit=discount, head=head)
                    
            elif data['terms'] == 'Credit':          
                if tax != 0:
                    models.journal.objects.create(entry_type="Purchase", description=f'debiting Tax Payable Account - {new_code}', debit=20300,
                                            amount=tax, bussiness_name=business_query, date=data['date'], transaction_number=new_code, head=head)
                    
                    models.liabilities_ledger.objects.create(bussiness_name=business_query, period=result.get('period'),
                                                    account=result.get('tax_paid'), transaction_number=new_code, date=data['date'], type="Purchase",
                                                    description=data['description'], debit=tax, head=head)
                
            elif data['terms'] == 'Part Payment':              
                payment = models.payment.objects.create(transaction_number=new_code, description=f'Part Payment of {new_code} to {supplier_query.name}', from_account=(data['account'].split())[0], to_account=supplier_query.account,
                                                  bussiness_name=business_query, amount=data['partpayment'], created_by=user_query, status='None', ref_type='purchase', external_no=new_code)
                if supplier_query.debit is None:
                    supplier_query.debit = Decimal('0')
                supplier_query.debit += Decimal(str(payment.amount))
                supplier_query.save()

                models.journal.objects.create(entry_type="Payment", description=f'Debiting Supplier {supplier_query.name} for part payment of {new_code}', debit=supplier_query.account,
                                            amount=payment.amount, bussiness_name=business_query, date=data['date'], transaction_number=new_code, head=head)
                
                models.liabilities_ledger.objects.create(bussiness_name=business_query, period=result.get('period'),
                                                    account=result.get('payable'), transaction_number=new_code, date=data['date'], type="Payment",
                                                    description=data['description'], debit=payment.amount, head=head)
                
                models.supplier_ledger.objects.create(bussiness_name=business_query, period=result.get('period'),
                                                    account=supplier_query, transaction_number=new_code, date=data['date'], type="Payment",
                                                    description=data['description'], debit=payment.amount, head=head)
                    
                models.journal.objects.create(entry_type="Payment", description=f'Crediting Account used for part payment of {new_code}', credit=(data['account'].split())[0],
                                            amount=payment.amount, bussiness_name=business_query, date=data['date'], transaction_number=new_code, head=head)
                
                models.asset_ledger.objects.create(bussiness_name=business_query, period=result.get('period'),
                                                    account=result.get('payment'), transaction_number=new_code, date=data['date'], type="Payment",
                                                    description=data['description'], credit=payment.amount, head=head)

                if tax != 0:
                    models.journal.objects.create(entry_type="Purchase", description=f'debiting Tax Payable Account - {new_code}', debit=20300,
                                            amount=tax, bussiness_name=business_query, date=data['date'], transaction_number=new_code, head=head)
                    
                    models.liabilities_ledger.objects.create(bussiness_name=business_query, period=result.get('period'),
                                                    account=result.get('tax_paid'), transaction_number=new_code, date=data['date'], type="Purchase",
                                                    description=data['description'], debit=tax, head=head)
                    
                if discount != 0:
                    models.journal.objects.create(entry_type="Purchase", description=f'crediting Discount Received Account - {new_code}', credit=40200,
                                            amount=discount, bussiness_name=business_query, date=data['date'], transaction_number=new_code, head=head)
                                         
                    models.revenue_ledger.objects.create(bussiness_name=business_query, period=result.get('period'),
                                                    account=result.get('discount'), transaction_number=new_code, date=data['date'], type="Purchase",
                                                    description=data['description'], credit=discount, head=head)       
                    
            supplier_query.save()

        models.tracking_history.objects.create(user=user_query, head=new_code, area='Create Purchase', bussiness_name=business_query)          
        return {'status': 'success', 'message': 'Purchase invoice created successfully'}

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {'status': 'error', 'message': f'Business {business} not found'}
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return {'status': 'error', 'message': f'User {user} not found'}
    
    except models.inventory_location.DoesNotExist:
        logger.warning(f"Location '{location}' not found.")
        return {'status': 'error', 'message': f'Location {location} not found'}
    
    except ValueError as ve:
        logger.exception(ve)
        return {'status': 'error', 'message': 'Invalid data was submitted'}
    
    except Exception as error:
        logger.exception(error)
        return {'status': 'error', 'message': 'something happened'}
    
def reverse_purchase(business, user, company, number):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not user_query.admin and not user_query.reverse_access:
            return {'status': 'error', 'message': f'User {user} has no access'}
        
        purchase = models.purchase.objects.get(code=number, bussiness_name=business_query)

        if purchase.is_reversed:
            return {'status': 'error', 'message': f'Purchase {number} has been reversed already'}
        
        history = models.purchase_history.objects.filter(purchase=purchase, bussiness_name=business_query)

        with transaction.atomic(savepoint=False, durable=True, using='default'):
                
            for i in history:
                item = i.item_name
                if item.quantity - i.quantity < 0:
                    return {'status': 'error', 'message': f'Cannot reverse purchase because item {item.item_name} has insufficient stock'}
                
                item.quantity -= i.quantity
                item.save()
                if item.purchase_price != i.purchase_price:
                    total = 0
                    target = item.quantity

                    history = models.purchase_history.objects.filter(item_name=item, bussiness_name=business_query).exclude(purchase=purchase).order_by('-id')

                    for j in history:
                        if target == 0:
                            item.purchase_price = Decimal(str(total/item.quantity))
                            item.save()
                            break

                        cost = min(target, j.quantity) * j.purchase_price
                        total += cost
                        target -= min(target, j.quantity)

                loc_item = models.location_items.objects.get(item_name=item, location=purchase.location_address, bussiness_name=business_query)
                loc_item.quantity -= Decimal(str(i.quantity))
                loc_item.purchase_price = item.purchase_price
                loc_item.save()

            if purchase.supplier.debit is None:
                purchase.supplier.debit = Decimal('0')
            purchase.supplier.debit += Decimal(str(purchase.gross_total))
            purchase.supplier.save()

            journal_head = models.journal_head.objects.filter(transaction_number=purchase.code, bussiness_name=business_query)
            for entry in journal_head:
                entry.entry_type = f'{entry.entry_type} - Reversed'
                entry.reversed = True
                entry.save()

            journal_entries = models.journal.objects.filter(transaction_number=purchase.code, bussiness_name=business_query)
            for entry in journal_entries:
                models.journal.objects.create(
                    entry_type="Reversal",
                    description=f'Rev - {entry.description}',
                    debit=entry.credit,
                    credit=entry.debit,
                    amount=entry.amount,
                    bussiness_name=business_query,
                    date=date.today(),
                    transaction_number=f'Rev - {entry.transaction_number}',
                    head=entry.head
                )

            asset_entries = models.asset_ledger.objects.filter(transaction_number=purchase.code, bussiness_name=business_query)
            for entry in asset_entries:
                models.asset_ledger.objects.create(
                    bussiness_name=business_query,
                    account=entry.account,
                    period=entry.period,
                    transaction_number=f'Rev - {entry.transaction_number}',
                    date=date.today(),
                    type="Reversal",
                    description=f'Rev - {entry.description}',
                    debit=entry.credit,
                    credit=entry.debit,
                    head=entry.head
                )
                    
            liabilities_entries = models.liabilities_ledger.objects.filter(transaction_number=purchase.code, bussiness_name=business_query)
            for entry in liabilities_entries:
                models.liabilities_ledger.objects.create(
                    bussiness_name=business_query,
                    account=entry.account,
                    period=entry.period,
                    transaction_number=f'Rev - {entry.transaction_number}',
                    date=date.today(),
                    type="Reversal",
                    description=f'Rev - {entry.description}',
                    debit=entry.credit,
                    credit=entry.debit,
                    head=entry.head
                )

            revenue_entries = models.revenue_ledger.objects.filter(transaction_number=purchase.code, bussiness_name=business_query)
            for entry in revenue_entries:
                models.revenue_ledger.objects.create(
                    bussiness_name=business_query,
                    account=entry.account,
                    period=entry.period,
                    transaction_number=f'Rev - {entry.transaction_number}',
                    date=date.today(),
                    type="Reversal",
                    description=f'Rev - {entry.description}',
                    debit=entry.credit,
                    credit=entry.debit,
                    head=entry.head
                )
                        
            expense_entries = models.expenses_ledger.objects.filter(transaction_number=purchase.code, bussiness_name=business_query)
            for entry in expense_entries:
                models.expenses_ledger.objects.create(
                    bussiness_name=business_query,
                    account=entry.account,
                    period=entry.period,
                    transaction_number=f'Rev - {entry.transaction_number}',
                    date=date.today(),
                    type="Reversal",
                    description=f'Rev - {entry.description}',
                    debit=entry.credit,
                    credit=entry.debit,
                    head=entry.head
                )

            supplier_entries = models.supplier_ledger.objects.filter(transaction_number=purchase.code, bussiness_name=business_query)
            for entry in supplier_entries:
                models.supplier_ledger.objects.create(
                    bussiness_name=business_query,
                    account=entry.account,
                    period=entry.period,
                    transaction_number=f'Rev - {entry.transaction_number}',
                    date=date.today(),
                    type="Reversal",
                    description=f'Rev - {entry.description}',
                    debit=entry.credit,
                    credit=entry.debit,
                    head=entry.head
                )

            payments = models.payment.objects.filter(transaction_number=purchase.code, bussiness_name=business_query, is_reversed=False)
            for pay in payments:
                pay.status = "Reversed"
                pay.is_reversed = True
                pay.save()

            total_paid = sum(p.amount for p in payments)

            if purchase.supplier.credit is None:
                purchase.supplier.credit = Decimal('0')
            purchase.supplier.credit += Decimal(str(total_paid))
            purchase.supplier.save()
                    
                    
            purchase.status = 'Reversed'
            purchase.is_reversed = True
            purchase.save()

        models.tracking_history.objects.create(user=user_query, head=purchase.code, area='Reverse purchase', bussiness_name=business_query)
        return {'status': 'success' , 'message': f'Purchase invoice {number} has been reversed successfully'}

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {'status': 'error', 'message': f'Business {business} not found'}
    
    except models.purchase.DoesNotExist:
        logger.warning(f"Purchase no. '{number}' not found.")
        return {'status': 'error', 'message': f'Purchase no. {number} not found'}
    
    
    except ValueError as value:
        logger.warning(value)
        return {'status': 'error', 'message': 'invalid data was submitted'}
    
    except Exception as error:
        logger.exception('unhandled error')
        return {'status': 'error', 'message': 'something happened'}