from . import models
from decimal import Decimal
from django.core.paginator import Paginator
from django.db.models import Sum
from collections import defaultdict
from django.db import transaction
from django.db.models import Q
import logging
from datetime import date, datetime
from .coa import retrive_real_account

logger = logging.getLogger(__name__)

def fetch_cash_for_main_view(search, date_search, business, company, page, user, page_quantity=30):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)
       
        if not user_query.admin and not user_query.payment_access:
            return {'status':'error', 'message':f'User {user} has no access to cash journal'}

        payment = models.cash_receipt.objects.filter(bussiness_name=business_query)

        if search.strip():
            search_filter= (
                Q(description__icontains=search) |
                Q(ref_type__icontains=search) |
                Q(external_no__icontains=search) |
                Q(code__icontains=search) |
                Q(transaction_number__icontains=search) |
                Q(from_account__icontains=search) |
                Q(to_account__icontains=search) |
                Q(status__icontains=search) 
            )

            payment = payment.filter(search_filter)
        
        if date_search:

            if date_search.get('start') and date_search.get('end'):
                start_date = date_search.get('start')
                end_date = date_search.get('end')

                payment = payment.filter(date__range=(start_date, end_date))
        
        payment = payment.order_by('-code').values(
            'code', 'date', 'ref_type', 'external_no', 'description', 'transaction_number', 'from_account', 'to_account', 'amount', 'is_reversed',
        )
        
        paginator = Paginator(payment, page_quantity)
        current_page = paginator.get_page(page)

        result = {'payment':list(current_page.object_list), 'has_more':current_page.has_next()}

        return {'status':'success', 'data':result}

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {'status': 'error', 'message': f'Business {business} not found'}
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return {'status': 'error', 'message': f'User {user} not found'}
    
    except Exception as error:
        logger.exception(error)
        return {'status': 'error', 'message': 'something happened'}
    
def view_cash_receipt(business, user, company, code):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(user_name=user, bussiness_name=business_query)

        if not user_query.admin and not user_query.cash_access:
            return {'status':'error', 'message':f'User {user} has no access to view cash receipt'}
        
        payment = models.cash_receipt.objects.get(bussiness_name=business_query, code=code)

        payment = {'from':payment.from_account, 'to':payment.to_account, 'status':'Completed' if payment.status == 'True' else 'Successful' if payment.status == 'None' else 'Reversed', 'number':payment.code, 'date':payment.date,
                 'description':payment.description, 'by':payment.created_by.user_name, 'amount':payment.amount,
                 'transation_number':payment.transaction_number, 'ref_type':payment.ref_type, 'external':payment.external_no}


        return {'status':'success', 'data':payment}

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {'status': 'error', 'message': f'Business {business} not found'}
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return {'status': 'error', 'message': f'User {user} not found'}
    
    except models.cash_receipt.DoesNotExist:
        logger.warning(f"Payment receipt code '{code}' not found.")
        return {'status': 'error', 'message': f'Payment receipt code {code} not found'}
    
    except Exception as error:
        logger.exception(error)
        return {'status': 'error', 'message': 'something happened'}
    
