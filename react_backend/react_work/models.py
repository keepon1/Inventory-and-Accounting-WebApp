from django.db import models
from django.contrib.auth.models import User, AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.contrib.auth.hashers import make_password, check_password
from datetime import date, datetime
from decimal import Decimal
import calendar
from django.utils.translation import gettext_lazy as _
from django.db.models import Index

class company_info(models.Model):
    company_name = models.CharField(max_length = 100)
    owner_name = models.CharField(max_length = 100)
    email = models.EmailField()
    phone_number = models.BigIntegerField()
    date = models.DateTimeField(auto_now_add = True)
    update_date = models.DateTimeField(auto_now = True)
    image = models.ImageField()

    def __str__(self):
        return self.company_name

    class Meta:
        indexes = [
            Index(fields=['company_name']),
        ]
    
class bussiness(models.Model):
    image = models.ImageField(upload_to='items')
    bussiness_name = models.CharField(max_length = 100, default='')
    location = models.CharField(max_length = 100, default='')
    new = models.BooleanField(default=False)
    google = models.BooleanField(default=False)
    address = models.CharField(max_length = 100, default='')
    telephone = models.CharField(max_length = 100, default='')
    email = models.CharField(max_length = 100, default='')
    description = models.CharField(max_length = 100, default='')
    user_created = models.CharField(max_length = 100, default='')
    user_deleted = models.CharField(max_length = 100, default='')
    company = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return self.bussiness_name

    class Meta:
        indexes = [
            Index(fields=['bussiness_name']),
            Index(fields=['company']),
        ]

class current_user(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="current")
    user_name = models.CharField(max_length=100, default='')
    email = models.EmailField(max_length=100, default='')
    google = models.BooleanField(default=False)
    creation_date = models.DateTimeField(auto_now_add=True)
    bussiness_name = models.ForeignKey('bussiness', on_delete=models.CASCADE)
    admin = models.BooleanField(default=False)
    per_location_access = models.JSONField(default=list)
    theme = models.JSONField(default=list)
    create_access = models.BooleanField(default=False)
    reverse_access = models.BooleanField(default=False)
    journal_access = models.BooleanField(default=False)
    coa_access = models.BooleanField(default=False)
    item_access = models.BooleanField(default=False)
    transfer_access = models.BooleanField(default=False)
    sales_access = models.BooleanField(default=False)
    purchase_access = models.BooleanField(default=False)
    location_access = models.BooleanField(default=False)
    customer_access = models.BooleanField(default=False)
    supplier_access = models.BooleanField(default=False)
    cash_access = models.BooleanField(default=False)
    payment_access = models.BooleanField(default=False)
    report_access = models.BooleanField(default=False)
    settings_access = models.BooleanField(default=False)
    edit_access = models.BooleanField(default=False)
    purchase_price_access = models.BooleanField(default=False)
    dashboard_access = models.BooleanField(default=False)
    add_user_access = models.BooleanField(default=False)
    give_access = models.BooleanField(default=False)
    info_access = models.BooleanField(default=False)

    class Meta:
        indexes = [
            Index(fields=['bussiness_name']),
            Index(fields=['creation_date']),
            Index(fields=['email']),
        ]

    
class tracking_history(models.Model):
    user = models.ForeignKey(current_user, on_delete=models.PROTECT)
    area = models.CharField(max_length=100, default='')
    head = models.CharField(max_length=100, default='')
    date = models.DateTimeField(auto_now_add=True)
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','date']),
            Index(fields=['user']),
        ]

class currency(models.Model):
    name = models.CharField(max_length=100)
    symbol = models.CharField(max_length=100)
    rate = models.DecimalField(decimal_places=2, default=Decimal("0.00"), blank=True, null=True, max_digits=20)
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','name']),
        ]

