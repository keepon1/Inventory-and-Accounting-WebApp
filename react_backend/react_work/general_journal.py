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

def fetch_journal_for_main_view(search, date_search, business, company, page, user, page_quantity=30):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business, company_id=company)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)
       
        if not user_query.admin and not user_query.journal_access:
            return 'user has no access'

        journal = models.journal_head.objects.filter(bussiness_name=business_query)


        if search.strip():
            search_filter= (
                Q(description__icontains=search) |
                Q(entry_type__icontains=search) |
                Q(transaction_number__icontains=search) |
                Q(code__icontains=search)
            )

            journal = journal.filter(search_filter)
        
        if date_search:
            if date_search.get('type') == 'period':
                start_month = int(date_search.get('start_month', 0))
                end_month = int(date_search.get('end_month', 0))
                if start_month and end_month:
                    journal = journal.filter(date__month__gte=start_month, date__month__lte=end_month)

            elif date_search.get('type') == 'date':
                start_date = date_search.get('start_date')
                end_date = date_search.get('end_date')
                if start_date and end_date:
                    journal = journal.filter(date__date__range=(start_date, end_date))
        
        journal = journal.order_by('-code').values(
            'code', 'date', 'entry_type', 'transaction_number', 'amount', 'description',
            'created_by__user_name'
        )
        
        paginator = Paginator(journal, page_quantity)
        current_page = paginator.get_page(page)

        result = {'journals':list(current_page.object_list), 'has_more':current_page.has_next()}

        return result

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return "Business not found"
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return "User not found"
    
    except Exception as error:
        logger.exception('unhandled error')
        return 'something happened'
    
def view_gl_journal(business, user, company, code):
    try:
        business_query = models.bussiness.objects.get(bussiness_name=business, company_id=company)
        user_query = models.current_user.objects.get(user_name=user, bussiness_name=business_query)

        if not user_query.admin and not user_query.journal_access:
            return 'no access'
        
        journal_query = models.journal_head.objects.get(bussiness_name=business_query, code=code)
        items = models.journal.objects.filter(head=journal_query, bussiness_name=business_query)

        journal = {'type':journal_query.entry_type, 'number':journal_query.code, 'date':journal_query.date,
                 'description':journal_query.description, 'by':journal_query.created_by.user_name, 'amount':journal_query.amount,
                 'transation_number':journal_query.transaction_number}
        items = [{'date':i.date, 'type':i.entry_type, 'description':i.description, 'amount':i.amount, 'debit':i.debit,
                  'credit':i.credit} for i in items]

        data = {'customer':journal, 'items':items}

        return data

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return "Business not found"
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return "User not found"
    
    except models.journal_head.DoesNotExist:
        logger.warning(f"Journal code '{code}' not found.")
        return "Journal code not found"
    
    except Exception as error:
        logger.exception('unhandled error')
        return 'something happened'
    
def add_gl_journal(company, user, business, data):
    try:
        business_query = models.bussiness.objects.get(company_id=company, bussiness_name=business)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not user_query.admin and not user_query.create_access:
            return 'no access'
        
        ledger_map = {
            'Assets': models.asset_ledger,
            'Liabilities': models.liabilities_ledger,
            'Equity': models.equity_ledger,
            'Revenue': models.revenue_ledger,
            'Expenses': models.expenses_ledger,
        }
        
        with transaction.Atomic(savepoint=False, durable=False, using='default'):
            for i in data:
                validate_data = (isinstance(i['amount'], (float, str, int)) and isinstance(i['credit_account'], str) and isinstance(i['debit_account'], str) and
                                 i['credit_account'] and i['debit_account'])

                if not validate_data:
                    raise ValueError('invalid data')
                
                current_date = datetime.strptime(i['date'], "%Y-%m-%d").date()
                today = date.today()

                if current_date.month != today.month:
                    raise ValueError('can`t post to other period')
                
                accounts = {'debit':i['debit_account'], 'credit':i['credit_account']}

                result = retrive_real_account(code_map=accounts, business=business, company=company).get_real_accounts()

                head = models.journal_head.objects.create(entry_type="Manual Entry", transaction_number=i['reference'], amount=i['amount'], created_by=user_query, 
                                                        bussiness_name=business_query, description=i['description'])
                       
                models.journal.objects.create(entry_type="Manual Entry", description=head.description, credit=i['credit_account'], head=head,
                        amount=head.amount, bussiness_name=business_query, date=i['date'], transaction_number=head.code)
                    
                credit_real_account = result.get('credit')

                ledger_map.get(credit_real_account.account_type.account_type.name).objects.create(bussiness_name=business_query,
                                account=credit_real_account, transaction_number=head.transaction_number, date=i['date'], type="Manual Entry",
                                description=head.description, credit=head.amount, head=head, period=result.get('period'))
                    
                models.journal.objects.create(entry_type="Manual Entry", description=head.description, debit=i['debit_account'], head=head,
                                            amount=Decimal(str(head.amount)), bussiness_name=business_query, date=i['date'], transaction_number=head.transaction_number)
                
                debit_real_account = result.get('debit')

                ledger_map.get(bussiness_name=business_query, period=result.get('period'),
                            account=debit_real_account, transaction_number=head.transaction_number, date=i['date'], type="Manuel Entry",
                            description=head.description, debit=Decimal(str(head.amount)), head=head)

                models.tracking_history.objects.create(user=user_query, bussiness_name=business_query, area='Posted GL entry', head=head.code)

            return 'done'

    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return "Business not found"
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return "User not found"
    
    except ValueError as value:
        logger.warning(value)
        return str(value)

    except Exception as error:
        logger.exception('unhandled error')
        return 'something happened'
    
