from . import models
from django.db.models import F, When, Case, Value, CharField, IntegerField
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class FetchHistory:
    def __init__(self, business, company, user, reference, location=None):
        self.business = models.bussiness.objects.filter(
            bussiness_name=business
        ).first()
        self.user = models.current_user.objects.filter(
            user_name=user, bussiness_name=self.business
        ).first()
        self.reference = reference
        self.location = location

    def _access(self):
        return self.user and (self.user.admin or self.user.info_access)

    def fetch_items(self):
        if not self._access():
            return {"status": "error", "message": "User has no access"}

        if self.location == "All Locations":
            item = models.items.objects.filter(
                item_name=self.reference, bussiness_name=self.business
            ).first()
        else:
            item = models.location_items.objects.filter(
                item_name__item_name=self.reference, bussiness_name=self.business,
                location__location_name=self.location
            ).first()


        if not item:
            return {"status": "error", "message": "Item not found"}

        common_fields = [
            "quantity_change",
            "date",
            "value",
            "user_name",
            "transaction_type",
            "reference",
            "real_date",
            "id",
        ]

        if self.location != "All Locations":
            purchases = models.purchase_history.objects.filter(
                item_name=item.item_name,
                bussiness_name=self.business,
                purchase__location_address__location_name=self.location
            ).exclude(purchase__status='Reversed').annotate(
                quantity_change=F("quantity"),
                date=F("purchase__date"),
                value=F("purchase_price"),
                user_name=F("purchase__created_by__user_name"),
                transaction_type=Value("Purchase", output_field=CharField()),
                reference=F("purchase__code"),
                real_date=F("purchase__creation_date"),
            ).values(*common_fields)

            sales = models.sale_history.objects.filter(
                item_name=item.item_name,
                bussiness_name=self.business,
                sales__location_address__location_name=self.location
            ).exclude(sales__status='Reversed').annotate(
                quantity_change=-F("quantity"),
                value=F("sales_price"),
                date=F("sales__date"),
                user_name=F("sales__created_by__user_name"),
                transaction_type=Value("Sales", output_field=CharField()),
                reference=F("sales__code"),
                real_date=F("sales__creation_date"),
            ).values(*common_fields)

            transfers = models.transfer_history.objects.filter(
                item_name=item.item_name,
                bussiness_name=self.business,
            ).exclude(transfer__status='Rejected')

            transfers = transfers.annotate(
                quantity_change=Case(
                    When(transfer__from_loc__location_name=self.location, then=-F("quantity")),
                    When(transfer__to_loc__location_name=self.location, then=F("quantity")),
                    default=Value(0),
                    output_field=IntegerField(),
                ),
                value=Value("-", output_field=CharField()),
                date=F("transfer__date"),
                user_name=F("transfer__created_by__user_name"),
                transaction_type=Case(
                    When(transfer__from_loc__location_name=self.location, then=Value("Transfer Out")),
                    When(transfer__to_loc__location_name=self.location, then=Value("Transfer In")),
                    default=Value("Ignore"),
                    output_field=CharField(),
                ),              
                reference=F("transfer__code"),
                real_date=F("transfer__creation_date"),
            ).exclude(transaction_type="Ignore")
            transfers = transfers.values(*common_fields)
            history_qs = transfers.union(sales, purchases, all=True).order_by("-date", "-real_date")
        else:
            purchases = models.purchase_history.objects.filter(
                item_name=item,
                bussiness_name=self.business,
            ).exclude(purchase__status='Reversed').annotate(
                quantity_change=F("quantity"),
                value=F("purchase_price"),
                date=F("purchase__date"),
                user_name=F("purchase__created_by__user_name"),
                transaction_type=Value("Purchase", output_field=CharField()),
                reference=F("purchase__code"),
                real_date=F("purchase__creation_date"),
            ).values(*common_fields)

            sales = models.sale_history.objects.filter(
                item_name=item,
                bussiness_name=self.business,
            ).exclude(sales__status='Reversed').annotate(
                quantity_change=-F("quantity"),
                value=F("sales_price"),
                date=F("sales__date"),
                user_name=F("sales__created_by__user_name"),
                transaction_type=Value("Sales", output_field=CharField()),
                reference=F("sales__code"),
                real_date=F("sales__creation_date"),
            ).values(*common_fields)

            history_qs = purchases.union(sales, all=True).order_by("-date", "-real_date")

        current_qty = item.quantity
        final_history = []
        for rec in history_qs:
            rec = dict(rec)
            rec["new_quantity"] = current_qty
            rec["previous_quantity"] = current_qty - rec["quantity_change"]
            current_qty = rec["previous_quantity"]

            rec = {"quantity_change": rec.pop("quantity_change"), **rec}
            final_history.append(rec)

        if self.location != "All Locations":
            item_data = {
                "quantity": item.quantity,
                "item_name": item.item_name.item_name,
            }

        else:
            item_data = {
                "quantity": item.quantity,
                "item_name": item.item_name,
            }

        return {
            "status": "success",
            "data": {
                "item": item_data,
                "history": final_history,
            },
        }
    
    def fetch_customer_ledgers(self):
        if not self._access():
            return {"status": "error", "message": "User has no access"}

        customer = models.customer.objects.filter(
            account=self.reference,
            bussiness_name=self.business
        ).first()

        if not customer:
            return {"status": "error", "message": "Customer not found"}

        transactions = models.customer_ledger.objects.filter(
                account=customer,
                bussiness_name=self.business
            ).annotate(
                amount=F("debit") - F("credit"),
                t_type=Case(
                    When(debit__gt=0, then=Value("invoice")),
                    When(credit__gt=0, then=Value("payment")),
                    default=Value("other"),
                    output_field=CharField(),
                ),
                reference=F("transaction_number"),
            ).order_by("date").values(
                "date",
                "type",
                "t_type",
                "reference",
                "description",
                "amount",
            )

        return {
            "status": "success",
            "data": {
                "customer": {
                    "name": customer.name,
                    "account": customer.account,
                    "balance": float(customer.debit or 0) - float(customer.credit or 0),
                },
                "transactions": transactions,
            },
        }
    
    def fetch_supplier_ledgers(self):
        if not self._access():
            return {"status": "error", "message": "User has no access"}

        supplier = models.supplier.objects.filter(
            account=self.reference,
            bussiness_name=self.business
        ).first()

        if not supplier:
            return {"status": "error", "message": "Supplier not found"}

        transactions = models.supplier_ledger.objects.filter(
                account=supplier,
                bussiness_name=self.business
            ).annotate(
                amount=F("credit") - F("debit"),
                t_type=Case(
                    When(credit__gt=0, then=Value("invoice")),
                    When(debit__gt=0, then=Value("payment")),
                    default=Value("other"),
                    output_field=CharField(),
                ),
                reference=F("transaction_number"),
            ).order_by("date").values(
                "date",
                "type",
                "t_type",
                "reference",
                "description",
                "amount",
            )

        return {
            "status": "success",
            "data": {
                "supplier": {
                    "name": supplier.name,
                    "account": supplier.account,
                    "balance": float(supplier.credit or 0) - float(supplier.debit or 0),
                },
                "transactions": transactions,
            },
        }

    def fetch_account_ledgers(self):
        if not self._access():
            return {"status": "error", "message": "User has no access"}

        # --- Step 1: Resolve reference to account(s) ---
        real_accounts = []
        account_type_name = None

        # Check level 3 (real_account)
        real_acc = models.real_account.objects.filter(
            code=self.reference, bussiness_name=self.business
        ).select_related("account_type__account_type").first()
        if real_acc:
            real_accounts = [real_acc.pk]
            account_type_name = real_acc.account_type.account_type.name

        # Check level 2 (sub_account)
        if not real_acc:
            sub_acc = models.sub_account.objects.filter(
                code=self.reference, bussiness_name=self.business
            ).select_related("account_type").first()
            if sub_acc:
                real_accounts = list(
                    models.real_account.objects.filter(
                        account_type=sub_acc, bussiness_name=self.business
                    ).values_list("id", flat=True)
                )
                account_type_name = sub_acc.account_type.name

        # Check level 1 (account)
        if not real_acc and not real_accounts:
            acc = models.account.objects.filter(
                code=self.reference, bussiness_name=self.business
            ).first()
            if acc:
                sub_accs = models.sub_account.objects.filter(
                    account_type=acc, bussiness_name=self.business
                )
                real_accounts = list(
                    models.real_account.objects.filter(
                        account_type__in=sub_accs, bussiness_name=self.business
                    ).values_list("id", flat=True)
                )
                account_type_name = acc.name

        if not real_accounts:
            return {"status": "error", "message": "Account not found"}

        LEDGER_MAP = {
            "Assets": models.asset_ledger,
            "Liabilities": models.liabilities_ledger,
            "Equity": models.equity_ledger,
            "Revenue": models.revenue_ledger,
            "Expenses": models.expenses_ledger,
        }

        ledger_model = LEDGER_MAP.get(account_type_name or "", None)

        if ledger_model is None:
            return {"status": "error", "message": "Ledger model not found for account type '{}'".format(account_type_name)}

        transactions = ledger_model.objects.filter(
                account_id__in=real_accounts,
                bussiness_name=self.business
            ).annotate(
                debit_amount=F("debit"),
                credit_amount=F("credit"),
                amount=F("debit") - F("credit"),
                hit_code=F('account__code'),
                hit_name=F('account__name'),
                reference=F("transaction_number"),
                t_type=Case(
                    When(debit__gt=0, then=Value("debit")),
                    When(credit__gt=0, then=Value("credit")),
                    default=Value("other"),
                    output_field=CharField(),
                ),
                
            ).order_by("date", "id").values(
                "date",
                "type",
                "t_type",
                "reference",
                "description",
                "debit_amount",
                "credit_amount",
                "amount",
                "hit_code",
                "hit_name"
            )

        return {
            "status": "success",
            "data": {
                "account": {
                    "code": self.reference,
                    "type": account_type_name,
                },
                "transactions": list(transactions),
            },
        }