class supplier(models.Model):
    name = models.CharField(max_length=100)
    account = models.CharField(max_length=20, unique=True, blank=True)
    contact = models.CharField(max_length=100, default='')
    email = models.CharField(max_length=100, default='')
    address = models.CharField(max_length=100, default='')
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)
    debit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), blank=True, null=True)
    credit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), blank=True, null=True)

    def generate_next_code(self):
        id = self.bussiness_name.pk
        last = supplier.objects.filter(bussiness_name=self.bussiness_name).order_by('-id').first()
        next_code = 1 if not last else int(last.account[-5:]) + 1
        return f"SUP{id}-{next_code:05d}"

    def save(self, *args, **kwargs):
        creating = self.pk is None
        if not self.account:
            self.account = self.generate_next_code()
        super().save(*args, **kwargs)

        if creating:
            self.create_account_balance()

    def create_account_balance(self):
        current_month = month_period.objects.filter(
            business=self.bussiness_name,
            start__lte=date.today(),
            end__gte=date.today(),
            is_closed=False
        ).first()

        if current_month:
            supplier_balance.objects.get_or_create(
                supplier=self,
                business=self.bussiness_name,
                period=current_month,
                defaults={
                    "opening_balance": 0,
                    "closing_balance": 0,
                    "debit_total": 0,
                    "credit_total": 0,
                }
            )

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','id']),
            Index(fields=['account']),
            Index(fields=['name']),
        ]

class customer(models.Model):
    name = models.CharField(max_length=100)
    account = models.CharField(max_length=20, unique=True, blank=True)
    contact = models.CharField(max_length=100, default='')
    email = models.CharField(max_length=100, default='')
    address = models.CharField(max_length=100, default='')
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)
    debit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), blank=True, null=True)
    credit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), blank=True, null=True)

    def generate_next_code(self):
        id = self.bussiness_name.pk
        last = customer.objects.filter(bussiness_name=self.bussiness_name).order_by('-id').first()
        next_code = 1 if not last else int(last.account[-5:]) + 1
        return f"CUST{id}-{next_code:05d}"

    def save(self, *args, **kwargs):
        creating = self.pk is None
        if not self.account:
            self.account = self.generate_next_code()
        super().save(*args, **kwargs)

        if creating:
            self.create_account_balance()

    def create_account_balance(self):
        current_month = month_period.objects.filter(
            business=self.bussiness_name,
            start__lte=date.today(),
            end__gte=date.today(),
            is_closed=False
        ).first()

        if current_month:
            customer_balance.objects.get_or_create(
                customer=self,
                business=self.bussiness_name,
                period=current_month,
                defaults={
                    "opening_balance": 0,
                    "closing_balance": 0,
                    "debit_total": 0,
                    "credit_total": 0,
                }
            )

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','id']),
            Index(fields=['account']),
            Index(fields=['name']),
        ]

class taxes_levies(models.Model):
    name = models.CharField(max_length=100, default='')
    rate = models.FloatField(default=0)
    type = models.CharField(max_length=100, default='')
    description = models.CharField(max_length=100, default='')
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)
    
    class Meta:
        indexes = [
            Index(fields=['bussiness_name','name']),
        ]

class inventory_location(models.Model):
    location_name = models.CharField(max_length=100, default='')
    description = models.CharField(max_length=150, default='')
    creation_date = models.DateTimeField(auto_now_add = True)
    created_by = models.ForeignKey(current_user, on_delete=models.PROTECT)
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','location_name']),
            Index(fields=['creation_date']),
        ]

class inventory_category(models.Model):
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=100)
    creation_date = models.DateField(auto_now_add=True)
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','name']),
        ]

class inventory_unit(models.Model):
    name = models.CharField(max_length=100)
    suffix = models.CharField(max_length=100)
    description = models.CharField(max_length=100)
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','name']),
        ]

class items(models.Model):
    image = models.ImageField(upload_to='items')
    code = models.CharField(max_length = 100)
    brand = models.CharField(max_length = 100)
    item_name = models.CharField(max_length = 100)
    description = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    reorder_level = models.FloatField(default=0)
    quantity = models.BigIntegerField(default=0)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    sales_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    creation_date = models.DateTimeField(auto_now_add = True)
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)
    category = models.ForeignKey(inventory_category, on_delete=models.CASCADE)
    unit = models.ForeignKey(inventory_unit, on_delete=models.PROTECT)
    created_by = models.ForeignKey(current_user, on_delete=models.PROTECT)
    last_sales = models.DateField(default=date.today)
    is_active = models.BooleanField(default=True)


    @property
    def total_cost(self):
        return self.quantity * self.purchase_price

    def __str__(self):
        return self.item_name
    
    def save(self, *args, **kwargs):
        creating = self.pk is None
        super().save(*args, **kwargs)

        if creating:
            self.create_item_balance()

    def create_item_balance(self):
        current_month = month_period.objects.filter(
            business=self.bussiness_name,
            start__lte=date.today(),
            end__gte=date.today(),
            is_closed=False
        ).first()

        if current_month:
            item_balance.objects.get_or_create(
                item=self,
                business=self.bussiness_name,
                period=current_month,
                defaults={
                    "opening_quantity": self.quantity,
                    "closing_quantity": self.quantity,
                    "opening_value": self.quantity * self.purchase_price,
                    "closing_value": self.quantity * self.purchase_price,
                }
            )

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','creation_date']),
            Index(fields=['code']),
            Index(fields=['item_name']),
            Index(fields=['category']),
            Index(fields=['created_by']),
        ]
    
