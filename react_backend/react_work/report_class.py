from . import models
from django.db.models import When, Case, Q, Sum, F, Aggregate, Value, DecimalField, ExpressionWrapper, OuterRef, Subquery, Count
from django.db.models.functions import Coalesce, ExtractWeekDay, TruncDate
from datetime import date, timedelta,datetime
from collections import defaultdict
from decimal import Decimal
import logging  

logger = logging.getLogger(__name__)

class Report_Data:
    def __init__(self, business, company, user, location_access=None, start=None, end=None, category=None, brand=None):
        self.business = models.bussiness.objects.get(bussiness_name=business)
        self.user = user
        self.location = location_access
        self.start = start
        self.end = end
        self.category = category
        self.brand = brand

    def fetch_sales(self):   
        sales = models.sale.objects.filter(
            bussiness_name=self.business, 
            date__range=(self.start, self.end), 
            location_address__location_name__in=self.location,
            is_reversed=False
            )

        sales = sales.order_by('-date').values(
            'code', 'date', 'customer_name', 'customer_info__name', 'created_by__user_name', 'description', 'cog', 'discount', 'tax_levy', 'gross_total', 'status',
            'location_address__location_name', 'total_quantity', 'amount_paid', 'customer_info__account',
        )

        return sales
    
    def fetch_purchase(self):
        purchases = models.purchase.objects.filter(
            bussiness_name=self.business, 
            date__range=(self.start, self.end), 
            location_address__location_name__in=self.location,
            is_reversed=False
            )
        
        purchases = purchases.order_by('-date').values(
            'code', 'date', 'supplier__name', 'created_by__user_name', 'description', 'sub_total', 'discount', 'tax_levy', 'gross_total', 'status',
            'location_address__location_name', 'total_quantity', 'amount_paid', 'supplier__account'
        )

        return purchases
    
    def fetch_transfers(self):
        transfers = models.inventory_transfer.objects.filter(bussiness_name=self.business, date__range=(self.start, self.end))
        
        transfers = transfers.filter(
            Q(from_loc__location_name__in=self.location) | Q(to_loc__location_name__in=self.location)
        )

        transfers = transfers.order_by('-date').values('code', 'created_by__user_name',
            'from_loc__location_name', 'date', 'description', 'total_quantity', 'to_loc__location_name', 'status')

        return transfers
    
    def fetch_all_movements(self):
        sales = self.fetch_sales()
        purchases = self.fetch_purchase()
        transfers = self.fetch_transfers()

        return {
            'sales': sales,
            'purchases': purchases,
            'transfers': transfers}
    
    def fetch_customer_insights(self):
        sales = models.sale.objects.filter(
            bussiness_name=self.business, 
            date__lte=self.end,
            amount_paid__lt=F('gross_total'),
            location_address__location_name__in=self.location,
            is_reversed=False
        )


        sales = sales.values(
            'code', 'date', 'customer_info__name', 'created_by__user_name', 'description', 'sub_total', 'discount', 'tax_levy', 'gross_total', 'status',
            'location_address__location_name', 'total_quantity', 'amount_paid', 'customer_info__contact', 'customer_info__address', 'customer_info__account',
            'customer_info__debit', 'customer_info__credit', 'due_date'
        )


        return sales
    
    def fetch_supplier_insights(self):
        purchases = models.purchase.objects.filter(
            bussiness_name=self.business, 
            date__lte=self.end,
            amount_paid__lt=F('gross_total'),
            location_address__location_name__in=self.location,
            is_reversed=False
        )

        purchases = purchases.values(
            'code', 'date', 'supplier__name', 'created_by__user_name', 'description', 'sub_total', 'discount', 'tax_levy', 'gross_total', 'status',
            'location_address__location_name', 'total_quantity', 'amount_paid', 'supplier__contact', 'supplier__address', 'supplier__account',
            'supplier__debit', 'supplier__credit', 'due_date'
        )

        return purchases
    

    def fetch_sales_records(self):
        report_permission, created = models.report_permissions.objects.get_or_create(user=self.user, bussiness_name=self.business)

        can_view_cost_profit = report_permission.sales_profit
        
        qs = models.sale_history.objects.filter(
            sales__bussiness_name=self.business,
            sales__date__range=(self.start, self.end),
            sales__location_address__location_name__in=self.location,
            sales__is_reversed=False,
            item_name__category__name__in=[self.category] if self.category and self.category != "all" else models.inventory_category.objects.filter(bussiness_name=self.business).values_list('name', flat=True),
            item_name__brand__name__in=[self.brand] if self.brand and self.brand != "all" else models.inventory_brand.objects.filter(bussiness_name=self.business).values_list('name', flat=True),
        )

        records = qs.values(
            invoice_code=F("sales__code"),
            sale_date=F("sales__date"),
            customer_name=F("sales__customer_name"),
            customer=F("sales__customer_info__name"),
            item_name1=F("item_name__item_name"),
            category=F("item_name__category__name"),
            brand=F("item_name__brand__name"),
            quantity1=F("quantity"),
            unit_price=F("sales_price"),
            cost_price=F("purchase_price") if can_view_cost_profit else Value(0, output_field=DecimalField()),
        ).annotate(
            total_price=F("quantity") * F("sales_price"),
        )

        summary = qs.aggregate(
            total_sales=Sum(F("quantity") * F("sales_price")),
            total_quantity=Sum("quantity"),
            unique_customers=Count("sales__customer_name", distinct=True),
        )

        top_items = qs.values(
            name=F("item_name__item_name")
        ).annotate(
            quantity1=Sum("quantity"),
            revenue=Sum(F("quantity") * F("sales_price"))
        ).order_by("-revenue")[:10]

        by_category = (
            qs.annotate(
                total_value=ExpressionWrapper(
                    F('quantity') * F('sales_price'),
                    output_field=DecimalField()
                ),

                total_cost=ExpressionWrapper(
                    F('quantity') * F('purchase_price'),
                    output_field=DecimalField()
                )
            )
            .values('item_name__category__name')
            .annotate(
                name=F('item_name__category__name'),
                quantity=Coalesce(Sum('quantity'), Value(0), output_field=DecimalField()),
                value=Coalesce(Sum('total_value'), Value(0), output_field=DecimalField()),
                profit=Coalesce(Sum(F('total_value') - F('total_cost')), Value(0), output_field=DecimalField()) if can_view_cost_profit else Value(0, output_field=DecimalField())
            )
        )

        by_brand = (
            qs.annotate(
                total_value=ExpressionWrapper(
                    F('quantity') * F('sales_price'),
                    output_field=DecimalField()
                ),

                total_cost=ExpressionWrapper(
                    F('quantity') * F('purchase_price'),
                    output_field=DecimalField()
                )
            )
            .values('item_name__brand__name')
            .annotate(
                name=F('item_name__brand__name'),
                quantity=Coalesce(Sum('quantity'), Value(0), output_field=DecimalField()),
                value=Coalesce(Sum('total_value'), Value(0), output_field=DecimalField()),
                profit=Coalesce(Sum(F('total_value') - F('total_cost')), Value(0), output_field=DecimalField()) if can_view_cost_profit else Value(0, output_field=DecimalField())
            )
        )

        daily_trend = qs.annotate(
            date=TruncDate("sales__date")
        ).values("date").annotate(
            quantity1=Sum("quantity"),
            revenue=Sum(F("quantity") * F("sales_price")),
            cost=Sum(F("quantity") * F("purchase_price")) if can_view_cost_profit else Value(0, output_field=DecimalField()),
            profit=Sum(F("quantity") * (F("sales_price") - F("purchase_price"))) if can_view_cost_profit else Value(0, output_field=DecimalField()),
        ).order_by("date")

        profit_by_item = qs.values(
            name=F("item_name__item_name")
        ).annotate(
            revenue=Sum(F("quantity") * F("sales_price")),
            cost=Sum(F("quantity") * F("purchase_price")) if can_view_cost_profit else Value(0, output_field=DecimalField()),
            quantity1=Sum("quantity")
        ).annotate(
            profit=F("revenue") - F("cost") if can_view_cost_profit else Value(0, output_field=DecimalField()),
            margin=(F("revenue") - F("cost")) * 100.0 / F("revenue") if can_view_cost_profit else Value(0, output_field=DecimalField()),
        ).order_by("-profit")

        return {
            "records": list(records),
            "summary": summary,
            "charts": {
                "topItems": list(top_items),
                "byCategory": list(by_category),
                "byBrand": list(by_brand),
                "dailyTrend": list(daily_trend),
                "profitByItem": list(profit_by_item),
            }
        }

    
