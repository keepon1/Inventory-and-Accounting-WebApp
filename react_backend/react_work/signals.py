from django.db.models.signals import post_save
from django.dispatch import receiver
from . import models
from datetime import date

@receiver(post_save, sender=models.items)
def create_item_in_all_locations(sender, instance, created, **kwargs):
    if created:
        locations = models.inventory_location.objects.filter(bussiness_name=instance.bussiness_name)
        for i in locations:
            models.location_items.objects.get_or_create(item_name=instance, location=i, quantity=0, defaults={'bussiness_name': instance.bussiness_name, 'sales_price': instance.sales_price})

@receiver(post_save, sender=models.inventory_location)
def create_location_items_for_new_location(sender, instance, created, **kwargs):
    if created:
        items = models.items.objects.filter(bussiness_name=instance.bussiness_name)
        for i in items:
            models.location_items.objects.get_or_create(item_name=i, location=instance, quantity=0, defaults={'bussiness_name': i.bussiness_name})
        
@receiver(post_save, sender=models.bussiness)
def create_default_chart_of_accounts(sender, instance, created, **kwargs):
    if created:
        models.year_period.objects.create(bussiness_name=instance, year=date.today().year)

        account_groups_data = [
            ("Assets", 10000),
            ("Liabilities", 20000),
            ("Equity", 30000),
            ("Revenue", 40000),
            ("Expenses", 50000),
        ]

        account_groups_map = {
            "Assets": None,
            "Liabilities": None,
            "Equity": None,
            "Revenue": None,
            "Expenses": None,
        }


        for name, code in account_groups_data:
            acc = models.account.objects.create(
                bussiness_name=instance, name=name, code=code
            )

            account_groups_map[name] = acc


        accounts_data = [
            ("Cash", "10100", "Payment", "", "Assets"),
            ("Mobile Money", "10200", "Payment", "", "Assets"),
            ("Inventory", "10300", "Goods", "", "Assets"),
            ("Receivables", "10400", "Customers", "", "Assets"),
            ("Bank", "10500", "Payment", "", "Assets"),
            ("Tax Receivable", "10600", "", "", "Assets"),

            ("Payable", "20100", "Supplier", "", "Liabilities"),
            ("Loan Payable", "20200", "", "", "Liabilities"),
            ("Tax Payable", "20300", "", "", "Liabilities"),

            ("Owner Capital", "30100", "", "", "Equity"),
            ("Owner Drawings", "30200", "", "", "Equity"),
            ("Retained Earnings", "30300", "", "", "Equity"),
            ("Opening Balance Equity", "30400", "", "", "Equity"),

            ("Sales Revenue", "40100", "", "", "Revenue"),
            ("Discounts Received", "40200", "", "", "Revenue"),
            ("Other Income", "40300", "", "", "Revenue"),

            ("Cost of Goods Sold", "50100", "", "", "Expenses"),
            ("Rent Expense", "50200", "", "", "Expenses"),
            ("Utilities", "50300", "", "", "Expenses"),
            ("Advertising and Marketing", "50400", "", "", "Expenses"),
            ("Office Supplies", "50500", "", "", "Expenses"),
            ("Taxes and Licenses", "50600", "", "", "Expenses"),
            ("Bank Charges", "50700", "", "", "Expenses"),
            ("Discount Allowed", "50800", "", "", "Expenses"),
        ]
        
        for name, code, tx_type, desc, group_name in accounts_data:
            sub_acc = models.sub_account.objects.create(
                account_type=account_groups_map[group_name],
                name=name,
                code=code,
                transaction_type=tx_type,
                description=desc,
                bussiness_name=instance
            )
         
            real_code = sub_acc.code[:-1] + '1' if sub_acc.code and sub_acc.code[-1].isdigit() else sub_acc.code
            models.real_account.objects.create(
                account_type=sub_acc,
                name=sub_acc.name,
                code=real_code,
                description=sub_acc.description,
                bussiness_name=instance
            )
    
        currencies = [
        ("Ghanaian Cedi", "GHS ₵"),
        ("US Dollar", "USD $"),
        ("Euro", "EUR €"),
        ("British Pound", "GBP £"),
        ("Japanese Yen", "JPY ¥"),
        ("Canadian Dollar", "CAD $"),
        ("Australian Dollar", "AUD $"),
        ("Swiss Franc", "CHF ₣"),
        ("Chinese Yuan", "CNY ¥"),
        ("South African Rand", "ZAR R"),
        ]

        for name, symbol in currencies:
            models.currency.objects.create(
                name=name,
                symbol=symbol,
                bussiness_name=instance
            )
        
        models.supplier.objects.create(bussiness_name=instance, name='Default Supplier', account=f'SUP{instance.id}-00001')
        models.customer.objects.create(bussiness_name=instance, name='Regular Customer', account=f'CUST{instance.id}-00001')
        models.customer.objects.create(bussiness_name=instance, name='Default Registered Customer', account=f'CUST{instance.id}-00002')
        
        