class location_items(models.Model):
    item_name = models.ForeignKey(items, on_delete=models.CASCADE)
    reorder_level = models.FloatField(default=0)
    quantity = models.DecimalField(default=Decimal("0.00"), max_digits=10, decimal_places=2)
    purchase_price = models.DecimalField(default=Decimal("0.00"), max_digits=10, decimal_places=2)
    sales_price = models.DecimalField(default=Decimal("0.00"), max_digits=10, decimal_places=2)
    location = models.ForeignKey(inventory_location, on_delete=models.CASCADE)
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)
    last_sales = models.DateField(default=date.today)

    @property
    def total_cost(self):
        return self.quantity * self.purchase_price 

    def __str__(self):
        return self.item_name

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','location']),
            Index(fields=['item_name']),
        ]
    
class inventory_transfer(models.Model):
    image = models.ImageField()
    code = models.CharField(max_length=20, unique=True, blank=True)
    date = models.DateField(default=date.today)
    description = models.CharField(max_length = 200)
    from_loc = models.ForeignKey(inventory_location, on_delete=models.PROTECT, related_name='from_location')
    to_loc = models.ForeignKey(inventory_location, on_delete=models.PROTECT, related_name='to_location')
    total_quantity = models.BigIntegerField(default=0)
    status = models.CharField(max_length=100)
    created_by = models.ForeignKey(current_user, on_delete=models.PROTECT)
    creation_date = models.DateTimeField(auto_now_add = True)
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    def generate_next_code(self):
        id = self.bussiness_name.pk
        year = self.creation_date.year if self.creation_date else datetime.now().year
        last = inventory_transfer.objects.filter(bussiness_name=self.bussiness_name, creation_date__year=year).order_by('-id').first()
        next_code = 1 if not last else int(last.code[-5:]) + 1
        return f"TRF{id}-{year}{next_code:05d}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self.generate_next_code()
        super().save(*args, **kwargs)

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','creation_date']),
            Index(fields=['code']),
            Index(fields=['from_loc','to_loc']),
        ]

class transfer_history(models.Model):

    transfer = models.ForeignKey(inventory_transfer, on_delete=models.CASCADE)
    item_name = models.ForeignKey(items, on_delete=models.CASCADE)
    quantity = models.BigIntegerField(default=0)
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    class Meta:
        unique_together = [('item_name', 'transfer')]
        indexes = [
            Index(fields=['transfer']),
            Index(fields=['item_name']),
            Index(fields=['bussiness_name']),
        ]
    
class sale(models.Model):

    image = models.ImageField()
    code = models.CharField(max_length=20, unique=True, blank=True)
    due_date = models.DateField(default=date.today)
    date = models.DateField(default=date.today)
    description = models.CharField(max_length=100, default='')
    customer_name = models.CharField(max_length=100, default='')
    customer_info = models.ForeignKey(customer, on_delete=models.PROTECT)
    gross_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    sub_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    net_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    location_address = models.ForeignKey(inventory_location, on_delete=models.CASCADE)
    discount_percentage = models.CharField(max_length=100, default='')
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    tax_levy = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    tax_levy_types = models.JSONField(default=list)
    payment_term = models.CharField(max_length=100, default='')
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    created_by = models.ForeignKey(current_user, on_delete=models.PROTECT)
    status = models.CharField(max_length=100, default='')
    type = models.CharField(max_length=100, default='')
    creation_date = models.DateTimeField(auto_now_add = True)
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)
    total_quantity = models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=10)
    cog = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    is_reversed = models.BooleanField(default=False)

    def __str__(self):
        return self.customer_name if hasattr(self, 'customer_name') else str(self.customer_info)
    
    def generate_next_code(self):
        id = self.bussiness_name.pk
        year = self.creation_date.year if self.creation_date else datetime.now().year
        last = sale.objects.filter(bussiness_name=self.bussiness_name, creation_date__year=year).order_by('-id').first()
        next_code = 1 if not last else int(last.code[-5:]) + 1
        return f"SAL{id}-{year}{next_code:05d}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self.generate_next_code()
        super().save(*args, **kwargs)

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','creation_date']),
            Index(fields=['code']),
            Index(fields=['customer_info']),
            Index(fields=['created_by']),
        ]
    
