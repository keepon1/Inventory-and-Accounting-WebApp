from datetime import date
from django.db.models import Sum, F, DecimalField, ExpressionWrapper, Value as V
from django.db.models.functions import Coalesce
from decimal import Decimal
from .models import (
    item_balance, account_balance, customer_balance, supplier_balance,
    month_period, items,
    asset_ledger, liabilities_ledger, equity_ledger,
    revenue_ledger, expenses_ledger, purchase_history,
    customer_ledger, supplier_ledger, sale_history
)


def close_month_period(month: month_period):
    if month.is_closed:
        return

    next_month = month_period.objects.filter(
        year=month.year,
        start__gt=month.end
    ).order_by("start").first()

    sales_info = (
        sale_history.objects
        .filter(
            bussiness_name=month.business,
            sales__date__range=[month.start, month.end]
        )
        .exclude(sales__status="Reversed")
        .annotate(
            line_total=ExpressionWrapper(
                F("quantity") * F("sales_price"),
                output_field=DecimalField(max_digits=14, decimal_places=2)
            )
        )
        .values("item_name")
        .annotate(
            quantity=Sum("quantity"),
            value=Sum("line_total")
        )
    )
    sales_map = {s["item_name"]: s for s in sales_info}

    purchase_info = (
        purchase_history.objects
        .filter(
            bussiness_name=month.business,
            purchase__date__range=[month.start, month.end]
        )
        .exclude(purchase__status="Reversed")
        .annotate(
            line_total=ExpressionWrapper(
                F("quantity") * F("purchase_price"),
                output_field=DecimalField(max_digits=14, decimal_places=2)
            )
        )
        .values("item_name")
        .annotate(
            quantity=Sum("quantity"),
            value=Sum("line_total")
        )
    )
    purchase_map = {p["item_name"]: p for p in purchase_info}

    balances = []
    next_balances = []
    for ib in item_balance.objects.filter(period=month).select_related("item"):
        current_item = ib.item

        sales = sales_map.get(current_item.id, {"quantity": 0, "value": 0})
        purchase = purchase_map.get(current_item.id, {"quantity": 0, "value": 0})

        ib.closing_quantity = current_item.quantity
        ib.closing_value = current_item.quantity * current_item.purchase_price
        ib.quantity_purchased = purchase["quantity"] or 0
        ib.value_purchased = purchase["value"] or 0
        ib.quantity_sold = sales["quantity"] or 0
        ib.value_sold = sales["value"] or 0

        balances.append(ib)

        if next_month:
            next_balances.append(
                item_balance(
                    item=ib.item,
                    business=ib.business,
                    period=next_month,
                    opening_quantity=ib.closing_quantity,
                    closing_quantity=ib.closing_quantity,
                    opening_value=ib.closing_value,
                    closing_value=ib.closing_value,
                )
            )

    item_balance.objects.bulk_update(
        balances,
        ["closing_quantity", "closing_value", "quantity_purchased", "value_purchased", "quantity_sold", "value_sold"]
    )

    if next_balances:
        item_balance.objects.bulk_create(next_balances, ignore_conflicts=True)

    ledger_models = [
        asset_ledger, liabilities_ledger, equity_ledger,
        revenue_ledger, expenses_ledger,
    ]

    for ab in account_balance.objects.filter(period=month):
        debit_total, credit_total = Decimal(0), Decimal(0)

        for ledger in ledger_models:
            agg = ledger.objects.filter(
                account=ab.account,
                date__gte=month.start, date__lte=month.end,
                bussiness_name=ab.business
            ).aggregate(
                debits=Coalesce(Sum('debit'), V(0), output_field=DecimalField()),
                credits=Coalesce(Sum('credit'), V(0), output_field=DecimalField())
            )

            debit_total += agg['debits']
            credit_total += agg['credits']

        ab.debit_total = debit_total
        ab.credit_total = credit_total

        if ab.account.account_type.account_type.name in ["Assets", "Expenses"]:
            ab.closing_balance = (ab.opening_balance or 0) + debit_total - credit_total

        else:
            ab.closing_balance = (ab.opening_balance or 0) + credit_total - debit_total

        ab.save()

        if next_month:
            account_balance.objects.update_or_create(
                account=ab.account,
                business=ab.business,
                period=next_month,
                defaults={
                    "opening_balance": ab.closing_balance,
                    "closing_balance": 0,
                    "debit_total": Decimal(0),
                    "credit_total": Decimal(0),
                }
            )

    for cb in customer_balance.objects.filter(period=month):
        agg = customer_ledger.objects.filter(
            account=cb.customer,
            date__gte=month.start, date__lte=month.end,
            bussiness_name=cb.business
        ).aggregate(
            debits=Coalesce(Sum('debit'), V(0), output_field=DecimalField()),
            credits=Coalesce(Sum('credit'), V(0), output_field=DecimalField())
        )

        cb.debit_total = agg["debits"]
        cb.credit_total = agg['credits']
        cb.closing_balance = (cb.opening_balance or 0) + agg["debits"] - agg["credits"]
        cb.save()

        if next_month:
            customer_balance.objects.update_or_create(
                customer=cb.customer,
                business=cb.business,
                period=next_month,
                defaults={
                    "opening_balance": cb.closing_balance,
                    "closing_balance": 0,
                    "debit_total": Decimal(0),
                    "credit_total": Decimal(0),
                }
            )

    for sb in supplier_balance.objects.filter(period=month):
        agg = supplier_ledger.objects.filter(
            account=sb.supplier,
            date__gte=month.start, date__lte=month.end,
            bussiness_name=sb.business
        ).aggregate(
            debits=Coalesce(Sum('debit'), V(0), output_field=DecimalField()),
            credits=Coalesce(Sum('credit'), V(0), output_field=DecimalField())
        )

        sb.debit_total = agg['debits']
        sb.credit_total = agg['credits']
        sb.closing_balance = (sb.opening_balance or 0) + sb.debit_total - sb.credit_total
        sb.save()

        if next_month:
            supplier_balance.objects.update_or_create(
                supplier=sb.supplier,
                business=sb.business,
                period=next_month,
                defaults={
                    "opening_balance": sb.closing_balance,
                    "closing_balance": 0,
                    "debit_total": Decimal(0),
                    "credit_total": Decimal(0),
                }
            )

    month.is_closed = True
    month.closing_date = date.today()
    month.save()