def add_cash_receipt(company, user, business, data):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not user_query.admin and not user_query.create_access:
            return {'status':'error', 'message':f'User {user} has no access to create cash receipt'}
        
        ledger_map = {
            'Assets': models.asset_ledger,
            'Liabilities': models.liabilities_ledger,
            'Equity': models.equity_ledger,
            'Revenue': models.revenue_ledger,
            'Expenses': models.expenses_ledger,
        }
        
        with transaction.Atomic(savepoint=False, durable=False, using='default'):
            for i in data:
                print(i)
                validate_data = (isinstance(i['amount'], (float, int)) and isinstance(i['credit_account'], str) and isinstance(i['debit_account'], str) and
                                 i['credit_account'].strip() and i['debit_account'].strip() and i['reference_type'].strip() and isinstance(i['reference_type'], str) and
                                 isinstance(i['date'], str) and i['date'].strip() and isinstance(i['description'], str) and isinstance(i['reference'], str)
                )
                
                if not validate_data:
                    return {'status': 'error', 'message': 'Invalid data was submitted'}
                
                current_date = datetime.strptime(i['date'], "%Y-%m-%d").date()
                today = date.today()

                if current_date.month != today.month:
                    return {'status': 'error', 'message': 'Transaction date must be within the current month'}
                
                accounts = {'receivable':10401, 'debit':i['debit_account'], 'credit':i['credit_account'], 'discount':50801}

                result = retrive_real_account(code_map=accounts, business=business, company=company).get_real_accounts()

                cash = models.cash_receipt.objects.create(transaction_number=i['reference'], description=i['description'], to_account=i['debit_account'], from_account=i['credit_account'],
                                                  bussiness_name=business_query, amount=i['amount'], created_by=user_query, ref_type=i['reference_type'], external_no=i['external'])
                    
                head = models.journal_head.objects.create(entry_type="Cash Receipt", transaction_number=cash.code, amount=cash.amount, created_by=user_query, bussiness_name=business_query,
                                                    description=cash.description)
                   
                    
                models.journal.objects.create(entry_type="Cash Receipt", description=f'Crediting Source Account for the payment of {cash.transaction_number}', credit=i['credit_account'], head=head,
                                            amount=cash.amount, bussiness_name=business_query, date=i['date'], transaction_number=cash.code)
                    
                if (i['reference_type']).lower() == 'sales':
                    credit_real_account = result.get('receivable')

                else:
                    credit_real_account = result.get('credit')

                ledger_map.get(credit_real_account.account_type.account_type.name).objects.create(bussiness_name=business_query, period=result.get('period'),
                                                    account=credit_real_account, transaction_number=cash.code, date=i['date'], type="Cash Receipt",
                                                    description=cash.description, credit=cash.amount, head=head)
                    
                models.journal.objects.create(entry_type="Cash Receipt", description=f'Debiting Account used to receive the payment of {cash.transaction_number}', debit=i['debit_account'], head=head,
                                            amount=Decimal(str(cash.amount)), bussiness_name=business_query, date=i['date'], transaction_number=cash.code)
                
                debit_real_account = result.get('debit')

                ledger_map.get(debit_real_account.account_type.account_type.name).objects.create(bussiness_name=business_query, period=result.get('period'),
                                            account=debit_real_account, transaction_number=cash.code, date=i['date'], type="Cash Receipt",
                                            description=cash.description, debit=Decimal(str(cash.amount)), head=head)
                    
                if i['reference_type'].lower() == 'sales':
                    invoice = models.sale.objects.get(code=i['reference'], bussiness_name=business_query)
                    invoice.amount_paid += Decimal(str(cash.amount))
                    customer = models.customer.objects.get(account=i['credit_account'], bussiness_name=business_query)
                    customer.credit += Decimal(str(cash.amount))
                    customer.save()

                    models.customer_ledger.objects.create(bussiness_name=business_query, period=result.get('period'),
                                                    account=customer, transaction_number=cash.code, date=i['date'], type="Cash Receipt",
                                                    description=cash.description, credit=cash.amount, head=head)

                    amount_paid = models.cash_receipt.objects.filter(bussiness_name=business_query, transaction_number=i['reference'])
                    total_amount = sum([j.amount for j in amount_paid])

                    if (invoice.status).lower() == 'credit':
                        if invoice.discount > 0:
                            discount_allowed_real_account = result.get('discount')

                            models.journal.objects.create(entry_type="Sale", description=invoice.description, debit=50800, head=head,
                                                amount=invoice.discount, bussiness_name=business_query, date=i['date'], transaction_number=invoice.code)
                            
                            ledger_map.get(discount_allowed_real_account.account_type.account_type.name).objects.create(period=result.get('period'),
                                                        bussiness_name=business_query, hit_account=discount_allowed_real_account, transaction_number=invoice.code, date=i['date'], type="Sale",
                                                        description=invoice.description, debit=invoice.discount, head=head)

                    if float(total_amount) >= float(invoice.gross_total):
                        invoice.status = 'Full Payment'

                    else:
                        invoice.status = 'Part Payment'

                    invoice.save()

                models.tracking_history.objects.create(user=user_query, bussiness_name=business_query, area='Posted Cash Receipt', head=head.code)

                return {'status': 'success', 'message': f'Cash receipt {cash.code} created successfully'}
                
    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {'status': 'error', 'message': f'Business {business} not found'}
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return {'status': 'error', 'message': f'User {user} not found'}
    
    except ValueError as value:
        print(str(value))
        logger.warning(value)
        return {'status': 'error', 'message': 'Invalid data was submitted'}

    except Exception as error:
        logger.exception(error)
        return {'status': 'error', 'message': 'something happened'}
    