class sale_history(models.Model):

    sales = models.ForeignKey(sale, on_delete=models.CASCADE)
    item_name = models.ForeignKey(items, on_delete=models.CASCADE)
    quantity = models.BigIntegerField(default=0)
    discount = models.CharField(max_length=100)
    sales_price = models.FloatField()
    purchase_price = models.FloatField()
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    class Meta:
        indexes = [
            Index(fields=['sales']),
            Index(fields=['item_name']),
            Index(fields=['bussiness_name']),
        ]

class purchase(models.Model):

    image = models.ImageField()
    code = models.CharField(max_length=20, unique=True, blank=True)
    due_date = models.DateField(default=date.today)
    date = models.DateField(default=date.today)
    description = models.CharField(max_length = 200)
    supplier = models.ForeignKey(supplier, on_delete=models.PROTECT)
    gross_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    sub_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    net_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    payment_term = models.CharField(max_length=100, default='')
    status = models.CharField(max_length=100, default='')
    discount_percentage = models.CharField(max_length=100)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    tax_levy = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    tax_levy_types = models.JSONField(default=list)
    location_address = models.ForeignKey(inventory_location, on_delete=models.CASCADE)
    created_by = models.ForeignKey(current_user, on_delete=models.PROTECT)
    creation_date = models.DateTimeField(auto_now_add = True)
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)
    total_quantity = models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=10)
    is_reversed = models.BooleanField(default=False)

    def __str__(self):
        return str(self.supplier)
    
    def generate_next_code(self):
        id = self.bussiness_name.pk
        year = self.creation_date.year if self.creation_date else datetime.now().year
        last = purchase.objects.filter(bussiness_name=self.bussiness_name, creation_date__year=year).order_by('-id').first()
        next_code = 1 if not last else int(last.code[-5:]) + 1
        return f"PUR{id}-{year}{next_code:05d}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self.generate_next_code()
        super().save(*args, **kwargs)

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','creation_date']),
            Index(fields=['code']),
            Index(fields=['supplier']),
            Index(fields=['created_by']),
        ]
    
class purchase_history(models.Model):

    purchase = models.ForeignKey(purchase, on_delete=models.CASCADE)
    item_name = models.ForeignKey(items, on_delete=models.CASCADE)
    quantity = models.BigIntegerField(default=0)
    purchase_price = models.DecimalField(max_digits=10, default=Decimal("0.00"), decimal_places=2)
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    class Meta:
        indexes = [
            Index(fields=['purchase']),
            Index(fields=['item_name']),
            Index(fields=['bussiness_name']),
        ]

class account(models.Model):
    name = models.CharField(max_length=100)
    code = models.BigIntegerField(default=0)
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','code']),
            Index(fields=['name']),
        ]


class sub_account(models.Model):
    account_type = models.ForeignKey(account, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=False, blank=True)
    transaction_type = models.CharField(max_length=100, default='')
    description = models.CharField(max_length=100)
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    def generate_code(self):
        prefix = str(self.account_type.code)[0]
        sub_prefix = f"{prefix}"
        last = sub_account.objects.filter(account_type=self.account_type, bussiness_name=self.bussiness_name).order_by('-code').first()

        if last and last.code.startswith(sub_prefix):
            next_num = int(last.code) + 100
        else:
            print(sub_prefix)
            next_num = int(sub_prefix) * 10000 + 100

        return f"{next_num:05d}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self.generate_code()
        super().save(*args, **kwargs)

    class Meta:
        indexes = [
            Index(fields=['account_type','bussiness_name','code']),
            Index(fields=['bussiness_name','name']),
        ]