class Dashboard_Report:
    def __init__(self, business, company, user, location_access=None):
        self.business = models.bussiness.objects.get(bussiness_name=business)  
        self.user = user
        self.location = location_access
        self.start = date.today().replace(day=1)
        self.end = date.today()

    def fetch_total_item_quantity(self):
        if self.location and self.location.lower() == 'all locations':
            items = models.items.objects.filter(
                bussiness_name=self.business, is_active=True
            )

            quantity = items.aggregate(
                total_quantity=Coalesce(Sum('quantity'), Value(0), output_field=DecimalField())
            )

            category = items.values('category__name').annotate(
                name=F('category__name'),
                value=Coalesce(Sum('quantity'), Value(0), output_field=DecimalField()),
                values=Coalesce(
                    Sum(F('quantity') * F('purchase_price')), 
                    Value(0), 
                    output_field=DecimalField()
                )
            ).order_by('name')

            brand = items.values('brand__name').annotate(
                name=F('brand__name'),
                value=Coalesce(Sum('quantity'), Value(0), output_field=DecimalField()),
                values=Coalesce(
                    Sum(F('quantity') * F('purchase_price')), 
                    Value(0), 
                    output_field=DecimalField()
                )
            ).order_by('name')


            low_stock = items.filter(
                reorder_level__gt=F('quantity')
            ).annotate(
                name=F('item_name'),
                reorder=F('reorder_level'),
                stock=F('quantity'),
                difference=ExpressionWrapper(F('reorder_level') - F('quantity'), output_field=DecimalField())
            ).values('name', 'reorder', 'stock', 'difference')

        else:
            location = models.inventory_location.objects.get(
                bussiness_name=self.business, location_name=self.location
            )
            items = models.location_items.objects.filter(
                bussiness_name=self.business, location=location, item_name__is_active=True
            )
            
            quantity = items.aggregate(
                total_quantity = Coalesce(Sum('quantity'), Value(0), output_field=DecimalField())
            )

            category = items.values('item_name__category__name').annotate(
                name=F('item_name__category__name'),
                value=Coalesce(Sum('quantity'), Value(0), output_field=DecimalField()),
                values=Coalesce(
                    Sum(F('quantity') * F('purchase_price')), 
                    Value(0), 
                    output_field=DecimalField()
                )
            ).order_by('name')

            brand = items.values('item_name__brand__name').annotate(
                name=F('item_name__brand__name'),
                value=Coalesce(Sum('quantity'), Value(0), output_field=DecimalField()),
                values=Coalesce(
                    Sum(F('quantity') * F('purchase_price')), 
                    Value(0), 
                    output_field=DecimalField()
                )
            ).order_by('name')
            
            low_stock = items.filter(
                reorder_level__gt=F('quantity')
            ).annotate(
                name=F('item_name__item_name'),
                reorder=F('reorder_level'),
                stock=F('quantity'),
                difference=ExpressionWrapper(F('reorder_level') - F('quantity'), output_field=DecimalField())
            ).values('name', 'reorder', 'stock', 'difference')
        
        return {'quantity':quantity, 'category':category, 'low_stock':low_stock, 'brand':brand}
    
    def fetch_sales(self):
        sales = models.sale.objects.filter(
            bussiness_name=self.business, 
            date__range=(self.start, self.end),
            location_address__location_name__in=self.location,
            is_reversed=False
        )

        today_sales = sales.filter(date=date.today())

        month_sales_total = sales.aggregate(
            total_sales=Coalesce(Sum('gross_total'), Value(0), output_field=DecimalField()),
            total_quantity=Coalesce(Sum('total_quantity'), Value(0), output_field=DecimalField())
        )

        top_items = models.sale_history.objects.filter(
            bussiness_name=self.business,
            sales__in=sales
        ).values(
            'item_name__item_name'
        ).annotate(
            name = F('item_name__item_name'),
            brand = F('item_name__brand'),
            code = F('item_name__code'),
            category = F('item_name__category__name'),
            total_quantity=Sum('quantity')
        ).order_by('-total_quantity')[:10]

        today_sales_total = today_sales.aggregate(
            total_sales=Coalesce(Sum('gross_total'), Value(0), output_field=DecimalField()),
            total_quantity=Coalesce(Sum('total_quantity'), Value(0), output_field=DecimalField())
        )

        current_week_sales = sales.filter(date__range=[(self.end - timedelta(days=self.end.weekday())), self.end]).annotate(
            weekday = ExtractWeekDay('date')
        ).values('weekday').annotate(
            sales_value=Coalesce(Sum('gross_total'), Value(0), output_field=DecimalField()),
            sales_quantity=Coalesce(Sum('total_quantity'), Value(0), output_field=DecimalField())
        ).order_by('weekday')

        return {
            'month_sales_total': month_sales_total,
            'today_sales_total': today_sales_total,
            'top_items': top_items,
            'current_week_sales': current_week_sales
        }
    
    def fetch_purchases(self):
        purchases = models.purchase.objects.filter(
            bussiness_name=self.business, 
            date__range=(self.start, self.end),
            location_address__location_name__in=self.location,
            is_reversed=False
        )

        today_purchases = purchases.filter(date=date.today())

        month_purchases_total = purchases.aggregate(
            total_purchases=Coalesce(Sum('gross_total'), Value(0), output_field=DecimalField()),
            total_quantity=Coalesce(Sum('total_quantity'), Value(0), output_field=DecimalField())
        )

        today_purchases_total = today_purchases.aggregate(
            total_purchases=Coalesce(Sum('gross_total'), Value(0), output_field=DecimalField()),
            total_quantity=Coalesce(Sum('total_quantity'), Value(0), output_field=DecimalField())
        )

        current_week_purchases = purchases.filter(date__range=[(self.end - timedelta(days=self.end.weekday())), self.end]).annotate(
            weekday = ExtractWeekDay('date')
        ).values('weekday').annotate(
            purchase_value=Coalesce(Sum('gross_total'), Value(0), output_field=DecimalField()),
            purchase_quantity=Coalesce(Sum('total_quantity'), Value(0), output_field=DecimalField())
        ).order_by('weekday')

        return {
            'month_purchases_total': month_purchases_total,
            'today_purchases_total': today_purchases_total,
            'current_week_purchases': current_week_purchases
        }
    
    def dashboard_data(self):
        WEEKDAYS = {
            1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed',
            5: 'Thu', 6: 'Fri', 7: 'Sat'
        }

        merged = {
            i: {
                'day': WEEKDAYS[i],
                'sales_value': 0, 'purchase_value': 0,
                'sales_quantity': 0, 'purchase_quantity': 0
            }
            for i in range(1, 8)
        }

        purchase_data = self.fetch_purchases()
        sales_data = self.fetch_sales()

        for row in purchase_data['current_week_purchases']:
            wd = row['weekday']
            merged[wd]['purchase_value'] = row['purchase_value']
            merged[wd]['purchase_quantity'] = row['purchase_quantity']

        for row in sales_data['current_week_sales']:
            wd = row['weekday']
            merged[wd]['sales_value'] = row['sales_value']
            merged[wd]['sales_quantity'] = row['sales_quantity']

        merged_data = [merged[i] for i in range(2, 8)] + [merged[1]]


        data = {
            'month_in':purchase_data['month_purchases_total']['total_quantity'],
            'month_out':sales_data['month_sales_total']['total_quantity'],
            'day_in':purchase_data['today_purchases_total']['total_quantity'],
            'day_out':sales_data['today_sales_total']['total_quantity'],
            'month_purchase':purchase_data['month_purchases_total']['total_purchases'],
            'month_sales':sales_data['month_sales_total']['total_sales'],
            'day_purchase':purchase_data['today_purchases_total']['total_purchases'],
            'day_sales':sales_data['today_sales_total']['total_sales'],
            'week_trend':sales_data['current_week_sales'],
            'purchase_vs_sales':merged_data,
            'top_items':sales_data['top_items'],
        }

        return data