def reverse_cash_receipt(company, user, number, business):
    try:    
        business_query = models.bussiness.objects.get(bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not user_query.admin and not user_query.create_access:
            return {'status':'error', 'message':f'User {user} has no access to reverse cash receipt'}
        
        cash = models.cash_receipt.objects.get(code=number, bussiness_name=business_query)

        with transaction.atomic(durable=False, savepoint=False, using='default'):
            if cash.is_reversed:
                return {'status': 'error', 'message': f'Cash receipt {number} has already been reversed'}
            
            cash.status = False
            cash.is_reversed = True
            cash.save()

            journal_head = models.journal_head.objects.get(transaction_number=cash.code, bussiness_name=business_query)
            journal_head.entry_type = f'{journal_head.entry_type} - Reversed'
            journal_head.reversed = True
            journal_head.save()

            journal = models.journal.objects.filter(head=journal_head, bussiness_name=business_query)
            for entry in journal:
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

            asset_entries = models.asset_ledger.objects.filter(head=journal_head, bussiness_name=business_query)
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
                        
            liabilities_entries = models.liabilities_ledger.objects.filter(head=journal_head, bussiness_name=business_query)
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

            revenue_entries = models.revenue_ledger.objects.filter(head=journal_head, bussiness_name=business_query)
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
                        
            expense_entries = models.expenses_ledger.objects.filter(head=journal_head, bussiness_name=business_query)
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

            customer_entries = models.customer_ledger.objects.filter(head=journal_head, bussiness_name=business_query)
            for entry in customer_entries:
                models.customer_ledger.objects.create(
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

            if cash.ref_type.lower() == 'sales':
                invoice = models.sale.objects.get(code=cash.transaction_number, bussiness_name=business_query)
                invoice.amount_paid -= cash.amount

                if float(invoice.amount_paid) <= 0:
                    invoice.status = "Credit"
                else:
                    invoice.status = "Part Payment"
                invoice.save()

                customer = models.customer.objects.get(account=cash.from_account, bussiness_name=business_query)
                customer.debit += cash.amount
                customer.save()

            models.tracking_history.objects.create(user=user_query, bussiness_name=business_query, area='Reversed Cash Receipt entry', head=journal_head.code)

            return {'status': 'success', 'message': f'Cash receipt {number} reversed successfully'}
        
    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return {'status': 'error', 'message': f'Business {business} not found'}
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return {'status': 'error', 'message': f'User {user} not found'}
    
    except models.journal_head.DoesNotExist:
        logger.warning(f"journal no. '{cash.code}' not found.")
        return {'status': 'error', 'message': f'Journal head {cash.code} not found'}
    
    except models.cash_receipt.DoesNotExist:
        logger.warning(f"Cash receipt no. '{number}' not found.")
        return {'status': 'error', 'message': f'Cash receipt {number} not found'}
    
    except ValueError as value:
        logger.warning(value)
        return {'status': 'error', 'message': 'Invalid data was submitted'}

    except Exception as error:
        logger.exception(error)
        return {'status': 'error', 'message': 'something happened'}