class real_account(models.Model):
    account_type = models.ForeignKey(sub_account, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=False, blank=True)
    description = models.CharField(max_length=100)
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    def generate_code(self):
        prefix = str(self.account_type.code)[:3]
        last = real_account.objects.filter(account_type=self.account_type, bussiness_name=self.bussiness_name).order_by('-code').first()

        if last and last.code.startswith(prefix):
            next_num = int(last.code) + 1
        else:
            next_num = int(prefix) * 100 + 1

        return f"{next_num:05d}"

    def save(self, *args, **kwargs):
        creating = self.pk is None
        if not self.code:
            self.code = self.generate_code()
        super().save(*args, **kwargs)

        if creating:
            self.create_account_balance()

    def create_account_balance(self):
        current_month = month_period.objects.filter(
            business=self.bussiness_name,
            start__lte=date.today(),
            end__gte=date.today(),
            is_closed=False
        ).first()

        if current_month:
            account_balance.objects.get_or_create(
                account=self,
                business=self.bussiness_name,
                period=current_month,
                defaults={
                    "opening_balance": 0,
                    "closing_balance": 0,
                    "debit_total": 0,
                    "credit_total": 0,
                }
            )

    class Meta:
        indexes = [
            Index(fields=['account_type','bussiness_name','code']),
            Index(fields=['bussiness_name','name']),
        ]


class journal_head(models.Model):
    date = models.DateField(auto_now_add=True)
    code = models.CharField(max_length=20, unique=True, blank=True)
    entry_type = models.CharField(max_length=100, default='')
    transaction_number = models.CharField(max_length=100, default='')
    amount = models.DecimalField(decimal_places=2, max_digits=10, default=Decimal("0.00"))
    description = models.CharField(max_length=100, default='')
    created_by = models.ForeignKey(current_user, on_delete=models.PROTECT)
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)
    reversed = models.BooleanField(default=False)

    def generate_next_code(self):
        id = self.bussiness_name.pk
        year = self.date.year if self.date else datetime.now().year
        last = journal_head.objects.filter(bussiness_name=self.bussiness_name, date__year=year).order_by('-id').first()
        next_code = 1 if not last else int(last.code[-5:]) + 1
        return f"JNL{id}-{year}{next_code:05d}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self.generate_next_code()
        super().save(*args, **kwargs)

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','date']),
            Index(fields=['code']),
            Index(fields=['created_by']),
        ]

class year_period(models.Model):
    year = models.CharField(max_length=100, default=str(date.today().year))
    is_closed = models.BooleanField(default=False)
    closing_date = models.DateField(null=True, blank=True)
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    def save(self, *args, **kwargs):
        creating = self.pk is None
        super().save(*args, **kwargs)
        if creating:
            self.create_quarters()

    def create_quarters(self):
        year = int(self.year)
        quarters = [
            (date(year, 1, 1), date(year, 3, 31)),
            (date(year, 4, 1), date(year, 6, 30)),
            (date(year, 7, 1), date(year, 9, 30)),
            (date(year, 10, 1), date(year, 12, 31)),
        ]
        for start, end in quarters:
            quarter = quarter_period.objects.create(
                year=self,
                start=start,
                end=end,
                bussiness_name=self.bussiness_name
            )
            quarter.create_months()

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','year']),
        ]

class quarter_period(models.Model):
    name = models.CharField(max_length=100)
    year = models.ForeignKey(year_period, on_delete=models.CASCADE)
    start = models.DateField()
    end = models.DateField()
    is_closed = models.BooleanField(default=False)
    closing_date = models.DateField(null=True, blank=True)
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.PROTECT)

    def generate_quarter_name(self):
        month = self.start.month
        quarter_number = ((month - 1) // 3) + 1
        ordinals = {1: "1st", 2: "2nd", 3: "3rd", 4: "4th"}
        return f"{ordinals[quarter_number]} Quarter {self.start.year}"

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = self.generate_quarter_name()
        super().save(*args, **kwargs)

    def create_months(self):
        current = self.start
        while current <= self.end:
            month_start = date(current.year, current.month, 1)
            last_day = calendar.monthrange(current.year, current.month)[1]
            month_end = date(current.year, current.month, last_day)
            month_period.objects.create(
                business=self.bussiness_name,
                start=month_start,
                end=month_end,
                year=self.year,
                quarter=self
            )
            if current.month == 12:
                break
            current = date(current.year, current.month + 1, 1)

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','start','end']),
        ]

class month_period(models.Model):
    business = models.ForeignKey(bussiness, on_delete=models.CASCADE)
    name = models.CharField(max_length=50, default='')
    start = models.DateField()
    end = models.DateField()
    is_closed = models.BooleanField(default=False)
    closing_date = models.DateField(null=True, blank=True)
    year = models.ForeignKey(year_period, on_delete=models.PROTECT)
    quarter = models.ForeignKey(quarter_period, on_delete=models.PROTECT)

    def generate_month_name(self):
        month_name = calendar.month_name[self.start.month]
        return f"{month_name}, {self.start.year}"

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = self.generate_month_name()
        super().save(*args, **kwargs)

    class Meta:
        indexes = [
            Index(fields=['business','start','end','is_closed']),
            Index(fields=['business','start']),
        ]

