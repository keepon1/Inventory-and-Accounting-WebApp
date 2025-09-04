from rest_framework import serializers
from . import models

class company_info(serializers.ModelSerializer):
    class Meta:
        model = models.company_info
        fields = ('id', 'company_name', 'owner_name', 'email', 'phone_number')