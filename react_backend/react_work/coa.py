from . import models
from decimal import Decimal
from django.db.models import Sum, F, Value, IntegerField,  CharField
from collections import defaultdict
from django.db import transaction
from itertools import chain
import logging
from datetime import date, datetime

logger = logging.getLogger(__name__)


def fetch_coa(business, company, user):
    try:
        business_query = models.bussiness.objects.get(
            bussiness_name=business
        )
        user_query = models.current_user.objects.filter(
            user_name=user, bussiness_name=business_query
        ).first()

        if not user_query.admin and not user_query.coa_acess:
            return {
                'status':'error',
                'message':f'User {user} has no access to chart of accounts'
            }

        today = date.today()

        closed_period = models.month_period.objects.filter(
            end__lt=today, business=business_query, is_closed=True
        ).order_by('-end').first()

        current_period = models.month_period.objects.filter(
            start__lt=today, end__gt=today,
            is_closed=False, business=business_query
        ).first()
        
        ledgers = {
            'Assets': models.asset_ledger.objects.filter(period=current_period),
            'Liabilities': models.liabilities_ledger.objects.filter(period=current_period),
            'Equity': models.equity_ledger.objects.filter(period=current_period),
            'Revenue': models.revenue_ledger.objects.filter(period=current_period),
            'Expenses': models.expenses_ledger.objects.filter(period=current_period),
        }

        closed_account_balance = models.account_balance.objects.filter(
            period=closed_period
        ).values('account__code').annotate(
            account_code=F('account__code'),
            parent_name=F('account__account_type__account_type__name'),
            parent_code=F('account__account_type__account_type__code'),
            sub_name=F('account__account_type__name'),
            sub_code=F('account__account_type__code'),
            account_name=F('account__name'),
            credit=F('credit_total'),
            debit=F('debit_total')
        )

        closed_customer_balance = models.customer_balance.objects.filter(
            period=closed_period
        ).values('customer__account').annotate(
            account_code=F('customer__account'),
            sub_code=Value(10400, output_field=IntegerField()),
            sub_name=Value('Receivables', output_field=CharField()),
            parent_code=Value(10000, output_field=IntegerField()),
            parent_name=Value('Assets', output_field=CharField()),
            account_name=F('customer__name'),
            credit=F('credit_total'),
            debit=F('debit_total')
        )

        closed_supplier_balance = models.supplier_balance.objects.filter(
            period=closed_period
        ).values('supplier__account').annotate(
            account_code=F('supplier__account'),
            parent_name=Value('Liabilities', output_field=CharField()),
            parent_code=Value(20000, output_field=IntegerField()),
            sub_name=Value('Liabilities', output_field=CharField()),
            sub_code=Value(20100, output_field=IntegerField()),
            account_name=F('supplier__name'),
            credit=F('credit_total'),
            debit=F('debit_total')
        )

        current_account_balance = []
        current_customer_balance = []
        current_supplier_balance = []

        for key, value in ledgers.items():
            if key == 'Customer':
                balance = value.values('account__account').annotate(
                    account_code=F('account__account'),
                    account_name=F('account__name'),
                    sub_code=Value(10400, output_field=IntegerField()),
                    sub_name=Value('Receivables', output_field=CharField()),
                    parent_code=Value(10000, output_field=IntegerField()),
                    parent_name=Value('Assets', output_field=CharField()),
                    credit=Sum('credit'),
                    debit=Sum('debit'),
                )
                current_customer_balance.append(balance)

            elif key == 'Supplier':
                balance = value.values('account__account','account__name').annotate(
                    account_code=F('account__account'),
                    account_name=F('account__name'),
                    sub_code=Value(20100, output_field=IntegerField()),
                    sub_name=Value('Payable', output_field=CharField()),
                    parent_code=Value(20000, output_field=IntegerField()),
                    parent_name=Value('Liabilities', output_field=CharField()),
                    credit=Sum('credit'),
                    debit=Sum('debit'),
                )
                current_supplier_balance.append(balance)

            else:
                balance = value.values('account__code').annotate(
                    account_code=F('account__code'),
                    account_name=F('account__name'),
                    sub_code=F('account__account_type__code'),
                    sub_name=F('account__account_type__name'),
                    parent_code=F('account__account_type__account_type__code'),
                    parent_name=F('account__account_type__account_type__name'),
                    credit=Sum('credit'),
                    debit=Sum('debit'),
                )
                current_account_balance.append(balance)

        closed_balances = chain(
            closed_account_balance,
            closed_customer_balance,
            closed_supplier_balance
        )
        current_balances = chain(
            *current_account_balance,
            *current_customer_balance,
            *current_supplier_balance
        )

        merged_balances = {}
        for entry in chain(closed_balances, current_balances):
            acc_code = entry["account_code"]
            debit = entry["debit"] or Decimal("0")
            credit = entry["credit"] or Decimal("0")
            if acc_code not in merged_balances:
                merged_balances[acc_code] = {
                    **entry,
                    "credit": credit,
                    "debit": debit,
                }
            else:
                merged_balances[acc_code]["credit"] += credit
                merged_balances[acc_code]["debit"] += debit

        for acc in merged_balances.values():
            parent_name = acc["parent_name"]
            if parent_name in ["Assets", "Expenses"]:
                acc["balance"] = acc["debit"] - acc["credit"]
            else:
                acc["balance"] = acc["credit"] - acc["debit"]

        tree = defaultdict(lambda: {"name": "", "accounts": defaultdict(list)})
        for entry in merged_balances.values():
            parent_code = entry["parent_code"]
            parent_name = entry["parent_name"]
            sub_code = entry["sub_code"]
            sub_name = entry["sub_name"]

            tree[parent_code]["name"] = parent_name
            tree[parent_code]["accounts"][sub_code].append({
                "code": entry["account_code"],
                "name": entry["account_name"],
                "credit": entry["credit"],
                "debit": entry["debit"],
                "balance": entry["balance"],
                "sub_name": sub_name,
            })

        nested_result = []
        for parent_code, parent in tree.items():
            subs = []
            parent_credit = Decimal("0")
            parent_debit = Decimal("0")
            parent_balance = Decimal("0")

            for sub_code, accounts in parent["accounts"].items():
                sub_credit = sum(a["credit"] for a in accounts)
                sub_debit = sum(a["debit"] for a in accounts)
                if parent["name"] in ["Assets", "Expenses"]:
                    sub_balance = sub_debit - sub_credit
                else:
                    sub_balance = sub_credit - sub_debit
                parent_credit += sub_credit
                parent_debit += sub_debit
                parent_balance += sub_balance

                subs.append({
                    "level": "sub",
                    "code": sub_code,
                    "name": accounts[0].get("sub_name", ""),
                    "total_credit": sub_credit,
                    "total_debit": sub_debit,
                    "balance": sub_balance,
                    "accounts": accounts,
                })

            if parent["name"] in ["Assets", "Expenses"]:
                parent_balance = parent_debit - parent_credit
            else:
                parent_balance = parent_credit - parent_debit

            nested_result.append({
                "level": "parent",
                "code": parent_code,
                "name": parent["name"],
                "total_credit": parent_credit,
                "total_debit": parent_debit,
                "balance": parent_balance,
                "subs": subs,
            })
        
        return nested_result
    
    except Exception as error:
        logger.warning(error)
        return {'status': 'error', 'message': 'something happened'}