class asset_ledger(models.Model):
    head = models.ForeignKey(journal_head, on_delete=models.PROTECT)
    account = models.ForeignKey(real_account, on_delete=models.PROTECT)
    period = models.ForeignKey(month_period, on_delete=models.PROTECT)
    transaction_number = models.CharField(max_length=100)
    date = models.DateField(default=date.today)
    type = models.CharField(default='', max_length=100)
    description = models.CharField(default='', max_length=100)
    debit = models.DecimalField(decimal_places=2, max_digits=10, default=Decimal("0.00"))
    credit = models.DecimalField(decimal_places=2, max_digits=10, default=Decimal("0.00"))
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    def update_balance(self):
        previous = asset_ledger.objects.filter(
            account=self.account, period=self.period, bussiness_name=self.bussiness_name
        ).exclude(pk=self.pk).order_by('-date', '-id').first()
        
        prev_balance = previous.balance if previous else 0
        self.balance = prev_balance + (self.debit or 0) - (self.credit or 0)
        self.save()

    class Meta:
        indexes = [
            Index(fields=['account','period','bussiness_name','date','id']),
            Index(fields=['bussiness_name','date']),
        ]

class liabilities_ledger(models.Model):
    head = models.ForeignKey(journal_head, on_delete=models.PROTECT)
    account = models.ForeignKey(real_account, on_delete=models.PROTECT)
    period = models.ForeignKey(month_period, on_delete=models.PROTECT)
    transaction_number = models.CharField(max_length=100)
    date = models.DateField(default=date.today)
    type = models.CharField(default='', max_length=100)
    description = models.CharField(default='', max_length=100)
    debit = models.DecimalField(decimal_places=2, max_digits=10, default=Decimal("0.00"))
    credit = models.DecimalField(decimal_places=2, max_digits=10, default=Decimal("0.00"))
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    def update_balance(self):
        previous = liabilities_ledger.objects.filter(
            account=self.account, period=self.period, bussiness_name=self.bussiness_name
        ).exclude(pk=self.pk).order_by('-date', '-id').first()
        
        prev_balance = previous.balance if previous else 0
        self.balance = prev_balance + (self.credit or 0) - (self.debit or 0)
        self.save()

    class Meta:
        indexes = [
            Index(fields=['account','period','bussiness_name','date','id']),
        ]

class equity_ledger(models.Model):
    head = models.ForeignKey(journal_head, on_delete=models.PROTECT)
    account = models.ForeignKey(real_account, on_delete=models.PROTECT)
    period = models.ForeignKey(month_period, on_delete=models.PROTECT)
    transaction_number = models.CharField(max_length=100)
    date = models.DateField(default=date.today)
    type = models.CharField(default='', max_length=100)
    description = models.CharField(default='', max_length=100)
    debit = models.DecimalField(decimal_places=2, max_digits=10, default=Decimal("0.00"))
    credit = models.DecimalField(decimal_places=2, max_digits=10, default=Decimal("0.00"))
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    def update_balance(self):
        previous = equity_ledger.objects.filter(
            account=self.account, period=self.period, bussiness_name=self.bussiness_name
        ).exclude(pk=self.pk).order_by('-date', '-id').first()
        
        prev_balance = previous.balance if previous else 0
        self.balance = prev_balance + (self.credit or 0) - (self.debit or 0)
        self.save()

    class Meta:
        indexes = [
            Index(fields=['account','period','bussiness_name','date','id']),
        ]

class revenue_ledger(models.Model):
    head = models.ForeignKey(journal_head, on_delete=models.PROTECT)
    account = models.ForeignKey(real_account, on_delete=models.PROTECT)
    period = models.ForeignKey(month_period, on_delete=models.PROTECT)
    transaction_number = models.CharField(max_length=100)
    date = models.DateField(default=date.today)
    type = models.CharField(default='', max_length=100)
    description = models.CharField(default='', max_length=100)
    debit = models.DecimalField(decimal_places=2, max_digits=10, default=Decimal("0.00"))
    credit = models.DecimalField(decimal_places=2, max_digits=10, default=Decimal("0.00"))
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    def update_balance(self):
        previous = revenue_ledger.objects.filter(
            account=self.account, period=self.period, bussiness_name=self.bussiness_name
        ).exclude(pk=self.pk).order_by('-date', '-id').first()
        
        prev_balance = previous.balance if previous else 0
        self.balance = prev_balance + (self.credit or 0) - (self.debit or 0)
        self.save()

    class Meta:
        indexes = [
            Index(fields=['account','period','bussiness_name','date','id']),
        ]