class Financial_Report:
    def __init__(self, business, start, end, period_type):
        self.business = business
        self.start = datetime.strptime(start, "%Y-%m-%d").date()
        self.end = datetime.strptime(end, "%Y-%m-%d").date()
        self.period_type = period_type

    def closed_pl_data(self):
        data = []

        if self.period_type == "monthly":
            closed_periods = models.month_period.objects.filter(
                business=self.business,
                start__gte=self.start,
                end__lte=self.end,
                is_closed=True
            )

            for m in closed_periods:
                revenue = models.account_balance.objects.filter(
                    period=m,
                    account__account_type__account_type__name="Revenue"
                ).aggregate(total=Sum(F('credit_total') - F('debit_total')))["total"] or 0

                cogs = models.account_balance.objects.filter(
                    period=m,
                    account__name__icontains="Cost of Goods Sold"
                ).aggregate(total=Sum("closing_balance"))["total"] or 0

                other_expenses_qs = models.account_balance.objects.filter(
                    period=m,
                    account__account_type__account_type__name="Expenses"
                ).exclude(account__name__icontains="Cost of Goods Sold") \
                .values("account__name").annotate(total=Sum("closing_balance"))

                total_expenses = sum(e["total"] for e in other_expenses_qs)
                net_profit = revenue - cogs - total_expenses

                data.append({
                    "period": m.name,
                    "revenue": float(revenue),
                    "cogs": float(cogs),
                    "expenses": {e["account__name"]: float(e["total"]) for e in other_expenses_qs},
                    "total_expenses": float(total_expenses),
                    "net_profit": float(net_profit),
                })

        elif self.period_type == "quarterly":
            closed_quarters = models.quarter_period.objects.filter(
                bussiness_name=self.business,
                start__gte=self.start,
                end__lte=self.end,
                is_closed=True
            )

            for q in closed_quarters:
                months = models.month_period.objects.filter(quarter=q, is_closed=True)

                revenue = models.account_balance.objects.filter(
                    period__in=months,
                    account__account_type__account_type__name="Revenue"
                ).aggregate(total=Sum(F('credit_total') - F('debit_total')))["total"] or 0

                cogs = models.account_balance.objects.filter(
                    period__in=months,
                    account__name__icontains="Cost of Goods Sold"
                ).aggregate(total=Sum("closing_balance"))["total"] or 0

                other_expenses_qs = models.account_balance.objects.filter(
                    period__in=months,
                    account__account_type__account_type__name="Expenses"
                ).exclude(account__name__icontains="Cost of Goods Sold") \
                .values("account__name").annotate(total=Sum("closing_balance"))

                total_expenses = sum(e["total"] for e in other_expenses_qs)
                net_profit = revenue - cogs - total_expenses

                data.append({
                    "period": q.name,
                    "revenue": float(revenue),
                    "cogs": float(cogs),
                    "expenses": {e["account__name"]: float(e["total"]) for e in other_expenses_qs},
                    "total_expenses": float(total_expenses),
                    "net_profit": float(net_profit),
                })

        elif self.period_type == "yearly":
            closed_years = models.year_period.objects.filter(
                bussiness_name=self.business,
                year__gte=self.start.year,
                year__lte=self.end.year,
                is_closed=True
            )

            for y in closed_years:
                months = models.month_period.objects.filter(year=y, is_closed=True)

                revenue = models.account_balance.objects.filter(
                    period__in=months,
                    account__account_type__account_type__name="Revenue"
                ).aggregate(total=Sum(F('credit_total') - F('debit_total')))["total"] or 0

                cogs = models.account_balance.objects.filter(
                    period__in=months,
                    account__name__icontains="Cost of Goods Sold"
                ).aggregate(total=Sum("closing_balance"))["total"] or 0

                other_expenses_qs = models.account_balance.objects.filter(
                    period__in=months,
                    account__account_type__account_type__name="Expenses"
                ).exclude(account__name__icontains="Cost of Goods Sold") \
                .values("account__name").annotate(total=Sum("closing_balance"))

                total_expenses = sum(e["total"] for e in other_expenses_qs)
                net_profit = revenue - cogs - total_expenses

                data.append({
                    "period": y.year,
                    "revenue": float(revenue),
                    "cogs": float(cogs),
                    "expenses": {e["account__name"]: float(e["total"]) for e in other_expenses_qs},
                    "total_expenses": float(total_expenses),
                    "net_profit": float(net_profit),
                })

        return data


    def current_pl_data(self):
        """Return current open P&L depending on timeframe."""
        today = date.today()

        if self.period_type == "monthly":
            current_month = models.month_period.objects.filter(
                start__lte=today,
                end__gte=today,
                business=self.business,
                is_closed=False
            ).first()


            if not current_month or self.end < current_month.start:
                return []

            return [self._compute_live_period(current_month, label=current_month.name)]

        elif self.period_type == "quarterly":
            current_quarter = models.quarter_period.objects.filter(
                start__lt=today,
                end__gt=today,
                bussiness_name=self.business,
                is_closed=False
            ).first()

            if not current_quarter or self.end < current_quarter.start:
                return []

            months = models.month_period.objects.filter(
                quarter=current_quarter
            )

            revenue, cogs, other_expenses, total_expenses, net_profit = self._aggregate_live_months(months)

            return [{
                "period": current_quarter.name,
                "revenue": float(revenue),
                "cogs": float(cogs),
                "expenses": {e["account__name"]: float(e["total"]) for e in other_expenses},
                "total_expenses": float(total_expenses),
                "net_profit": float(net_profit),
            }]

        elif self.period_type == "yearly":
            current_year = models.year_period.objects.filter(
                year=self.end.year,
                bussiness_name=self.business
            ).first()

            if not current_year or self.end.year < int(current_year.year):
                return []

            months = models.month_period.objects.filter(
                year=current_year
            )

            revenue, cogs, other_expenses, total_expenses, net_profit = self._aggregate_live_months(months)

            return [{
                "period": current_year.year,
                "revenue": float(revenue),
                "cogs": float(cogs),
                "expenses": {e["account__name"]: float(e["total"]) for e in other_expenses},
                "total_expenses": float(total_expenses),
                "net_profit": float(net_profit),
            }]

        return []
    
    def _compute_live_period(self, period, label=None):
        revenue = models.revenue_ledger.objects.filter(
            bussiness_name=self.business,
            period=period
        ).aggregate(total=Sum(F("credit") - F("debit")))["total"] or 0

        cogs = models.expenses_ledger.objects.filter(
            bussiness_name=self.business,
            period=period,
            account__name__icontains="Cost of Goods Sold"
        ).aggregate(total=Sum(F("debit") - F("credit")))["total"] or 0

        other_expenses = models.expenses_ledger.objects.filter(
            bussiness_name=self.business,
            period=period
        ).exclude(account__name__icontains="Cost of Goods Sold") \
        .values("account__name").annotate(total=Sum(F("debit") - F("credit")))

        total_expenses = sum(e["total"] for e in other_expenses)
        net_profit = revenue - cogs - total_expenses

        return {
            "period": label or period.name,
            "revenue": float(revenue),
            "cogs": float(cogs),
            "expenses": {e["account__name"]: float(e["total"]) for e in other_expenses},
            "total_expenses": float(total_expenses),
            "net_profit": float(net_profit),
        }


    def _aggregate_live_months(self, months):
        """Aggregate live ledgers over multiple months (quarter/year)."""
        revenue = models.revenue_ledger.objects.filter(
            bussiness_name=self.business,
            period__in=months
        ).aggregate(total=Sum(F("credit") - F("debit")))["total"] or 0

        cogs = models.expenses_ledger.objects.filter(
            bussiness_name=self.business,
            period__in=months,
            account__name__icontains="Cost of Goods Sold"
        ).aggregate(total=Sum(F("debit") - F("credit")))["total"] or 0

        other_expenses = models.expenses_ledger.objects.filter(
            bussiness_name=self.business,
            period__in=months
        ).exclude(account__name__icontains="Cost of Goods Sold") \
        .values("account__name").annotate(total=Sum(F("debit") - F("credit")))

        total_expenses = sum(e["total"] for e in other_expenses)
        net_profit = revenue - cogs - total_expenses

        return revenue, cogs, other_expenses, total_expenses, net_profit



    def pl_data(self):
        closed = self.closed_pl_data()
        current = self.current_pl_data()
        return closed + current