def create_account(data, company):
    business_name = data['business']
    account = data['account']
    sub = data['sub']
    real = data['real']
    description = data['description']
    user = data['user']

    if real == '' or sub == '' or account == '' or business_name == '':
        return {'status': 'error', 'message': 'Invalid data was submitted'}
    
    try:
    
        business = models.bussiness.objects.get(company_id=company, bussiness_name=business_name)
        user_query = models.current_user.objects.get(user_name=user, bussiness_name=business)

        if not user_query.admin and not user_query.create_access and not user_query.coa_acess:
            return {'status':'error', 'message':f'User {user} has no access to create accounts'}

        account = models.account.objects.get(bussiness_name=business, code=account)

        if models.real_account.objects.filter(name=real, bussiness_name=business).exists():
            return {'status': 'error', 'message': f'Account {real} already exists'}
    
    
        with transaction.atomic(savepoint=False, durable=False, using='default'):
            if models.sub_account.objects.filter(name=sub, bussiness_name=business).exists():
                sub = models.sub_account.objects.get(name=sub, bussiness_name=business)

            else:
                sub = models.sub_account.objects.create(account_type=account, name=sub, description=description, bussiness_name=business)
            
            models.real_account.objects.create(account_type=sub, name=real, description=description, bussiness_name=business)

            models.tracking_history.objects.create(user=user_query, bussiness_name=business, area='Created gl account', head=real)

            return {'status': 'success', 'message': f'Account {real} created successfully'}
        
    except ValueError as value:
        logger.warning(value)
        return {'status': 'error', 'message': 'Invalid data was submitted'}

    except Exception as error:
        logger.warning(error)
        return {'status': 'error', 'message': 'something happened'}
    
class retrive_real_account:
    def __init__(self, company, business, code_map: dict):
        self.code_map = code_map
        self.business = models.bussiness.objects.filter(bussiness_name=business).first()

    def get_real_accounts(self) -> dict:

        result = {}
        for name, code in self.code_map.items():
            try:
                acc = models.real_account.objects.get(code=code, bussiness_name=self.business)
            except models.real_account.DoesNotExist:
                acc = None
            result[name] = acc

        current_month = models.month_period.objects.filter(
            start__lte=date.today(),
            end__gte=date.today(),
            business=self.business
        ).first()

        result["period"] = current_month
        return result

    