class expenses_ledger(models.Model):
    head = models.ForeignKey(journal_head, on_delete=models.PROTECT)
    account = models.ForeignKey(real_account, on_delete=models.PROTECT)
    period = models.ForeignKey(month_period, on_delete=models.PROTECT)
    transaction_number = models.CharField(max_length=100)
    date = models.DateField(default=date.today)
    type = models.CharField(default='', max_length=100)
    description = models.CharField(default='', max_length=100)
    debit = models.DecimalField(decimal_places=2, max_digits=10, default=Decimal("0.00"))
    credit = models.DecimalField(decimal_places=2, max_digits=10, default=Decimal("0.00"))
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    def update_balance(self):
        previous = expenses_ledger.objects.filter(
            account=self.account, period=self.period, bussiness_name=self.bussiness_name
        ).exclude(pk=self.pk).order_by('-date', '-id').first()
        
        prev_balance = previous.balance if previous else 0
        self.balance = prev_balance + (self.debit or 0) - (self.credit or 0)
        self.save()

    class Meta:
        indexes = [
            Index(fields=['account','period','bussiness_name','date','id']),
        ]


class customer_ledger(models.Model):
    account = models.ForeignKey(customer, on_delete=models.CASCADE)
    head = models.ForeignKey(journal_head, on_delete=models.PROTECT)
    period = models.ForeignKey(month_period, on_delete=models.PROTECT)
    transaction_number = models.CharField(max_length=100)
    date = models.DateField(default=date.today)
    type = models.CharField(default='', max_length=100)
    description = models.CharField(default='', max_length=100)
    debit = models.DecimalField(decimal_places=2, max_digits=10, default=Decimal("0.00"))
    credit = models.DecimalField(decimal_places=2, max_digits=10, default=Decimal("0.00"))
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    def save(self, *args, **kwargs):
        last_entry = customer_ledger.objects.filter(
            account=self.account,
            bussiness_name=self.bussiness_name,
            period=self.period,
            date__lt=self.date
        ).order_by("-date", "-id").first()

        prev_balance = last_entry.balance if last_entry else 0

        self.balance = prev_balance + Decimal(self.debit or 0) - Decimal(self.credit or 0)

        super().save(*args, **kwargs)

    class Meta:
        indexes = [
            Index(fields=['account','bussiness_name','period','date','id']),
        ]

class supplier_ledger(models.Model):
    account = models.ForeignKey(supplier, on_delete=models.CASCADE)
    head = models.ForeignKey(journal_head, on_delete=models.PROTECT)
    period = models.ForeignKey(month_period, on_delete=models.PROTECT)
    transaction_number = models.CharField(max_length=100)
    date = models.DateField(default=date.today)
    type = models.CharField(default='', max_length=100)
    description = models.CharField(default='', max_length=100)
    debit = models.DecimalField(decimal_places=2, max_digits=10, default=Decimal("0.00"))
    credit = models.DecimalField(decimal_places=2, max_digits=10, default=Decimal("0.00"))
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    def save(self, *args, **kwargs):
        last_entry = supplier_ledger.objects.filter(
            account=self.account,
            bussiness_name=self.bussiness_name,
            period=self.period,
            date__lt=self.date
        ).order_by("-date", "-id").first()

        prev_balance = last_entry.balance if last_entry else 0

        self.balance = prev_balance + Decimal(self.credit or 0) - Decimal(self.debit or 0)

        super().save(*args, **kwargs)

    class Meta:
        indexes = [
            Index(fields=['account','bussiness_name','period','date','id']),
        ]


class journal(models.Model):
    date = models.DateField(auto_now_add=True)
    head = models.ForeignKey(journal_head, on_delete=models.PROTECT)
    entry_type = models.CharField(max_length=100, default='')
    transaction_number = models.CharField(max_length=100, default='')
    description = models.CharField(max_length=100, default='')
    debit = models.CharField(max_length=100, default='')
    credit = models.CharField(max_length=100, default='')
    amount = models.DecimalField(decimal_places=2, max_digits=10, default=Decimal("0.00"))
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','date']),
            Index(fields=['head']),
        ]