class Inventory_Valuation:
    def __init__(self, business, category, start, end):
        self.business = business
        self.category = category
        self.start = datetime.strptime(start, "%Y-%m-%d").date()
        self.end = datetime.strptime(end, "%Y-%m-%d").date()

    def close_inventory(self):
        try:
            today = date.today()
            all_months = models.month_period.objects.filter(
                business=self.business,
                start__gte=self.start,
                end__lte=self.end,
            )
            current = models.month_period.objects.filter(start__lte=today, end__gte=today, is_closed=False, business=self.business).first()
            current_month = []

            if current and self.end >= current.start:
                current_month = current

            closed_months = all_months.filter(is_closed=True)

            filters = {}

            if self.category != "all":
                filters["item__category__name"] = self.category

            closed_balance = models.item_balance.objects.filter(
                period__in=closed_months, **filters
            ).annotate(
                item_name=F("item__item_name"),
                code=F("item__code"),
                category__name=F("item__category__name"),
                brand__name=F("item__brand__name"),
                avg_cost=ExpressionWrapper(
                    (Coalesce(F("opening_value"), 0) + Coalesce(F("closing_value"), 0)) /
                    Case(
                        When(Q(opening_quantity=0) & Q(closing_quantity=0), then=None),
                        default=Coalesce(F("opening_quantity"), 0) + Coalesce(F("closing_quantity"), 0),
                        output_field=DecimalField()
                    ),
                    output_field=DecimalField(max_digits=12, decimal_places=2)
                ),
                avg_inv_value=ExpressionWrapper(
                    (Coalesce(F("opening_value"), 0) + Coalesce(F("closing_value"), 0)) /
                    Value(2.0, output_field=DecimalField()),
                    output_field=DecimalField(max_digits=12, decimal_places=2)
                ),
            ).annotate(
                cogs=ExpressionWrapper(F("avg_cost") * F("quantity_sold"), output_field=DecimalField(max_digits=12, decimal_places=2)),
                quantity=F("quantity_sold"),
                purchase_price=F("avg_cost") * F("quantity_sold"),
                sales_price=Case(
                    When(quantity=0, then=Value(0, output_field=DecimalField())),
                    default=F("value_sold") / F("quantity_sold"),
                    output_field=DecimalField(max_digits=12, decimal_places=2)
                ),
                turnover_rate=ExpressionWrapper(
                    Case(
                        When(avg_inv_value=0, then=Value(None, output_field=DecimalField())),
                        default=F("cogs") / F("avg_inv_value"),
                        output_field=DecimalField(max_digits=12, decimal_places=2)
                    ),
                    output_field=DecimalField(max_digits=12, decimal_places=2)
                )
            ).values("item_name", "code", "category__name", "brand__name", "quantity", "purchase_price", "sales_price", "turnover_rate")

            current_balance = []
            if current_month:

                sales_ss = (
                    models.sale_history.objects.filter(
                        item_name=OuterRef("item"), bussiness_name=self.business,
                        sales__date__range=[self.start, self.end]
                    )
                    .exclude(sales__is_reversed=True)
                    .values("item_name")
                    .annotate(
                        sales_value=ExpressionWrapper(Sum(F("quantity") * F("sales_price")), output_field=DecimalField())
                    )
                    .values("sales_value")[:1]
                )

                purchase_ss = (
                    models.sale_history.objects.filter(
                        item_name=OuterRef("item"), bussiness_name=self.business,
                        sales__date__range=[self.start, self.end]
                    )
                    .exclude(sales__is_reversed=True)
                    .values("item_name")
                    .annotate(
                        purchase_value=ExpressionWrapper(Sum(F("quantity") * F("purchase_price")), output_field=DecimalField())
                    )
                    .values("purchase_value")[:1]
                )

                sales_qs = (
                    models.sale_history.objects.filter(
                        item_name=OuterRef("item"), bussiness_name=self.business,
                        sales__date__range=[self.start, self.end]
                    )
                    .exclude(sales__is_reversed=True)
                    .values("item_name")
                    .annotate(total_qty=Coalesce(Sum("quantity"), 0))
                    .values("total_qty")[:1]
                )

                current_balance = (
                    models.item_balance.objects.filter(period=current_month, **filters)
                    .annotate(
                        item_name=F("item__item_name"),
                        code=F("item__code"),
                        category__name=F("item__category__name"),
                        brand__name=F("item__brand__name"),

                        quantity_solds=Subquery(sales_qs, output_field=DecimalField()),
                        sales_value=Subquery(sales_ss, output_field=DecimalField()),
                        purchase_value=Subquery(purchase_ss, output_field=DecimalField()),

                        sales_price=Case(
                            When(quantity_solds=0, then=Value(0, output_field=DecimalField())),
                            default=F("sales_value"),
                            output_field=DecimalField(max_digits=12, decimal_places=2),
                        ),

                        purchase_price=Case(
                            When(quantity_solds=0, then=Value(0, output_field=DecimalField())),
                            default=F("purchase_value"),
                            output_field=DecimalField(max_digits=12, decimal_places=2),
                        ),

                        avg_inv_value=ExpressionWrapper(
                            (Coalesce(F("opening_value"), 0) + Coalesce(F("quantity_solds"), 0)) * Coalesce(F("purchase_price"), 0) / Value(2.0),
                            output_field=DecimalField(max_digits=12, decimal_places=2),
                        ),
                    )
                    .annotate(
                        cogs=ExpressionWrapper(
                            F("quantity_solds") * F("item__purchase_price"),
                            output_field=DecimalField(max_digits=12, decimal_places=2),
                        ),
                        quantity=F("quantity_solds"),
                        turnover_rate=ExpressionWrapper(
                            Case(
                                When(avg_inv_value=0, then=Value(None, output_field=DecimalField())),
                                default=F("cogs") / F("avg_inv_value"),
                                output_field=DecimalField(max_digits=12, decimal_places=2),
                            ),
                            output_field=DecimalField(max_digits=12, decimal_places=2),
                        ),
                    )
                    .values("item_name", "code", "sales_price", "purchase_price", "category__name", "brand__name", "quantity", "cogs", "turnover_rate")
                )

            merged = {}
            for row in list(closed_balance) + list(current_balance):
                key = row["item_name"]

                if key not in merged:
                    merged[key] = row.copy()
                else:
                    merged[key]["quantity"] = (merged[key].get("quantity") or 0) + (row.get("quantity") or 0)
                    merged[key]["cogs"] = (merged[key].get("cogs") or 0) + (row.get("cogs") or 0)
                    merged[key]["purchase_price"] = ((merged[key].get("purchase_price") or 0) + Decimal(row["purchase_price"] or 0))
                    merged[key]["sales_price"] = ((merged[key].get("sales_price") or 0) + Decimal(row["sales_price"] or 0))
                    merged[key]["turnover_rate"] = ((merged[key].get("turnover_rate") or 0) + row["turnover_rate"]) / 2 if merged[key].get("turnover_rate") and row.get("turnover_rate") else merged[key].get("turnover_rate") or row.get("turnover_rate")

            return list(merged.values())
        
        except Exception as error:
            logger.warning(error)
            return []


