from . import models

class Permissions:
    def __init__(self, company, user, business):
        self.business = models.bussiness.objects.get(company_id=company, bussiness_name=business)
        self.user = models.current_user.objects.get(bussiness_name=self.business, user_name=user)

    def general_permissions(self):
        if self.user.admin:
            locations = models.inventory_location.objects.filter(bussiness_name=self.business).values('location_name')

        else:
            locations = self.user.per_location_access

        access = {'admin':self.user.admin, 'per_location_access':locations, 'create_access':self.user.create_access,
                'reverse_access':self.user.reverse_access, 'journal_access':self.user.journal_access, 'coa_access':self.user.coa_acess, 'item_access':self.user.item_access,
                'transfer_access':self.user.transfer_access, 'sales_access':self.user.sales_access, 'purchase_access':self.user.purchase_access,
                'location_access':self.user.location_access, 'customer_access':self.user.customer_access, 'supplier_access':self.user.supplier_access,
                'cash_access':self.user.cash_access, 'payment_access':self.user.payment_access, 'report_access':self.user.report_access, 'settings_access':self.user.settings_access,
                'edit_access':self.user.edit_access, 'purchase_price_access':self.user.purchase_price_access, 'dashboard_access':self.user.dashboard_access,
                'add_self.user_access':self.user.add_user_access, 'give_access':self.user.give_access, 'info_access':self.user.info_access}
        
        return access