class payment(models.Model):
    date = models.DateField(auto_now_add=True)
    code = models.CharField(max_length=20, unique=True, blank=True)
    ref_type = models.CharField(max_length=20, default='')
    external_no = models.CharField(max_length=50, default='')
    transaction_number = models.CharField(max_length=100)
    created_by = models.ForeignKey(current_user, on_delete=models.PROTECT)
    description = models.CharField(max_length=100, default='')
    from_account = models.CharField(max_length=100, default='')
    to_account = models.CharField(max_length=100, default='')
    status = models.CharField(max_length=100, default='Done')
    amount = models.DecimalField(decimal_places=2, max_digits=10, default=Decimal("0.00"))
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)
    is_reversed = models.BooleanField(default=False)

    def generate_next_code(self):
        id = self.bussiness_name.pk
        year = self.date.year if self.date else datetime.now().year
        last = payment.objects.filter(bussiness_name=self.bussiness_name, date__year=year).order_by('-id').first()
        next_code = 1 if not last else int(last.code[-5:]) + 1
        return f"PMT{id}-{year}{next_code:05d}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self.generate_next_code()
        super().save(*args, **kwargs)

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','date']),
            Index(fields=['code']),
            Index(fields=['created_by']),
        ]

class cash_receipt(models.Model):
    date = models.DateField(auto_now_add=True)
    code = models.CharField(max_length=20, unique=True, blank=True)
    ref_type = models.CharField(max_length=20, default='')
    external_no = models.CharField(max_length=50, default='')
    transaction_number = models.CharField(max_length=100, default='')
    created_by = models.ForeignKey(current_user, on_delete=models.PROTECT)
    description = models.CharField(max_length=100, default='')
    from_account = models.CharField(max_length=100, default='')
    to_account = models.CharField(max_length=100, default='')
    status = models.CharField(max_length=100, default='Done')
    amount = models.DecimalField(decimal_places=2, max_digits=10, default=Decimal("0.00"))
    bussiness_name = models.ForeignKey(bussiness, on_delete=models.CASCADE)
    is_reversed = models.BooleanField(default=False)

    def generate_next_code(self):
        id = self.bussiness_name.pk
        year = self.date.year if self.date else datetime.now().year
        last = cash_receipt.objects.filter(bussiness_name=self.bussiness_name, date__year=year).order_by('-id').first()
        next_code = 1 if not last else int(last.code[-5:]) + 1
        return f"CSHR{id}-{year}{next_code:05d}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self.generate_next_code()
        super().save(*args, **kwargs)

    class Meta:
        indexes = [
            Index(fields=['bussiness_name','date']),
            Index(fields=['code']),
            Index(fields=['created_by']),
        ]


class item_balance(models.Model):
    item = models.ForeignKey(items, on_delete=models.CASCADE)
    business = models.ForeignKey(bussiness, on_delete=models.CASCADE)
    period = models.ForeignKey(month_period, on_delete=models.PROTECT)
    opening_quantity = models.IntegerField(default=0)
    closing_quantity = models.IntegerField(default=0)
    quantity_sold = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    value_sold = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    quantity_purchased = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    value_purchased = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    opening_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    closing_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        indexes = [
            Index(fields=['item','business','period']),
        ]

class account_balance(models.Model):
    account = models.ForeignKey(real_account, on_delete=models.PROTECT)
    business = models.ForeignKey(bussiness, on_delete=models.PROTECT)
    period = models.ForeignKey(month_period, on_delete=models.PROTECT)
    opening_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    closing_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    debit_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    credit_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        indexes = [
            Index(fields=['account','business','period']),
        ]

class customer_balance(models.Model):
    customer = models.ForeignKey(customer, on_delete=models.PROTECT)
    business = models.ForeignKey(bussiness, on_delete=models.PROTECT)
    period = models.ForeignKey(month_period, on_delete=models.PROTECT)
    opening_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    closing_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    debit_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    credit_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        indexes = [
            Index(fields=['customer','business','period']),
        ]

class supplier_balance(models.Model):
    supplier = models.ForeignKey(supplier, on_delete=models.PROTECT)
    business = models.ForeignKey(bussiness, on_delete=models.PROTECT)
    period = models.ForeignKey(month_period, on_delete=models.PROTECT)
    opening_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    closing_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    debit_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    credit_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        indexes = [
            Index(fields=['supplier','business','period']),
        ]