class Trial_Balance:
    def __init__(self, business, start, end):
        self.business = business
        self.start = datetime.strptime(start, "%Y-%m-%d").date()
        self.end = datetime.strptime(end, "%Y-%m-%d").date()

    def tb_data(self):
        target_period = models.month_period.objects.filter(
            business=self.business,
            start__lte=self.end,
            end__gte=self.end
        ).first()

        if not target_period:
            return []

        if target_period.is_closed:
            return self._balances_for_period(target_period)

        prev_closed = models.month_period.objects.filter(
            business=self.business,
            end__lt=target_period.start,
            is_closed=True
        ).order_by('-end').first()

        base_balances = self._balances_for_period(prev_closed) if prev_closed else []
        ledger_balances = self._ledger_movements(target_period)

        merged = self._merge_balances(base_balances, ledger_balances, period=target_period.name)
        return merged

    def _balances_for_period(self, period):
        balances = models.account_balance.objects.filter(
            period=period
        ).values(
            "account__id",
            "account__name",
            "account__code",
            "account__account_type__name",
            "account__account_type__account_type__name",
            "period__name"
        ).annotate(
            debit=Coalesce(Sum("debit_total"), Value(0), output_field=DecimalField()),
            credit=Coalesce(Sum("credit_total"), Value(0), output_field=DecimalField()),
        )

        return [
            {
                "period": period.name,
                "real_account": b["account__name"],
                "account_type": b["account__account_type__account_type__name"],
                "sub_account": b["account__account_type__name"],
                "debit": float(b["debit"]),
                "credit": float(b["credit"]),
                "account_id": b["account__id"],
            }
            for b in balances
        ]

    def _ledger_movements(self, period):
        ledgers = []

        def collect(qs):
            return list(qs.values(
                "account__id",
                "account__name",
                "account__code",
                "account__account_type__name",
                "account__account_type__account_type__name",
            ).annotate(
                debit=Coalesce(Sum("debit"), Value(0), output_field=DecimalField()),
                credit=Coalesce(Sum("credit"), Value(0), output_field=DecimalField()),
            ))

        ledgers += collect(models.asset_ledger.objects.filter(bussiness_name=self.business, period=period))
        ledgers += collect(models.equity_ledger.objects.filter(bussiness_name=self.business, period=period))
        ledgers += collect(models.liabilities_ledger.objects.filter(bussiness_name=self.business, period=period))
        ledgers += collect(models.revenue_ledger.objects.filter(bussiness_name=self.business, period=period))
        ledgers += collect(models.expenses_ledger.objects.filter(bussiness_name=self.business, period=period))

        return [
            {
                "account_id": l["account__id"],
                "real_account": l["account__name"],
                "account_type": l["account__account_type__account_type__name"],
                "sub_account": l["account__account_type__name"],
                "debit": float(l["debit"]),
                "credit": float(l["credit"]),
            }
            for l in ledgers
        ]

    def _merge_balances(self, snapshot, movements, period):
        merged = {b["account_id"]: b for b in snapshot}

        for move in movements:
            acc_id = move["account_id"]
            if acc_id in merged:
                merged[acc_id]["debit"] += move["debit"]
                merged[acc_id]["credit"] += move["credit"]
            else:
                move["period"] = period
                merged[acc_id] = move

        for v in merged.values():
            v["period"] = period

        return list(merged.values())