def reverse_gl_journal(company, user, number, business):
    try:    
        business_query = models.bussiness.objects.get(bussiness_name=business, company_id=company)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not user_query.admin and not user_query.create_access:
            return 'no access'

        head = models.journal_head.objects.get(bussiness_name=business_query, code=number)

        if head.entry_type.split()[-1].lower() == 'reversed':
            logger.warning(f"Journal no. '{number}' has already been reversed.")
            return 'reversed'
            
        with transaction.Atomic(using='default', durable=False, savepoint=False):
            head.entry_type = f'{head.entry_type} - Reversed'
            head.reversed = True
            head.save()

            journal = models.journal.objects.filter(bussiness_name=business_query, head=head)
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

            asset_entries = models.asset_ledger.objects.filter(head=head, bussiness_name=business_query)
            for entry in asset_entries:
                models.asset_ledger.objects.create(
                    sub_account=entry.sub_account,
                    bussiness_name=business_query,
                    hit_account=entry.hit_account,
                    transaction_number=f'Rev - {entry.transaction_number}',
                    date=date.today(),
                    type="Reversal",
                    description=f'Rev - {entry.description}',
                    debit=entry.credit,
                    credit=entry.debit,
                    head=entry.head
                )
                            
            liabilities_entries = models.liabilities_ledger.objects.filter(head=head, bussiness_name=business_query)
            for entry in liabilities_entries:
                models.liabilities_ledger.objects.create(
                    sub_account=entry.sub_account,
                    bussiness_name=business_query,
                    hit_account=entry.hit_account,
                    transaction_number=f'Rev - {entry.transaction_number}',
                    date=date.today(),
                    type="Reversal",
                    description=f'Rev - {entry.description}',
                    debit=entry.credit,
                    credit=entry.debit,
                    head=entry.head
                )

            revenue_entries = models.revenue_ledger.objects.filter(head=head, bussiness_name=business_query)
            for entry in revenue_entries:
                models.revenue_ledger.objects.create(
                    sub_account=entry.sub_account,
                    bussiness_name=business_query,
                    hit_account=entry.hit_account,
                    transaction_number=f'Rev - {entry.transaction_number}',
                    date=date.today(),
                    type="Reversal",
                    description=f'Rev - {entry.description}',
                    debit=entry.credit,
                    credit=entry.debit,
                    head=entry.head
                )
                            
            expense_entries = models.expenses_ledger.objects.filter(head=head, bussiness_name=business_query)
            for entry in expense_entries:
                models.expenses_ledger.objects.create(
                    sub_account=entry.sub_account,
                    bussiness_name=business_query,
                    hit_account=entry.hit_account,
                    transaction_number=f'Rev - {entry.transaction_number}',
                    date=date.today(),
                    type="Reversal",
                    description=f'Rev - {entry.description}',
                    debit=entry.credit,
                    credit=entry.debit,
                    head=entry.head
                )

            equity_entries = models.equity_ledger.objects.filter(head=head, bussiness_name=business_query)
            for entry in equity_entries:
                models.equity_ledger.objects.create(
                    sub_account=entry.sub_account,
                    bussiness_name=business_query,
                    hit_account=entry.hit_account,
                    transaction_number=f'Rev - {entry.transaction_number}',
                    date=date.today(),
                    type="Reversal",
                    description=f'Rev - {entry.description}',
                    debit=entry.credit,
                    credit=entry.debit,
                    head=entry.head
                )

            models.tracking_history.objects.create(user=user_query, bussiness_name=business_query, area='Reversed GL entry', head=head.code)

        return 'done'
        
    except models.bussiness.DoesNotExist:
        logger.warning(f"Business '{business}' not found.")
        return "Business not found"
    
    except models.current_user.DoesNotExist:
        logger.warning(f"User '{user}' not found.")
        return "User not found"
    
    except models.journal_head.DoesNotExist:
        logger.warning(f"Journal no. '{number}' not found.")
        return "Journal no. not found"
    
    except ValueError as value:
        logger.warning(value)
        return value

    except Exception as error:
        logger.exception('unhandled error')
        return 'something happened'