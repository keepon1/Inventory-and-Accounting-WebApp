from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny
from rest_framework import status
from rest_framework.decorators import api_view
from google.oauth2 import id_token
from google.auth.transport import requests
from django.core.paginator import Paginator
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.core.validators import EmailValidator
from django.core.exceptions import ValidationError
from django.db import transaction
from . import models, coa, inventory_item, transfer, inventory_location, inventory_sales, inventory_purchase
from . import payment_journal, cash_journal, general_journal, report, user_permissions
from django.db.models import Sum, F, Count, Q
from datetime import date, datetime
import json
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def register(request):
    if request.method == 'POST':
        data = request.data
        company = (data['company']).strip()
        email = (data['email']).lower().strip()
        password = data['password']
        name = data['name']

        if User.objects.filter(username=company).exists():
            data = {'company':company, 'email':email, 'password':password, 'name':name}
            return Response({'status':'name_exist'})
        
        if models.bussiness.objects.filter(bussiness_name=company).exists():
            data = {'company':company, 'email':email, 'password':password, 'name':name}
            return Response({'status':'name_exist'})
        
        elif User.objects.filter(email=email).exists():
            data = {'company':company, 'email':email, 'password':password, 'name':name}
            return Response(data)
        
        else:
            try:
                with transaction.Atomic(savepoint=False, durable=True, using='default'):
                    newuser = User.objects.create_user(
                            first_name='', 
                            last_name=name,
                            username=company,
                            password=password,
                            email=email
                        )
                
                
                    newuser.save()
                    company_user = models.company_info(
                        company_name = company, 
                        owner_name = name, 
                        email = email, 
                        phone_number = '0', 
                        )
                    company_user.save()

                    new_business = models.bussiness.objects.create(bussiness_name=company,
                        location='',
                        company=newuser,
                        description='',
                        user_created=name,
                        new=True
                    )
                
                    users = models.current_user.objects.create(user_name=name, email=email, admin=True,
                                                bussiness_name=new_business, google=False)
                    
                    users.set_password(password)

                login(request, newuser, backend='django.contrib.auth.backends.ModelBackend')
                refresh = RefreshToken.for_user(newuser)
                accesses = user_permissions.Permissions(company=newuser.pk, business=new_business, user=users.user_name).general_permissions()
                data = {
                        'business': new_business.bussiness_name,
                        'user': users.user_name,
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                        'accesses':accesses
                        }
                
                default_units = [
                    ("Piece", "pc", "Individual piece"),
                    ("Box", "bx", "Box of items"),
                    ("Carton", "ctn", "Carton package"),
                    ("Kilogram", "kg", "Weight-based unit"),
                    ("Litre", "l", "Liquid volume unit")
                ]

                for name, suffix, desc in default_units:
                    models.inventory_unit.objects.create(
                        name=name,
                        suffix=suffix,
                        description=desc,
                        bussiness_name=new_business
                    )
                models.inventory_category.objects.create(name='Initial Category', description='Created Initially With Business',
                                                        bussiness_name=new_business)
                models.inventory_location.objects.create(location_name='Initial Location', description='Created Initially With Business',
                                                         created_by=users, bussiness_name=new_business)
                
                models.tracking_history.objects.create(user=users, area="Create business", head=new_business.bussiness_name, bussiness_name=new_business)

                return Response({'status':'done', 'data':data})

            except Exception as error:
                print(error)
                return Response({'status':'error'})
    
    return Response()

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def sign(request):
    if request.method == 'POST':
        data = request.data
        company = data['company']
        email = data['email']
        password = data['password']
        
        if not models.bussiness.objects.filter(bussiness_name=company.strip()).exists():   
            return Response('Mismatched details')
        
        else:
            business = models.bussiness.objects.get(bussiness_name=company)
            company_query = business.company

            user_name = models.current_user.objects.get(bussiness_name=business, user_name=email)

            if user_name and user_name.password.strip() == '':
                return Response('set password')
            
            if user_name.checks_password(password):
    
                login(request, company_query,  backend='django.contrib.auth.backends.ModelBackend')
                refresh = RefreshToken.for_user(company_query)
                accesses = user_permissions.Permissions(company=company_query.pk, business=business, user=user_name.user_name).general_permissions()
                data = {
                    'user': user_name.user_name,
                    'business': business.bussiness_name,
                    'refresh': str(refresh), 
                    'access': str(refresh.access_token),
                    "accesses": accesses
                    }
                    
                return Response(data, status=status.HTTP_200_OK)
            else:
                return Response('Incorrect password')
    return Response()

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def sign_in_google(request):
    if request.method == 'POST':
        token = request.data.get("token")
        try:
            with transaction.atomic(savepoint=False, using='default', durable=False):
                idinfo = id_token.verify_oauth2_token(
                    token,
                    requests.Request(),
                    "970238751478-kphk2t22l326k0ss8lfn286ablpoirt8.apps.googleusercontent.com"
                )

                email = idinfo["email"]
                full_name = idinfo.get("name", "")
                first_name = idinfo.get("given_name", "")
                last_name = idinfo.get("family_name", "")

                users = models.current_user.objects.filter(email=email.strip())

                if not users.exists():
                    user = User.objects.create(username=email, first_name=first_name, last_name=last_name, email=email)
                    models.company_info.objects.create(
                        company_name = email, 
                        owner_name = full_name, 
                        email = email, 
                        phone_number = '0', 
                    )
                    

                    business = models.bussiness.objects.create(bussiness_name=email,
                        location='',
                        company=user,
                        description='',
                        user_created=full_name,
                        new=True,
                        google=True
                    )
                    
                    users = models.current_user.objects.create(user_name=full_name, email=email, admin=True,
                                                bussiness_name=business, google=True)
                    
                    default_units = [
                        ("Piece", "pc", "Individual piece"),
                        ("Box", "bx", "Box of items"),
                        ("Carton", "ctn", "Carton package"),
                        ("Kilogram", "kg", "Weight-based unit"),
                        ("Litre", "l", "Liquid volume unit")
                    ]

                    for name, suffix, desc in default_units:
                        models.inventory_unit.objects.create(
                            name=name,
                            suffix=suffix,
                            description=desc,
                            bussiness_name=business
                        )
                    models.inventory_category.objects.create(name='Initial Category', description='Created Initially With Business',
                                                            bussiness_name=business)
                    models.inventory_location.objects.create(location_name='Initial Location', description='Created Initially With Business',
                                                            created_by=users, bussiness_name=business)
                    
                    models.tracking_history.objects.create(user=users, area="Create business", head=business.bussiness_name, bussiness_name=business)

                else:
                    name_list = users.values_list('user_name', flat=True)

                    users = models.current_user.objects.get(email=email)
                    business = users.bussiness_name
                    user = business.company
                    if not users.user_name.strip():
                        base_name = full_name
                        counter = 1
                        while full_name in name_list:
                            full_name = f"{base_name}{counter}"
                            counter += 1

                        users.user_name = full_name
                        users.save()
                    
                    models.tracking_history.objects.create(user=users, area="Create business", head=business.bussiness_name, bussiness_name=business)
                
            login(request, user,  backend='django.contrib.auth.backends.ModelBackend')
            
            refresh = RefreshToken.for_user(user)

            accesses = user_permissions.Permissions(company=user.pk, business=business, user=users.user_name).general_permissions()

            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "business": business.bussiness_name,
                "user": users.user_name,
                'status': 'done',
                "accesses": accesses
            })

        except ValueError as e:
            logger.warning(f"ValueError: {e}")
            return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)

        
        except Exception as error:
            logger.error(str(error))
            return Response({'error': 'something happened'})
        
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def set_password(request):
    if request.method == 'POST':
        data = request.data
        business = data['business']
        name = data['name']
        password = data['password']

        try:
            business_query = models.bussiness.objects.filter(bussiness_name=business).first()
            company_query = business_query.company
            user_query = models.current_user.objects.filter(user_name=name, bussiness_name=business_query).first()

            with transaction.atomic(using='default', savepoint=False, durable=False):
                user_query.set_password(password)

                models.tracking_history.objects.create(user=user_query, area="Set User Password", head=user_query.user_name, bussiness_name=business_query)

            login(request, company_query,  backend='django.contrib.auth.backends.ModelBackend')
            refresh = RefreshToken.for_user(company_query)

            accesses = user_permissions.Permissions(company=company_query.pk, business=business, user=user_query.user_name).general_permissions()

            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "business": business_query.bussiness_name,
                "user": user_query.user_name,
                'status': 'done',
                "accesses": accesses
            })

        except Exception as error:
            logger.warning(error)
            return Response('something happened')
    

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def select_bussiness(request):
    try:
        company = request.user
        business = request.data['business']
        user = request.data['user']
        company_info = {'company':company.username, 'email':company.email}

        b_data = models.bussiness.objects.filter(company_id=company.id, bussiness_name=business).first()
        user_query = models.current_user.objects.filter(bussiness_name=b_data, user_name=user).first()

        if not user_query:
            return Response('access error')
        
        business = [{'b_name':b_data.bussiness_name, 'location':b_data.location, 'new':b_data.new, 'google':b_data.google}] 

        data = {'company_info':company_info, 'business':business}

        return Response(data)
    
    except ValueError as value:
        logger.warning(value)
        return Response('value error')
    
    except Exception as error:
        logger.warning(error)
        return Response('something happened')


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def add_business(request):
    if request.method == 'POST':
        data = request.data
        business = data['business'].strip()
        location = data['location'].strip()
        description = data['description'].strip()
        user_created = data['name'].strip()
        password = data['password']

        if models.bussiness.objects.filter(bussiness_name=business, company_id=request.user.id).exists():
            
            return Response('Business Name Exist')
        try:
            with transaction.atomic(savepoint=False, durable=True, using='default'):
                new_business = models.bussiness.objects.create(bussiness_name=business,
                                location=location,
                                company_id=request.user.id,
                                description=description,
                                user_created=user_created)
                
                user = models.current_user.objects.create(user_name=user_created, admin=True,
                                            bussiness_name=new_business)
                user.set_password(password)

                models.tracking_history.objects.create(user=user, area="Create business", head=new_business.bussiness_name, bussiness_name=new_business)

                default_units = [
                    ("Piece", "pc", "Individual piece"),
                    ("Box", "bx", "Box of items"),
                    ("Carton", "ctn", "Carton package"),
                    ("Kilogram", "kg", "Weight-based unit"),
                    ("Litre", "l", "Liquid volume unit")
                ]

                for name, suffix, desc in default_units:
                    models.inventory_unit.objects.create(
                        name=name,
                        suffix=suffix,
                        description=desc,
                        bussiness_name=new_business
                    )
                models.inventory_category.objects.create(name='Initial Category', description='Created Initially With Business',
                                                        bussiness_name=new_business)
                models.inventory_location.objects.create(location_name='Initial Location', description='Created Initially With Business',
                                                         created_by=user, bussiness_name=new_business)
            return Response('successful')
        except Exception as error:
            print(error)
            return Response('')
        
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def sign_out1(request):
    logout(request)
    return Response('')


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def verify_user(request):
    business_name = request.data['business']
    new_name = request.data['new_business']
    user = request.data['user']

    try:
        with transaction.Atomic(using='default', savepoint=False, durable=False):
            if models.bussiness.objects.filter(bussiness_name=new_name).exists():
                return Response('business name already exist')
            
            business = models.bussiness.objects.get(bussiness_name=business_name, company_id=request.user.id)

            user_query = models.current_user.objects.filter(bussiness_name=business, user_name=user).first()

            if not user_query.admin:
                return Response('no access')
            
            business.bussiness_name = new_name.strip()
            business.new = False
            business.save()
            '''user = models.current_user.objects.get(bussiness_name=business, user_name=user_name)

            if user.admin:
                locations = models.inventory_location.objects.filter(bussiness_name=business)
                locations = [i.location_name for i in locations]

            else:
                locations = user.per_location_access

            access = {'admin':user.admin, 'per_location_access':locations, 'create_access':user.create_access,
                'reverse_access':user.reverse_access, 'journal_access':user.journal_access, 'coa_access':user.coa_acess, 'item_access':user.item_access,
                'transfer_access':user.transfer_access, 'sales_access':user.sales_access, 'purchase_access':user.purchase_access,
                'location_access':user.location_access, 'customer_access':user.customer_access, 'supplier_access':user.supplier_access,
                'cash_access':user.cash_access, 'payment_access':user.payment_access, 'report_access':user.report_access, 'settings_access':user.settings_access,
                'edit_access':user.edit_access, 'purchase_price_access':user.purchase_price_access, 'dashboard_access':user.dashboard_access,
                'add_user_access':user.add_user_access, 'give_access':user.give_access, 'info_access':user.info_access}

            if state == True:
                if user.checks_password(password):
                    models.tracking_history.objects.create(user=user, area='Sign In', head=business, bussiness_name=business)
                    return Response({'access':access, 'message':'verified'})
                else:
                    return Response('')
            
            if state == False:
                with transaction.Atomic(using='default', savepoint=False, durable=False):
                    user.set_password(password)'''
            models.tracking_history.objects.create(user=user_query, area='Set business', head=business.bussiness_name, bussiness_name=business)

        return Response({'status':'done', 'data':business.bussiness_name})
            
    except ValueError as error:
        logger.warning(error)
        return Response('')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def check_password(request):
    if request.method == 'POST':
        business = request.data['business']
        user = request.data['user']

        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
        user_password = models.current_user.objects.get(bussiness_name=business, user_name=user)

        if user_password.password.strip() != '':
            return Response('exist')
        else:
            return Response('new')
    
    return Response('')


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def view_business(request):
    if request.method == 'POST':
        business = request.data['business']
        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)

        result = {'name':business.bussiness_name, 'description':business.description,
                  'address':business.address, 'location':business.location, 'email':business.email,
                  'contact':business.telephone}
        
    return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def edit_business(request):
    if request.method == 'POST':
        data = request.data['data']
        business = request.data['business']
        user = request.data['user']

        if data['name'].strip() == '':
            return Response('text_error')
        if models.bussiness.objects.filter(bussiness_name=data['name'], company_id=request.user.id).exclude(bussiness_name=business).exists():
            return Response('exist')
        try:
            with transaction.atomic(savepoint=False, durable=False, using='default'):
                business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
                business.bussiness_name = data['name']
                business.location = data['location']
                business.address = data['address']
                business.telephone = data['contact']
                business.email = data['email']
                business.description = data['description']

                business.save()
                user = models.current_user.objects.get(user_name=user, bussiness_name=business)
                models.tracking_history.objects.create(user=user, area=f'Edit business: {business.bussiness_name}', head=business, bussiness_name=business)

                return Response('done')
        except Exception as error:
            print(error)
            return Response('error')



@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_user(request):
    if request.method == 'POST':
        data = request.data
        business = models.bussiness.objects.get(bussiness_name=data['business'], company_id=request.user.id)
        users = models.current_user.objects.filter(bussiness_name=business)
        user_name = [{'user':i.user_name} for i in users]
    return Response(user_name)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def main_dashboard(request):
    if request.method == 'POST':
        user = request.data['user'].strip()
        business = request.data['business'].strip()

        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
        user = models.current_user.objects.get(bussiness_name=business, user_name=user)

        if user.admin:
            locations = models.inventory_location.objects.filter(bussiness_name=business)
            locations = [i.location_name for i in locations]

        else:
            locations = user.per_location_access

        access = {'admin':user.admin, 'per_location_access':locations, 'create_access':user.create_access,
                'reverse_access':user.reverse_access, 'journal_access':user.journal_access, 'coa_access':user.coa_acess, 'item_access':user.item_access,
                'transfer_access':user.transfer_access, 'sales_access':user.sales_access, 'purchase_access':user.purchase_access,
                'location_access':user.location_access, 'customer_access':user.customer_access, 'supplier_access':user.supplier_access,
                'cash_access':user.cash_access, 'payment_access':user.payment_access, 'report_access':user.report_access, 'settings_access':user.settings_access,
                'edit_access':user.edit_access, 'purchase_price_access':user.purchase_price_access, 'dashboard_access':user.dashboard_access,
                'add_user_access':user.add_user_access, 'give_access':user.give_access, 'info_access':user.info_access}

        return Response(access)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_category(request):
    if request.method == 'POST':
        business = request.data['business']
        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
        items = models.inventory_category.objects.filter(bussiness_name=business).annotate(
            value=F('name'),
            label=F('name')
        ).values('value', 'label')
    
    return Response(items)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_unit(request):
    if request.method == 'POST':
        business = request.data['business']
        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
        items = models.inventory_unit.objects.filter(bussiness_name=business).annotate(
            value=F('suffix'),
            label=F('suffix')
        ).values('value', 'label')
    
    return Response(items)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_supplier(request):
    if request.method == 'POST':
        try:
            business = request.data['business']
            search = request.data['value']

            verify_data = (isinstance(business, str) and business.strip() and isinstance(search, str))

            if not verify_data:
                return Response('text_error')

            business_query = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)

            suppliers = models.supplier.objects.filter(bussiness_name=business_query)

            if search:
                suppliers = suppliers.filter(name__icontains=search)

            suppliers = suppliers.order_by('name')[:20].annotate(
                value=F('name'),
                label=F('name')
            ).values('value', 'label')
            
            return Response(suppliers)
        
        except models.bussiness.DoesNotExist:
            logger.warning(f"Business '{business}' not found.")
            return Response("Business not found")
        
        except Exception as error:
            logger.exception('unhandled error')
            return Response('something happened')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_customer(request):
    if request.method == 'POST':
        try:
            business = request.data['business']
            search = request.data['value']

            verify_data = (isinstance(business, str) and business.strip() and isinstance(search, str))

            if not verify_data:
                return Response('text_error')

            business_query = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)

            customers = models.customer.objects.filter(bussiness_name=business_query).exclude(name='Regular Customer')

            if search:
                customers = customers.filter(name__icontains=search)

            customers = customers.order_by('name')[:20].annotate(
                value=F('name'),
                label=F('name')
            ).values('value', 'label')
            
            return Response(customers)
        
        except models.bussiness.DoesNotExist:
            logger.warning(f"Business '{business}' not found.")
            return Response("Business not found")
        
        except Exception as error:
            logger.exception('unhandled error')
            return Response('something happened')
        
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_tax_levy(request):
    if request.method == 'POST':
        try:
            business = request.data['business']
            search = request.data['value']

            verify_data = (isinstance(business, str) and business.strip() and isinstance(search, str))

            if not verify_data:
                return Response('text_error')

            business_query = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)

            tax_levy = models.taxes_levies.objects.filter(bussiness_name=business_query)

            if search:
                tax_levy = tax_levy.filter(name__icontains=search)

            tax_levy = tax_levy.order_by('name')[:20]

            tax_levy = [{'value':i.name, 'label':f'{i.name} - {i.rate}%', 'rate':i.rate} for i in tax_levy]
        
            return Response(tax_levy)
        
        except models.bussiness.DoesNotExist:
            logger.warning(f"Business '{business}' not found.")
            return Response("Business not found")
        
        except Exception as error:
            logger.exception('unhandled error')
            return Response('something happened')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_taxes(request):
    if request.method == 'POST':
        business = request.data['business']
        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
        items = models.taxes_levies.objects.filter(bussiness_name=business).values(
            'name', 'rate', 'type', 'description'
        )
    
    return Response(items)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def add_tax(request):
    if request.method == 'POST':
        data= request.data['detail']
        business = request.data['business']

        if data['name'].strip() == '' or Decimal(str(data['rate'])) <= 0.00 or data['type'] == '':
            return Response('text_error')
        
        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)

        if models.taxes_levies.objects.filter(name=data['name'], bussiness_name=business).exists():
            return Response('exist')
        
        try:
            with transaction.atomic(durable=False, savepoint=False, using='default'):
                models.taxes_levies.objects.create(name=data['name'], rate=data['rate'],
                            type=data['type'], description=data['description'], bussiness_name=business)

                return Response('done')
            
        except Exception as error:
            print(error)
            return Response('error')
        
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def edit_tax(request):
    if request.method == 'POST':
        data= request.data['detail']
        business = request.data['business']

        if data['original'].strip() == '' or data['name'].strip() == '' or Decimal(str(data['rate'])) <= 0.00 or data['type'] == '':
            return Response('text_error')
        
        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)

        if models.taxes_levies.objects.filter(name=data['name'], bussiness_name=business).exclude(name=data['original']).exists():
            return Response('exist')
        
        try:
            with transaction.atomic(durable=False, savepoint=False, using='default'):
                tax = models.taxes_levies.objects.get(name=data['original'], bussiness_name=business)
                tax.name = data['name']
                tax.rate = data['rate']
                tax.type = data['type']
                tax.description = data['description']
                tax.save()
                
                return Response('done')
            
        except Exception as error:
            print(error)
            return Response('error')
        
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_tax(request):
    if request.method == 'POST':
        tax = request.data['tax']
        business = request.data['business']

        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
        tax = models.taxes_levies.objects.get(bussiness_name=business, name=tax)

        result = {'name': tax.name, 'rate': tax.rate, 'type':{'value':tax.type, 'label':tax.type}, 'description':tax.description}
        
        return Response(result)
    
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_currencies(request):
    if request.method == 'POST':
        business = request.data['business']
        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
        items = models.currency.objects.filter(bussiness_name=business).values(
            'name', 'symbol', 'rate'
        )
    
    return Response(items)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def add_currency(request):
    if request.method == 'POST':
        data= request.data['detail']
        business = request.data['business']

        if data['name'].strip() == '' or Decimal(str(data['rate'])) <= 0.00 or data['symbol'] == '':
            return Response('text_error')
        
        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)

        if models.currency.objects.filter(name=data['name'], bussiness_name=business).exists():
            return Response('exist')
        
        try:
            with transaction.atomic(durable=False, savepoint=False, using='default'):
                models.currency.objects.create(name=data['name'], rate=data['rate'],
                            symbol=data['symbol'], bussiness_name=business)

                return Response('done')
            
        except Exception as error:
            print(error)
            return Response('error')
        
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def edit_currency(request):
    if request.method == 'POST':
        data= request.data['detail']
        business = request.data['business']

        if data['original'].strip() == '' or data['name'].strip() == '' or Decimal(str(data['rate'])) <= 0.00:
            return Response('text_error')
        
        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)

        if models.currency.objects.filter(name=data['name'], bussiness_name=business).exclude(name=data['original']).exists():
            return Response('exist')
        
        try:
            with transaction.atomic(durable=False, savepoint=False, using='default'):
                tax = models.currency.objects.get(name=data['original'], bussiness_name=business)
                tax.name = data['name']
                tax.rate = data['rate']
                tax.symbol = data['symbol']
                tax.save()
                
                return Response('done')
            
        except Exception as error:
            print(error)
            return Response('error')
        
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_currency(request):
    if request.method == 'POST':
        tax = request.data['currency']
        business = request.data['business']

        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
        tax = models.currency.objects.get(bussiness_name=business, name=tax)

        result = {'name': tax.name, 'rate': tax.rate, 'symbol':tax.symbol}
        
        return Response(result)
    
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_measurement_units(request):
    if request.method == 'POST':
        business = request.data['business']
        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
        items = models.inventory_unit.objects.filter(bussiness_name=business).values(
            'name', 'suffix', 'description'
        )
    
    return Response(items)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def add_measurement_unit(request):
    if request.method == 'POST':
        data= request.data['detail']
        business = request.data['business']

        if data['name'].strip() == '' or data['suffix'] == '':
            return Response('text_error')
        
        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)

        if models.inventory_unit.objects.filter(name=data['name'], bussiness_name=business).exists():
            return Response('exist')
        
        try:
            with transaction.atomic(durable=False, savepoint=False, using='default'):
                models.inventory_unit.objects.create(name=data['name'], suffix=data['suffix'],
                            description=data['description'], bussiness_name=business)

                return Response('done')
            
        except Exception as error:
            print(error)
            return Response('error')
        
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def edit_measurement_unit(request):
    if request.method == 'POST':
        data= request.data['detail']
        business = request.data['business']

        if data['original'].strip() == '' or data['name'].strip() == '' or data['suffix'].strip() == '':
            return Response('text_error')
        
        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)

        if models.inventory_unit.objects.filter(name=data['name'], bussiness_name=business).exclude(name=data['original']).exists():
            return Response('exist')
        
        try:
            with transaction.atomic(durable=False, savepoint=False, using='default'):
                tax = models.inventory_unit.objects.get(name=data['original'], bussiness_name=business)
                tax.name = data['name']
                tax.suffix = data['suffix']
                tax.description = data['description']
                tax.save()
                
                return Response('done')
            
        except Exception as error:
            print(error)
            return Response('error')
        
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_measurement_unit(request):
    if request.method == 'POST':
        tax = request.data['unit']
        business = request.data['business']

        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
        tax = models.inventory_unit.objects.get(bussiness_name=business, name=tax)

        result = {'name': tax.name, 'suffix': tax.suffix, 'description':tax.description}
        
    return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_categories(request):
    if request.method == 'POST':
        business = request.data['business']
        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
        items = models.inventory_category.objects.filter(bussiness_name=business).values(
            'name', 'description'
        )
    
    return Response(items)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def add_category(request):
    if request.method == 'POST':
        data= request.data['detail']
        business = request.data['business']

        if data['name'].strip() == '':
            return Response('text_error')
        
        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)

        if models.inventory_category.objects.filter(name=data['name'], bussiness_name=business).exists():
            return Response('exist')
        
        try:
            with transaction.atomic(durable=False, savepoint=False, using='default'):
                models.inventory_category.objects.create(name=data['name'],
                            description=data['description'], bussiness_name=business)

                return Response('done')
            
        except Exception as error:
            print(error)
            return Response('error')
        
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def edit_category(request):
    if request.method == 'POST':
        data= request.data['detail']
        business = request.data['business']

        if data['original'].strip() == '' or data['name'].strip() == '':
            return Response('text_error')
        
        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)

        if models.inventory_category.objects.filter(name=data['name'], bussiness_name=business).exclude(name=data['original']).exists():
            return Response('exist')
        
        try:
            with transaction.atomic(durable=False, savepoint=False, using='default'):
                tax = models.inventory_category.objects.get(name=data['original'], bussiness_name=business)
                tax.name = data['name']
                tax.description = data['description']
                tax.save()
                
                return Response('done')
            
        except Exception as error:
            print(error)
            return Response('error')
        
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_category(request):
    if request.method == 'POST':
        tax = request.data['category']
        business = request.data['business']

        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
        tax = models.inventory_category.objects.get(bussiness_name=business, name=tax)

        result = {'name': tax.name, 'description':tax.description}
        
    return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_users(request):
    if request.method == 'POST':
        business = request.data['business']
        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
        items = models.current_user.objects.filter(bussiness_name=business).values(
            'user_name', 'admin', 'per_location_access'
        )
    
    return Response(items)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def add_user(request):
    if request.method == 'POST':
        data = request.data['detail']
        business = request.data['business']
        email = data['email'].strip()

        try:
            EmailValidator()(email)

            if data['user_name'].strip() == '' or str(data['admin']).strip() == '':
                return Response('text_error')
            
            business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)

            if models.current_user.objects.filter(user_name=data['user_name'], bussiness_name=business).exists():
                return Response('exist')
            
            if models.current_user.objects.filter(email=email).exists():
                return Response('email_exist')
        
        
            with transaction.atomic(durable=False, savepoint=False, using='default'):
                models.current_user.objects.create(user_name=data['user_name'], email=email,
                            admin=data['admin'], bussiness_name=business)

                return Response('done')
            
        except ValidationError as valid_error:
            logger.warning(valid_error)
            return Response('email_error')
            
        except Exception as error:
            print(error)
            return Response('error')
        
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def edit_user(request):
    if request.method == 'POST':
        data= request.data['detail']
        business = request.data['business']

        if data['original'].strip() == '' or data['user_name'].strip() == '' or str(data['admin']).strip() == '':
            return Response('text_error')
        
        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)

        if models.current_user.objects.filter(user_name=data['user_name'], bussiness_name=business).exclude(user_name=data['original']).exists():
            return Response('exist')
        
        try:
            with transaction.atomic(durable=False, savepoint=False, using='default'):
                tax = models.current_user.objects.get(user_name=data['original'], bussiness_name=business)
                tax.user_name = data['user_name']
                tax.admin = data['admin']
                tax.save()
                
                return Response('done')
            
        except Exception as error:
            print(error)
            return Response('error')
        
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_user_detail(request):
    if request.method == 'POST':
        tax = request.data['username']
        business = request.data['business']

        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
        tax = models.current_user.objects.get(bussiness_name=business, user_name=tax)

        result = {'user_name': tax.user_name, 'admin':tax.admin}
        
    return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_user_access(request):
    if request.method == 'POST':
        tax = request.data['username']
        business = request.data['business']

        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
        tax = models.current_user.objects.get(bussiness_name=business, user_name=tax)


        result = {'user_name': tax.user_name, 'admin':tax.admin, 'per_location_access':tax.per_location_access, 'create_access':tax.create_access,
        'reverse_access':tax.reverse_access, 'journal_access':tax.journal_access, 'coa_access':tax.coa_acess, 'item_access':tax.item_access,
        'transfer_access':tax.transfer_access, 'sales_access':tax.sales_access, 'purchase_access':tax.purchase_access,
        'location_access':tax.location_access, 'customer_access':tax.customer_access, 'supplier_access':tax.supplier_access,
        'cash_access':tax.cash_access, 'payment_access':tax.payment_access, 'report_access':tax.report_access, 'settings_access':tax.settings_access,
        'edit_access':tax.edit_access, 'purchase_price_access':tax.purchase_price_access, 'dashboard_access':tax.dashboard_access,
        'add_user_access':tax.add_user_access, 'give_access':tax.give_access, 'info_access':tax.info_access}

    return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def edit_user_permissions(request):
    if request.method == 'POST':
        business = request.data['business']
        data = request.data['detail']
        
        verify_data = (
            isinstance(business, str) and business.strip() and
            isinstance(data.get('user_name'), str) and data['user_name'].strip() and
            isinstance(data.get('per_location_access'), list) and
            all(isinstance(v, bool) for k, v in data.items() if k not in ['user_name', 'per_location_access'])
        )

        if not verify_data:
            return Response('text_error')
        
        try:
            with transaction.atomic(savepoint=False, durable=False, using='default'):
                business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
                user = models.current_user.objects.get(user_name=data['user_name'], bussiness_name=business)
                user.admin = data['admin']
                user.per_location_access = data['per_location_access']
                user.create_access = data['create_access']
                user.reverse_access = data['reverse_access']
                user.journal_access = data['journal_access']
                user.coa_acess = data['coa_access']
                user.item_access = data['item_access']
                user.transfer_access = data['transfer_access']
                user.sales_access = data['sales_access']
                user.purchase_access = data['purchase_access']
                user.location_access = data['location_access']
                user.customer_access = data['customer_access']
                user.supplier_access = data['supplier_access']
                user.cash_access = data['cash_access']
                user.payment_access = data['payment_access']
                user.report_access = data['report_access']
                user.settings_access = data['settings_access']
                user.edit_access = data['edit_access']
                user.purchase_price_access = data['purchase_price_access']
                user.dashboard_access = data['dashboard_access']
                user.add_user_access = data['add_user_access']
                user.give_access = data['give_access']
                user.info_access = data['info_access']
                user.save()

            return Response('done')

        except Exception as error:
            print(error)
            return Response('error')

        return Response('')
    
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_user_activities(request):
    if request.method == 'POST':
        user = request.data['username']
        business = request.data['business']

        verify_data = (
            isinstance(business, str) and business.strip() and
            isinstance(user, str) and user.strip()
        )

        if not verify_data:
            return Response('text_error')
        
        try:
            business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
            user = models.current_user.objects.get(bussiness_name=business, user_name=user)
            result = models.tracking_history.objects.filter(user=user).order_by('-date').values(
                'date', 'area', 'head'
            )

            return Response(result)
        except Exception as error:
            print(error)
            return Response('')
    
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_accounts(request):
    if request.method == 'POST':
        business = request.data['business']
        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
        items = models.real_account.objects.filter(bussiness_name=business).values(
            'code', 'name', 'account_type__name', 'account_type__code'
        )
    
    return Response(items)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_accounts(request):
    if request.method == 'POST':
        business = request.data['business']
        account = request.data['type']

        business = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)

        mapping = {
            'expense': ['50100', '50200', '50300', '50400', '50500', '50600', '50700'],
            'loan': ['20200'],
            'tax': ['20300'],
            'salary': ['50400'],
            'other': ['30300', '40300', '30200'],
            'others': ['40300'],
            'capital': ['30100'],

        }

        if account.lower() == 'purchase':
            suppliers = models.supplier.objects.filter(bussiness_name=business)
            suppliers = [{'value':i.account, 'label':f'{i.account} - {i.name}'}  for i in suppliers]

            purchase = models.purchase.objects.filter(bussiness_name_id=business.pk).exclude(status__in=['Full Payment', 'Reversed']).order_by('-code')
            sales = [{'value':i.code, 'label':f'No. {i.code} | oustanding - {i.gross_total - i.amount_paid}'} for i in purchase]
            return Response({'data_1':suppliers, 'data_2':sales})
        
        if account.lower() == 'sales':
            customers = models.customer.objects.filter(bussiness_name=business)
            customers = [{'value':i.account, 'label':f'{i.account} - {i.name}'}  for i in customers]

            sale = models.sale.objects.filter(bussiness_name_id=business.pk).exclude(status__in=['Full Payment', 'Reversed']).order_by('-code')
            sales = [{'value':i.code, 'label':f'No. {i.code} | oustanding - {i.gross_total - i.amount_paid}'} for i in sale]
            return Response({'data_1':customers, 'data_2':sales})
        
        codes = mapping.get(account, [])
        accounts = models.real_account.objects.filter(account_type__code__in=codes)
        data = [
            {'label': f"{acc.code} - {acc.name}", 'value': acc.code}
            for acc in accounts]
        return Response({'data_1':data, 'data_2':[]})
    return Response()

#Items
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_items(request):
    if request.method == 'POST':
        business = request.data['business']
        page = int(request.data['page'])
        search = request.data['searchQuery'].lower().strip()
        company = request.user.id
        user = request.data['user']
        location = request.data['location']

        verify_data = (isinstance(business, str) and business.strip() and isinstance(page, (float,int)) and 
                       isinstance(user, str) and user.strip() and isinstance(location, str))

        if not verify_data:
            return Response({'status':'error', 'message':'invalid data was submitted'})
        
        result = inventory_item.fetch_items_for_main_view(business=business, page=page, company=company, search=search, user=user, location=location)
    
        return Response(result)
    
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_items_for_select(request):
    if request.method == 'POST':
        business = request.data['business']
        search = request.data['value'].lower().strip()
        company = request.user.id
        user = request.data['user']
        location = request.data['location']

        verify_data = (isinstance(business, str) and business.strip() and 
                       isinstance(user, str) and user.strip() and isinstance(location, str))
        
        print(request.data)

        if not verify_data:
            return Response({'status':'error', 'message':'invalid data was submitted'})
        
        result = inventory_item.fetch_items_for_select(business=business, company=company, search=search, user=user, location=location)
    
        return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def verify_item(request):
    if request.method == 'POST':
        data = request.data
        business = request.data['business']
        code = data['code']
        name = data['name']
        image = data['image']


        verify_data = (isinstance(code, str) and isinstance(business, str) and
                       business.strip() and isinstance(name, str) and name.strip())
        
        if not verify_data:
            return Response({'status':'error', 'message':'invalid data was submitted'})
        
        company = request.user.id
        result = inventory_item.verify_item(business=business, code=code, name=name, image=image, company=company)
        return Response(result)
    
    return Response('')


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def add_items(request):
    if request.method == 'POST':
        data = request.data
        business = data['business']
        user = data['user']
        code  =data.getlist('code')
        brand = data.getlist('brand')
        item_name = data.getlist('name')
        model = data.getlist('model')
        description = data.getlist('description')
        reorder_level = data.getlist('reorder')
        categ = data.getlist('category')
        suffix = data.getlist('unit')
        image = data.getlist('image')
        image = [img if img and getattr(img, 'name', '') and getattr(img, 'size', 0) > 0 else None for img in image]
        company = request.user.id

        verify_data = (isinstance(business, str) and business.strip() and isinstance(user, str) and 
                        user.strip() and isinstance(code, list) and code and isinstance(brand, list) and 
                        isinstance(item_name, list) and item_name and isinstance(model, list) and 
                        isinstance(description, list) and isinstance(reorder_level, list) and isinstance(categ, list) and
                        categ and isinstance(suffix, list) and suffix)
        
        if not verify_data:
            return Response({'status':'error', 'message':'invalid data was submitted'})
        
        result = inventory_item.add_inventory_item(business=business, user=user, company=company, code=code,
                                                   name=item_name, brand=brand, model=model, suffix=suffix, category=categ,
                                                   image=image, description=description, reorder=reorder_level)
    
    return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def view_item(request):
    if request.method == 'POST':
        try:
            business = request.data['business']
            business = models.bussiness.objects.filter(bussiness_name=business, company_id=request.user.id).first()
            user = models.current_user.objects.filter(user_name=request.data['user'], bussiness_name=business).first()
            item = models.items.objects.filter(item_name=request.data['item'], bussiness_name=business).first()

            if not business or not user or not item:
                logger.warning(f"Invalid request: business={business}, user={request.data['user']}, item={request.data['item']}")
                return Response({'status': 'error', 'message': 'invalid data was submitted'}, status=400)

            if not (user.admin or user.item_access):
                logger.warning(f"Access denied: user={user.user_name} tried to view {request.data['item']} in {business}")
                return Response({'status': 'error', 'message': f'{user.user_name} does not have access to view item'}, status=403)

            item_info = {'code':item.code, 'brand':item.brand, 'name':item.item_name, 'Sales':item.sales_price, 'description':item.description,
                    'unit':{'value':item.unit.suffix, 'label':item.unit.suffix},'quantity':item.quantity, 'model':item.model, 'Cost':item.purchase_price, 
                    'date':item.creation_date, 'by':item.created_by.user_name, 'category':{'value':item.category.name, 'label':item.category.name}, 'reorder':item.reorder_level}
            
            return Response({'status':'success', 'data':item_info})
        
        except Exception as e:
            logger.error(f"Error in view_item by users {str(e)}", exc_info=True)
            return Response({"status": "error", "message": "something happened"}, status=500)
    
    return Response('')
 
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def update_item(request):
    if request.method == 'POST':
        data = request.data
        company = request.user.id

        verify_data = (isinstance(data['oldName'], str) and data['oldName'].strip() and 
                       isinstance(data['newName'], str) and data['newName'].strip() and 
                       isinstance(data['oldCode'], str) and data['oldCode'].strip() and 
                       isinstance(data['newCode'], str) and data['newCode'].strip() and 
                       isinstance(data['business'], str) and data['business'].strip() and 
                       isinstance(data['newUnit'], str) and data['newUnit'].strip() and 
                       isinstance(data['newCategory'], str) and data['newCategory'].strip() and 
                       isinstance(data['newName'], str) and data['newName'].strip() and 
                       isinstance(data['user'], str) and data['user'].strip())
        
        if not verify_data:
            return Response({'status':'error', 'message':'invalid data was submitted'})
        
        result = inventory_item.update_item(data=data, company=company)
        print(result)
    
    return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def delete_item(request):

    if request.method == 'POST':
        item_name = request.data['item']
        business_name = request.data['business']

        business = models.bussiness.objects.get(bussiness_name=business_name, company_id=request.user.id)
        item = models.items.objects.get(bussiness_name_id=business.pk, item_name=item_name)

        item.delete()

        return Response('deleted')
        
    
    return Response('')

#sales

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_sales(request):
    if request.method == 'POST':
        business = request.data['business']
        user = request.data['user']
        search = request.data['searchQuery'].lower()
        date_search = json.loads(request.data['parsed'])
        page = int(request.data['page'])
        company = request.user.id

        verify_data = (isinstance(business, str) and business.strip() and isinstance(user, str) and
                       user.strip() and isinstance(page, (float, int)) and isinstance(search, (str, int, float)) 
                       and isinstance(date_search, dict))
        
        if not verify_data:
            return Response('text_error')
        
        result = inventory_sales.fetch_sales_for_main_view(user=user, date_search=date_search, business=business, search=search, company=company, page=page)
    
    return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def verify_sales_quantity(request):
    if request.method == 'POST':
        try:
            data = request.data['item']
            business = models.bussiness.objects.get(bussiness_name=request.data['business'], company_id=request.user.id)
            sales_quantity = int(data['qty'])

            item = models.items.objects.get(item_name=data['item'], bussiness_name=business)
            if (int(item.quantity) - int(sales_quantity)) < 0:
                return Response('error')
            else:
                return Response('good')
        
        except models.items.DoesNotExist:
            logger.warning(f"Some item/items not found.")
            return Response(f"Some item/items not found.")
    
        except models.bussiness.DoesNotExist:
            logger.warning(f"Business '{business}' not found.")
            return Response("Business not found")
        
        except Exception as error:
            logger.exception('unhandled error')
            return Response('something happened')
        
    return Response()

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def add_sales(request):
    if request.method == 'POST':
        data = request.data
        items = data.getlist('items')
        totals = json.loads(data.getlist('totals')[0])
        levy = data.getlist('levy')
        real_levy = json.loads(levy[0])
        business = data['business']
        user = data['user']
        location = data['location']
        company = request.user.id

        verify_data = (isinstance(data, dict) and data and isinstance(items, list) and items
                     and isinstance(totals, dict) and totals and isinstance(levy, list) and isinstance(business, str)
                     and business.strip() and isinstance(user, str) and user.strip() and isinstance(location, str) and location.strip()
                     and isinstance(data['terms'], str) and data['terms'].strip())
        
        if not verify_data:
            logger.warning('text error')
            return Response('text_error')
                
        result = inventory_sales.post_and_save_sales(real_levy=real_levy, data=data, totals=totals, levy=levy, items=items,
                                                     business=business, company=company, user=user,location=location)

        return Response(result)
        
    return Response('')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def view_sale(request):
    if request.method == 'POST':
        try:
            business = request.data['business']
            number = request.data['number']

            verify_data = (isinstance(business, str) and isinstance(number, str) and business.strip() and number.strip())

            if not verify_data:
                return Response({'status':'error', 'message':'invalid data was submitted'})
            
            business_query = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
            sales = models.sale.objects.get(code=number, bussiness_name=business_query)
            items = models.sale_history.objects.filter(sales=sales)

            sales = {'customer':sales.customer_name, 'number':sales.code, 'issueDate':sales.date, 'dueDate':sales.due_date, 'contact':sales.customer_info.contact, 
                    'address':sales.customer_info.address, 'description':sales.description, 'by':sales.created_by.user_name, 'total':sales.gross_total, 'customer_info':sales.customer_info.name,
                    'loc':sales.location_address.location_name, 'discount':sales.discount_percentage, 'tax_levy':sales.tax_levy_types, 'type':sales.type, 'status':sales.status}
            items = [{'category':i.item_name.category.name, 'model':i.item_name.model, 'item':i.item_name.item_name, 'brand':i.item_name.brand, 'code':i.item_name.code,
                    'unit':i.item_name.unit.suffix, 'qty':i.quantity, 'price':i.sales_price, 'total':i.quantity * i.purchase_price} for i in items]
            data = {'customer':sales, 'items':items }
            
            return Response({'status':'success', 'data':data})
        
        except models.sale.DoesNotExist:
            logger.warning(f"Sale number {number} not found.")
            return Response({'status': 'error', 'message': f'Sale number {number} not found'})
    
        except models.bussiness.DoesNotExist:
            logger.warning(f"Business '{business}' not found.")
            return Response({'status': 'error', 'message': f'Business {business} not found'})
        
        except ValueError as value:
            logger.warning(value)
            return Response({'status':'error', 'message':'invalid data was submitted'})
        
        except Exception as error:
            logger.exception(error)
            return Response({'status':'error', 'message':'something happened'})
    
    return Response('')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def edit_sale(request):
    if request.method == 'POST':
        data = request.data
        business = data['business']
        number = data['number']
        user = data['user']
        company = request.user.id

        verify_data = (isinstance(business, str) and isinstance(number, str) and isinstance(user, str) 
                       and business.strip() and number.strip() and user.strip())
        
        if not verify_data:
            return Response({'status': 'error', 'message': 'Invalid data was submitted'})
        
        result = inventory_sales.reverse_sales(business=business, number=number, user=user, company=company)

        return Response(result)
    
    return Response('')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def delete_sale(request):

    if request.method == 'POST':
        number = request.data['number']
        business_name = request.data['business']

        business = models.bussiness.objects.get(bussiness_name=business_name, company_id=request.user.id)
        sale = models.sale.objects.get(company_id=request.user.id, bussiness_name_id=business.pk, id=number)
        loc = models.inventory_location.objects.get(location_name=sale.location_address, bussiness_name_id=business.pk, company_id=request.user.id)

        items = models.sale_history.objects.filter(sales_id=number)

        for i in items:
            main_item = models.items.objects.get(item_name=i.item_name, bussiness_name_id=business.pk, company_id=request.user.id)
            loc_item = models.location_items.objects.get(item_unique_code_id=main_item.pk, location_id=loc.pk, bussiness_name_id=business.pk, company_id=request.user.id)
            main_item.current_quantity += i.quantity
            loc_item.quantity += int(i.quantity)

            main_item.save()
            loc_item.save()

        sale.delete()

        return Response('done')
        
    
    return Response('')

#purchase

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_purchase(request):
    if request.method == 'POST':
        business = request.data['business']
        user = request.data['user']
        search = request.data['searchQuery'].lower()
        date_search = json.loads(request.data['parsed'])
        page = int(request.data['page'])
        company = request.user.id

        verify_data = (isinstance(business, str) and business.strip() and isinstance(user, str) and
                       user.strip() and isinstance(page, (float, int)) and isinstance(search, (str, int, float)) 
                       and isinstance(date_search, dict))
        
        if not verify_data:
            return Response({'status': 'error', 'message': 'invalid dats was submitted'})
        
        result = inventory_purchase.fetch_purchase_for_main_view(user=user, date_search=date_search, business=business, search=search, company=company, page=page)
    
    return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def add_purchase(request):

    if request.method == 'POST':
        data = request.data
        items = data.getlist('items')
        totals = json.loads(data.getlist('totals')[0])
        levy = data.getlist('levy')
        real_levy = json.loads(levy[0])
        business = data['business']
        user = data['user']
        location = data['location']
        company = request.user.id
        supplier = data['supplier']

        verify_data = (isinstance(data, dict) and data and isinstance(items, list) and items
                     and isinstance(totals, dict) and totals and isinstance(levy, list) and isinstance(business, str)
                     and business.strip() and isinstance(user, str) and user.strip() and isinstance(location, str) and location.strip()
                     and isinstance(data['terms'], str) and data['terms'].strip() and isinstance(supplier, str) and supplier.strip())
        
        if not verify_data:
            logger.warning('text error')
            return Response({'status': 'error', 'message': 'invalid dats was submitted'})
        
        result = inventory_purchase.post_and_save_purchase(real_levy=real_levy, data=data, totals=totals, levy=levy, items=items,
                                                     business=business, company=company, user=user,location=location, supplier=supplier)

        return Response(result)
        
    return Response('')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def view_purchase(request):
    if request.method == 'POST':
        try:
            business = request.data['business']
            number = request.data['number']

            verify_data = (isinstance(business, str) and isinstance(number, str) and business.strip() and number.strip())

            if not verify_data:
                return Response({'status': 'error', 'message': 'invalid dats was submitted'})
            
            business_query = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
            purchase = models.purchase.objects.get(code=number, bussiness_name=business_query)
            items = models.purchase_history.objects.filter(purchase=purchase, bussiness_name=business_query)

            purchase = {'supplier':purchase.supplier.name, 'number':purchase.code, 'issueDate':purchase.date, 'dueDate':purchase.due_date, 'contact':purchase.supplier.contact, 
                    'address':purchase.supplier.address, 'description':purchase.description, 'by':purchase.created_by.user_name, 'total':purchase.gross_total,
                    'loc':purchase.location_address.location_name, 'discount':purchase.discount_percentage, 'tax_levy':purchase.tax_levy_types, 'status':purchase.status}
            
            items = [{'category':i.item_name.category.name, 'model':i.item_name.model, 'item':i.item_name.item_name, 'brand':i.item_name.brand, 'code':i.item_name.code,
                    'unit':i.item_name.unit.suffix, 'qty':i.quantity, 'price':i.purchase_price, 'total':i.quantity * i.purchase_price} for i in items]
            
            data = {'customer':purchase, 'items':items}
            
            return Response({'status': 'success', 'data': data})
        
        except models.sale.DoesNotExist:
            logger.warning(f"Sale number {number} not found.")
            return Response({'status': 'error', 'message': f'Sale number {number} not found'})
    
        except models.bussiness.DoesNotExist:
            logger.warning(f"Business '{business}' not found.")
            return Response({'status': 'error', 'message': f'Business {business} not found'})
        
        except ValueError as value:
            logger.warning(value)
            return Response({'status': 'error', 'message': 'invalid data was submitted'})
        
        except Exception as error:
            logger.exception('unhandled error')
            return Response({'status': 'error', 'message': 'something happened'})
    
    return Response('')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def edit_purchase(request):
    if request.method == 'POST':
        data = request.data
        business = data['business']
        number = data['number']
        user = data['user']
        company = request.user.id

        verify_data = (isinstance(business, str) and isinstance(number, str) and isinstance(user, str) 
                       and business.strip() and number.strip() and user.strip())
        
        if not verify_data:
            return Response({'status': 'error', 'message': 'invalid dats was submitted'})
        
        result = inventory_purchase.reverse_purchase(business=business, number=number, user=user, company=company)

        return Response(result)
    
    return Response('')

        

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def delete_purchase(request):

    if request.method == 'POST':
        number = request.data['number']
        business_name = request.data['business']

        business = models.bussiness.objects.get(bussiness_name=business_name, company_id=request.user.id)
        purchase = models.purchase.objects.get(company_id=request.user.id, bussiness_name_id=business.pk, id=number)
        loc = models.inventory_location.objects.get(location_name=purchase.location_address, bussiness_name_id=business.pk, company_id=request.user.id)

        items = models.purchase_history.objects.filter(purchase_id=number)

        for i in items:
            main_item = models.items.objects.get(item_name=i.item_name, bussiness_name_id=business.pk, company_id=request.user.id)
            loc_item = models.location_items.objects.get(item_unique_code_id=main_item.pk, location_id=loc.pk, bussiness_name_id=business.pk, company_id=request.user.id)
            main_item.current_purchase_price = ((main_item.current_purchase_price * main_item.current_quantity) - (i.total_purchase)) / (main_item.current_quantity - i.quantity)
            main_item.current_quantity -= int(i.quantity)
            loc_item.quantity -= int(i.quantity)

            main_item.save()
            loc_item.save()

        purchase.delete()

        return Response('done')
        
    return Response('')

#location

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_locations(request):
    if request.method == 'POST':
        business = models.bussiness.objects.get(bussiness_name=request.data['business'], company_id=request.user.id)
        location = models.inventory_location.objects.filter(bussiness_name_id=business.pk)
        all_location = [{'value':i.location_name, 'label':i.location_name} for i in location]
    
    return Response(all_location)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_locations_for_select(request):
    if request.method == 'POST':
        business = request.data['business']
        search = request.data['value'].lower().strip()
        company = request.user.id
        user = request.data['user']

        verify_data = (isinstance(business, str) and business.strip() and 
                       isinstance(user, str) and user.strip() and isinstance(search, str))

        if not verify_data:
            return Response({'status':'error', 'message':'invalid data was submitted'})
        
        result = inventory_location.fetch_locations_for_select(business=business, company=company, search=search, user=user)
    
        return Response(result)
    
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_source_locations_for_select(request):
    if request.method == 'POST':
        business = request.data['business']
        search = request.data['value'].lower().strip()
        company = request.user.id
        user = request.data['user']

        verify_data = (isinstance(business, str) and business.strip() and 
                       isinstance(user, str) and user.strip() and isinstance(search, str))

        if not verify_data:
            return Response({'status':'error', 'message':'invalid data was submitted'})
        
        result = inventory_location.fetch_source_locations_for_select(business=business, company=company, search=search, user=user)
    
        return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_location(request):
    if request.method == 'POST':
        business = request.data['business']
        user = request.data['user']
        search = request.data['searchQuery'].lower()
        company = request.user.id

        verify_data = (isinstance(business, str) and isinstance(user, str) and isinstance(search, str)
                       and business.strip() and user)
        
        if not verify_data:
            return Response('text error')
        
        result = inventory_location.fetch_location_for_main_view(company=company, business=business, user=user, search=search)

    return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_location(request):
    if request.method == 'POST':
        business = models.bussiness.objects.get(bussiness_name=request.data['business'], company_id=request.user.id)
        location = models.inventory_location.objects.get(location_name=request.data['loc'], bussiness_name=business)
        loc_detail = {'name':location.location_name, 'description':location.description, 'date':location.creation_date.date()}
    
    return Response(loc_detail)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def add_location(request):
    if request.method == 'POST':
        data = request.data['loc']
        user = request.data['user']
        name = data['name']
        business = request.data['business']

        verify_data = (isinstance(business, str) and isinstance(user, str) and isinstance(name, str) and 
                       user.strip() and business.strip() and name.strip())
        
        if not verify_data:
            return Response('text error')
        
        try:
            business_query = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
            user_query = models.current_user.objects.get(user_name=user, bussiness_name=business_query)

            if not user_query.admin and not user_query.create_access:
                return Response('no access')

            if models.inventory_location.objects.filter(location_name=name, bussiness_name=business_query).exists():
                return Response('exist')
            
            with transaction.atomic(savepoint=False, durable=True, using='default'):
                models.inventory_location.objects.create(location_name=name, description=data['description'], created_by=user_query, 
                                            bussiness_name=business_query)
                
                models.tracking_history.objects.create(user=user_query, area=f'created location {name}', head='Location creation', bussiness_name=business_query)

                return Response('done')
                
        except models.bussiness.DoesNotExist:
            logger.warning(f"Business '{business}' not found.")
            return Response("Business not found")
        
        except models.current_user.DoesNotExist:
            logger.warning(f"User '{user}' not found.")
            return Response("User not found")
        
        except ValueError as value:
            logger.warning(value)
            return Response('data not matched')   

        except Exception as error:
            logger.info(error)
            return Response(error) 

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def edit_location(request):
    if request.method == 'POST':
        data = request.data['loc']
        business = request.data['business']
        user = request.data['user']
        old = request.data['old']
        new = data['name']
        description = data['description']

        verify_data = (isinstance(business, str) and isinstance(user, str) and isinstance(old , str) and isinstance(new, str)
                       and business.strip() and user.strip() and old.strip() and new.strip())

        if not verify_data:
            return Response('text error')
        
        business_query = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
        user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

        if not user_query.admin and not user_query.edit_access:
            return Response('no access')

        if models.inventory_location.objects.filter(location_name=new, bussiness_name=business_query).exclude(location_name=old).exists():
            return Response('exist')
        
        try:
            with transaction.atomic(savepoint=False, durable=True, using='default'):
                loc = models.inventory_location.objects.get(location_name=old, bussiness_name=business_query)
                loc.location_name = new.strip()
                loc.description = description
                loc.save()

                models.tracking_history.objects.create(user=user_query, area=f'edited {loc.location_name}', head='Edit Location', bussiness_name=business_query)

                return Response('done')

        except models.bussiness.DoesNotExist:
            logger.warning(f"Business '{business}' not found.")
            return Response("Business not found")
        
        except models.current_user.DoesNotExist:
            logger.warning(f"User '{user}' not found.")
            return Response("User not found")
        
        except ValueError as value:
            logger.warning(value)
            return Response('data not matched')   

        except Exception as error:
            logger.info(error)
            return Response(error)  
        
    return Response('')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def edit_location_item(request):
    if request.method == 'POST':
        try:
            business = request.data['business']
            user = request.data['user']
            location = request.data['location']
            item = request.data['item']
            price = float(request.data['price'])
            reorder = float(request.data['reorder'])


            verify_data = (isinstance(business, str) and isinstance(user, str) and isinstance(location, str) and 
                        isinstance(item, str) and isinstance(price, (int, float)) and isinstance(reorder, (int, float))
                        and business.strip() and user.strip() and location.strip() and item.strip())
            
            if not verify_data:
                return Response('text error')

            business_query = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
            user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

            if not user_query.admin and not user_query.edit_access:
                return Response('no access')

            location_query = models.inventory_location.objects.get(location_name=location, bussiness_name=business_query)

            item = models.location_items.objects.get(item_name__item_name=item, location=location_query, bussiness_name=business_query)
            item.reorder_level = reorder
            item.sales_price = price
            item.save()

            return Response('done')

        except models.bussiness.DoesNotExist:
            logger.warning(f"Business '{business}' not found.")
            return Response("Business not found")
        
        except models.current_user.DoesNotExist:
            logger.warning(f"User '{user}' not found.")
            return Response("User not found")
        
        except ValueError as value:
            logger.warning(value)
            return Response('data not matched')   

        except Exception as error:
            logger.info(error)
            return Response(error)  
    
    return Response('')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def single_location_sales(request):
    if request.method == 'POST':
        business = models.bussiness.objects.get(bussiness_name=request.data['business'], company_id=request.user.id)
        sales = models.sale.objects.filter(company_id=request.user.id, location_address=request.data['loc'], bussiness_name_id=business.pk).order_by('-date','-id')
        all_sales = [{'number':i.pk, 'by':i.particular_user, 'customer':i.customer, 'date':i.date, 'description':i.description,
                  'total':i.sales_total, 'loc':i.location_address} for i in sales]
    
    return Response(all_sales)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def single_location_purchase(request):
    if request.method == 'POST':
        business = models.bussiness.objects.get(bussiness_name=request.data['business'], company_id=request.user.id)
        loc = models.purchase.objects.filter(company_id=request.user.id, location_address=request.data['loc'], bussiness_name_id=business.pk).order_by('-date','-id')
        all_sales = [{'number':i.pk, 'by':i.particular_user, 'supplier':i.supplier, 'date':i.date, 'description':i.description,
                  'total':i.purchase_total, 'loc':i.location_address} for i in loc]
    
    return Response(all_sales)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_transfer_from(request):
    if request.method == 'POST':
        business = models.bussiness.objects.get(bussiness_name=request.data['business'], company_id=request.user.id)
        transfer = models.inventory_transfer.objects.filter(bussiness_name_id=business.pk, from_loc=request.data['loc']).order_by('-date','-id')
        all_transfer = [{'number':i.pk, 'by':i.particular_user, 'from':i.from_loc, 'date':i.date, 'description':i.description,
                  'total':i.total_quantity, 'to':i.to_loc} for i in transfer]
    
    return Response(all_transfer)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_transfer_to(request):
    if request.method == 'POST':
        business = models.bussiness.objects.get(bussiness_name=request.data['business'])
        transfer = models.inventory_transfer.objects.filter(bussiness_name=business, to_loc=request.data['loc']).order_by('-date','-id')
        all_transfer = [{'number':i.pk, 'by':i.particular_user, 'from':i.from_loc, 'date':i.date, 'description':i.description,
                  'total':i.total_quantity, 'to':i.to_loc} for i in transfer]
    
    return Response(all_transfer)

#transfer

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_transfer(request):
    if request.method == 'POST':
        business = request.data['business']
        user = request.data['user']
        search = request.data['searchQuery'].lower()
        date_search = json.loads(request.data['parsed'])
        page = int(request.data['page'])
        company = request.user.id

        verify_data = (isinstance(business, str) and business.strip() and isinstance(user, str) and
                       user.strip() and isinstance(page, (float, int)) and isinstance(search, (str, int, float)) 
                       and isinstance(date_search, dict))
        
        if not verify_data:
            return Response('text_error')
        
        result = transfer.fetch_transfer_main_view(user=user, date_search=date_search, business=business, search=search, company=company, page=page)
    
    return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def verify_transfer_quantity(request):
    if request.method == 'POST':
        detail = request.data['detail']
        loc_detail = request.data['loc']

        business = models.bussiness.objects.get(bussiness_name=request.data['business'], company_id=request.user.id)
        from_loc = models.inventory_location.objects.get(location_name=loc_detail, bussiness_name=business)
        item = models.items.objects.get(item_name=detail['item'], bussiness_name=business)
        loc_item= models.location_items.objects.get(item_name=item, location=from_loc, bussiness_name=business)

        if loc_item.quantity - int(detail['qty']) < 0:
            return Response({'status':'error', 'message':f'{detail["item"]} has only {loc_item.quantity} quantity'})
        else:
            return Response({'status':'success', 'message':f'{detail['item']} has enough quantity'})
    return Response()

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def receive_transfer(request):
    if request.method == 'POST':
        data = request.data

        business = data['business']
        number = data['number']
        user = data['user']
        company = request.user.id

        verify_data = (isinstance(business, str) and isinstance(number, str) and isinstance(user, str) and
                       business.strip() and number.strip() and user.strip())

        if not verify_data:
            return Response('text_error')
        
        result = transfer.receive_transfer(company=company, user=user, business=business, number=number)

        return Response(result)
    return Response('')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def reject_transfer(request):
    if request.method == 'POST':
        data = request.data
        business = data['business']
        number = data['number']
        user = data['user']
        company = request.user.id

        verify_data = (isinstance(business, str) and isinstance(number, str) and isinstance(user, str) and
                       business.strip() and number.strip() and user.strip())
        
        if not verify_data:
            return Response('text_error')

        result = transfer.reject_transfer(company=company, user=user, business=business, number=number)

        return Response(result)
    return Response('')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def create_transfer(request):
    if request.method == 'POST':
        data = request.data
        business = data['business']
        user = data['user']
        description = data['description']
        date = data['date']
        source = data['from']
        destination = data['to']
        items = data.getlist('items')
        company = request.user.id

        verify_data = (isinstance(business, str) and business.strip() and isinstance(user, str) and
                       user.strip() and isinstance(source, str) and source.strip() and isinstance(destination, str) 
                       and destination.strip() and isinstance(description, str))
        
        if not verify_data:
            return Response('text_error')

        if source.strip() == destination.strip():
            return Response('same')

        result = transfer.create_transfer(business=business, user=user, company=company, date=date, items=items, description=description, source=source, destination=destination)
       
        return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def view_transfer(request):
    if request.method == 'POST':        
        business = request.data['business']
        transfer_no = request.data['number']
        company = request.user.id

        verify_data = (isinstance(business, str) and business.strip() and isinstance(transfer_no, str) and transfer_no.strip())

        if not verify_data:
            return Response('text_error')
        
        result = transfer.view_transfer(company=company, business=business, transfer_no=transfer_no)
  
        return Response(result)
    return Response('')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def edit_transfer(request):
    if request.method == 'POST':
        data = request.data

        business = models.bussiness.objects.get(bussiness_name=data['business'], company_id=request.user.id)
        transfer = models.inventory_transfer.objects.get(code=data['number'], bussiness_name=business)
        history = models.transfer_history.objects.filter(transfer=transfer, bussiness_name=business)

        try:
            with transaction.atomic(savepoint=False, durable=True, using='default'):
                for i in history:
                    item1 = models.location_items.objects.get(bussiness_name=business, item_name=i.item_name, location=transfer.from_loc)
                    item2 = models.location_items.objects.get(bussiness_name=business, item_name=i.item_name, location=transfer.to_loc)
                    item1.quantity += Decimal(str(i.quantity))
                    item2.quantity -= Decimal(str(i.quantity))
                    item1.save()
                    item2.save()
                transfer.status = 'Reversed'
                transfer.save()
            return Response('reversed')
        except Exception as error:
            print(error)
            return Response(error)
    return Response('')


# Journal
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_journals(request):
    if request.method == 'POST':
        business = request.data['business']
        user = request.data['user']
        search = request.data['searchQuery'].lower()
        date_search = json.loads(request.data['parsed'])
        page = int(request.data['page'])
        company = request.user.id

        verify_data = (isinstance(business, str) and business.strip() and isinstance(user, str) and
                       user.strip() and isinstance(page, (float, int)) and isinstance(search, (str, int, float)) 
                       and isinstance(date_search, dict))
        
        if not verify_data:
            return Response('text_error')
        
        result = general_journal.fetch_journal_for_main_view(user=user, date_search=date_search, business=business, search=search, company=company, page=page)
    
    return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def view_journal(request):
    if request.method == 'POST':
        business = request.data['business']
        code = request.data['number']
        user = request.data['user']
        company = request.user.id

        verify_data = (isinstance(business, str) and isinstance(code, str) and isinstance(user, str) and
                       business.strip() and code.strip() and user.strip())
        
        if not verify_data:
            return Response('text error')
        
        result = general_journal.view_gl_journal(code=code, company=company, user=user, business=business)
        
        return Response(result)
    return Response('')

@api_view(['GET', 'POST'])
@permission_classes({IsAuthenticated})
def add_journal(request):
    if request.method == 'POST':
        data = request.data['entries']
        business = request.data['business']
        user = request.data['user']
        company = request.user.id

        verify_data = (isinstance(data, list) and data and isinstance(business, str) and isinstance(user, str)
                       and business.strip() and user.strip())
        
        if not verify_data:
            return Response('text error')
        
        result = general_journal.add_gl_journal(company=company, user=user, business=business, data=data)

        return Response(result)           

    return Response('')
    
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def reverse_journal(request):
    if request.method == 'POST':
        number = request.data['number']
        business = request.data['business']
        user = request.data['user']
        company = request.user.id

        verify_data = (isinstance(business, str) and isinstance(number, str) and isinstance(user, str)
                       and number.strip() and business.strip() and user.strip())
        
        if not verify_data:
            return Response('text error')
        
        result = general_journal.reverse_gl_journal(company=company, user=user, business=business, number=number)

        return Response(result)
    return Response('')

# Cash Receipts
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_cash_receipts(request):
    if request.method == 'POST':
        business = request.data['business']
        user = request.data['user']
        search = request.data['searchQuery'].lower()
        date_search = json.loads(request.data['parsed'])
        page = int(request.data['page'])
        company = request.user.id

        verify_data = (isinstance(business, str) and business.strip() and isinstance(user, str) and
                       user.strip() and isinstance(page, (float, int)) and isinstance(search, (str, int, float)) 
                       and isinstance(date_search, dict))
        
        if not verify_data:
            return Response('text_error')
        
        result = cash_journal.fetch_cash_for_main_view(user=user, date_search=date_search, business=business, search=search, company=company, page=page)
    
    return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def view_cash_receipt(request):
    if request.method == 'POST':
        business = request.data['business']
        code = request.data['number']
        user = request.data['user']
        company = request.user.id

        verify_data = (isinstance(business, str) and isinstance(code, str) and isinstance(user, str) and
                       business.strip() and code.strip() and user.strip())
        
        if not verify_data:
            return Response('text error')
        
        result = cash_journal.view_cash_receipt(code=code, company=company, user=user, business=business)
        
        return Response(result)
    return Response('')

@api_view(['GET', 'POST'])
@permission_classes({IsAuthenticated})
def add_cash_receipts(request):
    if request.method == 'POST':
        data = request.data['entries']
        business = request.data['business']
        user = request.data['user']
        company = request.user.id

        verify_data = (isinstance(data, list) and data and isinstance(business, str) and isinstance(user, str)
                       and business.strip() and user.strip())
        
        if not verify_data:
            return Response('text error')
        
        result = cash_journal.add_cash_receipt(company=company, user=user, data=data, business=business)

        return Response(result)

    return Response('')
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reverse_cash_receipt(request):
    if request.method == 'POST':
        number = request.data['number']
        business = request.data['business']
        user = request.data['user']
        company = request.user.id

        verify_data = (isinstance(business, str) and isinstance(number, str) and isinstance(user, str)
                        and number.strip() and business.strip() and user.strip())
            
        if not verify_data:
            return Response('text error')
            
        result = cash_journal.reverse_cash_receipt(company=company, user=user, business=business, number=number)

        return Response(result)
    
    return Response('')

# Payment
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_payments(request):
    if request.method == 'POST':
        business = request.data['business']
        user = request.data['user']
        search = request.data['searchQuery'].lower()
        date_search = json.loads(request.data['parsed'])
        page = int(request.data['page'])
        company = request.user.id

        verify_data = (isinstance(business, str) and business.strip() and isinstance(user, str) and
                       user.strip() and isinstance(page, (float, int)) and isinstance(search, (str, int, float)) 
                       and isinstance(date_search, dict))
        
        if not verify_data:
            return Response('text error')
        
        result = payment_journal.fetch_payment_for_main_view(user=user, date_search=date_search, business=business, search=search, company=company, page=page)
    
    return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def view_payment(request):
    if request.method == 'POST':
        business = request.data['business']
        code = request.data['number']
        user = request.data['user']
        company = request.user.id

        verify_data = (isinstance(business, str) and isinstance(code, str) and isinstance(user, str) and
                       business.strip() and code.strip() and user.strip())
        
        if not verify_data:
            return Response('text error')
        
        result = payment_journal.view_payment(code=code, company=company, user=user, business=business)
        
        return Response(result)
    return Response('')


@api_view(['GET', 'POST'])
@permission_classes({IsAuthenticated})
def add_payments(request):
    if request.method == 'POST':
        data = request.data['entries']
        business = request.data['business']
        user = request.data['user']
        company = request.user.id

        verify_data = (isinstance(data, list) and data and isinstance(business, str) and isinstance(user, str)
                       and business.strip() and user.strip())
        
        if not verify_data:
            return Response('text error')
        
        result = payment_journal.add_payment(user=user, data=data, business=business, company=company)

        return Response(result)           

    return Response('')
    
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reverse_payment(request):
    if request.method == 'POST':
        number = request.data['number']
        business = request.data['business']
        user = request.data['user']
        company = request.user.id

        verify_data = (isinstance(business, str) and isinstance(number, str) and isinstance(user, str)
                        and number.strip() and business.strip() and user.strip())
            
        if not verify_data:
            return Response('text error')
            
        result = payment_journal.reverse_payment(company=company, user=user, business=business, number=number)

            
        return Response(result)

    return Response('')

# customer
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_customers(request):
    if request.method == 'POST':
        data = request.data
        business = data['business']
        user = data['user']
        page_quantity = 30
        page = int(data['page'])
        search = data['searchQuery']

        verify_data = (isinstance(business, str) and isinstance(user, str) and isinstance(page, int) and
                       isinstance(search, str) and business.strip() and user.strip() and page)
        
        if not verify_data:
            return Response('text error')
        
        try:
            business_query = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
            user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

            if not user_query.admin and not user_query.customer_access:
                return Response('no access')
            
            customers = models.customer.objects.filter(bussiness_name=business_query).exclude(name='Regular Customer')

            if search.strip():
                filter = (
                    Q(account__icontains=search) |
                    Q(name__icontains=search) |
                    Q(contact__icontains=search) |
                    Q(address__icontains=search) |
                    Q(email__icontains=search)
                )

                customers = customers.filter(filter)

            customers = customers.order_by('-account').values(
                'account', 'name', 'contact', 'address', 'email', 'debit', 'credit'
            )

            paginator = Paginator(customers, page_quantity)
            current_page = paginator.get_page(page)

            customers = {'data':list(current_page.object_list), 'has_more':current_page.has_next()}

            return Response(customers)
        
        except models.bussiness.DoesNotExist:
            logger.warning(f"Business '{business}' not found.")
            return Response("Business not found")
        
        except models.current_user.DoesNotExist:
            logger.warning(f"User '{user}' not found.")
            return Response("User not found")
        
        except ValueError as value:
            logger.warning(value)
            return Response('data not matched')   

        except Exception as error:
            logger.info(error)
            return Response(error)  
    
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_customer(request):
    if request.method == 'POST':
        business = models.bussiness.objects.get(bussiness_name=request.data['business'], company_id=request.user.id)
        customer = models.customer.objects.get(name=request.data['customer'], bussiness_name=business)
        customer_detail = {'name':customer.name, 'address':customer.address, 'contact':customer.contact, 'email':customer.email}

        return Response(customer_detail)
    
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def add_customer(request):
    if request.method == 'POST':
        data = request.data['customer']
        business = request.data['business']
        user = request.data['user']
        name = data['name']
        email = data['email']
        contact = data['contact']
        address = data['address']

        verify_data = (isinstance(business, str) and isinstance(user, str) and business.strip() and user.strip() and 
                       isinstance(name, str) and name.strip() and isinstance(email, str) and isinstance(contact, str)
                       and isinstance(address, str))
        
        if not verify_data:
            return Response('text error')
        
        try:
            business_query = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
            user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

            if not user_query.admin and not user_query.create_access:
                return Response('no access')

            if models.customer.objects.filter(name=name.strip(), bussiness_name=business_query).exists():
                return Response('exist')
            
            with transaction.atomic(savepoint=False, durable=True, using='default'):
                models.customer.objects.create(name=name.strip(), address=address, contact=contact,
                                                email=email, bussiness_name=business_query)
                
                models.tracking_history.objects.create(user=user_query, bussiness_name=business_query, area=f'creating new Customer {name}', head='create customer')
                return Response('done')
            
        except models.bussiness.DoesNotExist:
            logger.warning(f"Business '{business}' not found.")
            return Response("Business not found")
        
        except models.current_user.DoesNotExist:
            logger.warning(f"User '{user}' not found.")
            return Response("User not found")
        
        except ValueError as value:
            logger.warning(value)
            return Response('data not matched')   

        except Exception as error:
            logger.info(error)
            return Response(error)  
        
    return Response('')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def edit_customer(request):
    if request.method == 'POST':
        data = request.data['customer']
        old = request.data['old']
        new = data['name']
        business = request.data['business']
        user = request.data['user']
        email = data['email']
        contact = data['contact']
        address = data['address']

        verify_data = (isinstance(business, str) and isinstance(user, str) and business.strip() and user.strip() and 
                       isinstance(old, str) and old.strip() and isinstance(email, str) and isinstance(contact, str)
                       and isinstance(address, str) and isinstance(new, str) and new.strip())
        
        if not verify_data:
            return Response('text error')
        
        try:
            business_query = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
            user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

            if not user_query.admin and not user_query.edit_access:
                return Response('no access')

            if models.customer.objects.filter(name=new.strip(), bussiness_name=business_query).exclude(name=old.strip()).exists():
                return Response('exist')
            
            with transaction.atomic(savepoint=False, durable=True, using='default'):
                customer = models.customer.objects.get(name=old, bussiness_name=business_query)
                customer.name = data['name']
                customer.address = data['address']
                customer.contact = data['contact']
                customer.email = data['email']
                customer.save()

                models.tracking_history.objects.create(user=user_query, bussiness_name=business_query, area=f'edited customer {new} info', head='edit customer')
                return Response('done')
            
        except models.bussiness.DoesNotExist:
            logger.warning(f"Business '{business}' not found.")
            return Response("Business not found")
        
        except models.customer.DoesNotExist:
            logger.warning(f'customer {old} not found')
            return Response(f'customer {old} not found')
        
        except models.current_user.DoesNotExist:
            logger.warning(f"User '{user}' not found.")
            return Response("User not found")
        
        except ValueError as value:
            logger.warning(value)
            return Response('data not matched')   

        except Exception as error:
            logger.info(error)
            return Response(error)  
        
    return Response('')

# supplier

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_suppliers(request):
    if request.method == 'POST':
        data = request.data
        business = data['business']
        user = data['user']
        page_quantity = 30
        page = int(data['page'])
        search = data['searchQuery']

        verify_data = (isinstance(business, str) and isinstance(user, str) and isinstance(page, int) and
                       isinstance(search, str) and business.strip() and user.strip() and page)
        
        if not verify_data:
            return Response('text error')
        
        try:
            business_query = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
            user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

            if not user_query.admin and not user_query.supplier_access:
                return Response('no access')
            
            suppliers = models.supplier.objects.filter(bussiness_name=business_query)

            if search.strip():
                filter = (
                    Q(account__icontains=search) |
                    Q(name__icontains=search) |
                    Q(contact__icontains=search) |
                    Q(address__icontains=search) |
                    Q(email__icontains=search)
                )

                suppliers = suppliers.filter(filter)

            suppliers = suppliers.order_by('-account').values(
                'account', 'name', 'contact', 'address', 'email', 'debit', 'credit'
            )

            paginator = Paginator(suppliers, page_quantity)
            current_page = paginator.get_page(page)

            suppliers = {'data':list(current_page.object_list), 'has_more':current_page.has_next()}

            return Response(suppliers)
        
        except models.bussiness.DoesNotExist:
            logger.warning(f"Business '{business}' not found.")
            return Response("Business not found")
        
        except models.current_user.DoesNotExist:
            logger.warning(f"User '{user}' not found.")
            return Response("User not found")
        
        except ValueError as value:
            logger.warning(value)
            return Response('data not matched')   

        except Exception as error:
            logger.info(error)
            return Response(error)  
    
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_supplier(request):
    if request.method == 'POST':
        business = models.bussiness.objects.get(bussiness_name=request.data['business'], company_id=request.user.id)
        supplier = models.supplier.objects.get(name=request.data['supplier'], bussiness_name=business)
        supplier_detail = {'name':supplier.name, 'address':supplier.address, 'contact':supplier.contact, 'email':supplier.email}

        return Response(supplier_detail)
    
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def add_supplier(request):
    if request.method == 'POST':
        data = request.data['supplier']
        business = request.data['business']
        user = request.data['user']
        name = data['name']
        email = data['email']
        contact = data['contact']
        address = data['address']

        verify_data = (isinstance(business, str) and isinstance(user, str) and business.strip() and user.strip() and 
                       isinstance(name, str) and name.strip() and isinstance(email, str) and isinstance(contact, str)
                       and isinstance(address, str))
        
        if not verify_data:
            return Response('text error')
        
        try:
            business_query = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
            user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

            if not user_query.admin and not user_query.create_access:
                return Response('no access')

            if models.supplier.objects.filter(name=name.strip(), bussiness_name=business_query).exists():
                return Response('exist')
            
            with transaction.atomic(savepoint=False, durable=True, using='default'):
                models.supplier.objects.create(name=name.strip(), address=address, contact=contact,
                                                email=email, bussiness_name=business_query)
                
                models.tracking_history.objects.create(user=user_query, bussiness_name=business_query, area=f'creating new supplier {name}', head='create supplier')
                return Response('done')
            
        except models.bussiness.DoesNotExist:
            logger.warning(f"Business '{business}' not found.")
            return Response("Business not found")
        
        except models.current_user.DoesNotExist:
            logger.warning(f"User '{user}' not found.")
            return Response("User not found")
        
        except ValueError as value:
            logger.warning(value)
            return Response('data not matched')   

        except Exception as error:
            logger.info(error)
            return Response(error)  
        
    return Response('')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def edit_supplier(request):
    if request.method == 'POST':
        data = request.data['supplier']
        old = request.data['old']
        new = data['name']
        business = request.data['business']
        user = request.data['user']
        email = data['email']
        contact = data['contact']
        address = data['address']

        verify_data = (isinstance(business, str) and isinstance(user, str) and business.strip() and user.strip() and 
                       isinstance(old, str) and old.strip() and isinstance(email, str) and isinstance(contact, str)
                       and isinstance(address, str) and isinstance(new, str) and new.strip())
        
        if not verify_data:
            return Response('text error')
        
        try:
            business_query = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
            user_query = models.current_user.objects.get(bussiness_name=business_query, user_name=user)

            if not user_query.admin and not user_query.edit_access:
                return Response('no access')

            if models.supplier.objects.filter(name=new.strip(), bussiness_name=business_query).exclude(name=old.strip()).exists():
                return Response('exist')
            
            with transaction.atomic(savepoint=False, durable=True, using='default'):
                supplier = models.supplier.objects.get(name=old, bussiness_name=business_query)
                supplier.name = data['name']
                supplier.address = data['address']
                supplier.contact = data['contact']
                supplier.email = data['email']
                supplier.save()

                models.tracking_history.objects.create(user=user_query, bussiness_name=business_query, area=f'edited supplier {new} info', head='edit supplier')
                return Response('done')
            
        except models.bussiness.DoesNotExist:
            logger.warning(f"Business '{business}' not found.")
            return Response("Business not found")
        
        except models.supplier.DoesNotExist:
            logger.warning(f'supplier {old} not found')
            return Response(f'supplier {old} not found')
        
        except models.current_user.DoesNotExist:
            logger.warning(f"User '{user}' not found.")
            return Response("User not found")
        
        except ValueError as value:
            logger.warning(value)
            return Response('data not matched')   

        except Exception as error:
            logger.info(error)
            return Response(error)  
        
    return Response('')

# COA

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_coa(request):
    if request.method == 'POST':
        business = request.data['business']
        user = request.data['user']
        company = request.user.id

        verify_data = (isinstance(business, str) and business.strip() and isinstance(user, str)
                       and user.strip())
        
        if not verify_data:
            return Response('Invalid data was submitted')

        result = coa.fetch_coa(business=business, company=company, user=user)
        return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def create_account(request):
    if request.method == 'POST':
        business = request.data['business']
        user = request.data['user']

        verify_data = (isinstance(business, str) and business.strip() and isinstance(user, str) 
                       and user.strip() and business.strip() and user.strip())

        if not verify_data:
            return Response('text error')
        
        result = coa.create_account(data=request.data, company=request.user.id)

        return Response(result)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_sub_accounts(request):
    if request.method == 'POST':
        account = request.data['acc']
        business = request.data['business']

        verify_data = (isinstance(account, (str, int, float)) and isinstance(business, str) 
                       and account and business.strip())
        
        if not verify_data:
            return Response('text error')
        
        try:
            business_query = models.bussiness.objects.get(bussiness_name=business, company_id=request.user.id)
            account_query = models.account.objects.get(code=account, bussiness_name=business_query)

            sub_accounts = models.sub_account.objects.filter(account_type=account_query, bussiness_name=business_query)

            result = [{'value':i.name, 'label':f'{i.code} - {i.name}'} for i in sub_accounts if int(i.code) not in [10600, 10400, 10300, 20100, 20300, 40100, 40200, 50100, 50800]]

            return Response(result)
        
        except ValueError as value:
            logger.warning(value)
            return Response('value error')
        
        except Exception as error:
            logger.warning(error)
            return Response('something happened')
# Report

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_items_for_report(request):
    if request.method == 'POST':
        business = request.data['business']
        company = request.user.id
        user = request.data['user']
        location = request.data['location']

        verify_data = (isinstance(business, str) and business.strip() and 
                       isinstance(user, str) and user.strip() and isinstance(location, str))

        if not verify_data:
            return Response('text_error')
        
        result = report.fetch_items_for_report(business=business, company=company, user=user, location=location)
    
        return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_report_data_movements(request):
    if request.method == 'POST':
        business = request.data['business']
        company = request.user.id
        user = request.data['user']
        location = request.data['selectedLocation']
        start = request.data['startDate']
        end = request.data['endDate']

        verify_data = (isinstance(business, str) and business.strip() and isinstance(start, str) and isinstance(end, str) and
                       isinstance(user, str) and user.strip() and isinstance(location, str))

        if not verify_data:
            return Response('text_error')
        
        result = report.fetch_data_for_report_movements(business=business, company=company, user=user, location=location, start=start, end=end)
    
        return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_report_data_sales_performance(request):
    if request.method == 'POST':
        business = request.data['business']
        company = request.user.id
        user = request.data['user']
        location = request.data['selectedLocation']
        start = request.data['startDate']
        end = request.data['endDate']

        verify_data = (isinstance(business, str) and business.strip() and isinstance(start, str) and isinstance(end, str) and
                       isinstance(user, str) and user.strip() and isinstance(location, str))

        if not verify_data:
            return Response('text_error')
        
        result = report.fetch_data_for_sales_performance(business=business, company=company, user=user, location=location, start=start, end=end, reference='sales_performance')
    
        return Response(result)
    
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_customer_aging(request):
    if request.method == 'POST':
        business = request.data['business']
        company = request.user.id
        user = request.data['user']
        location = request.data['selectedLocation']
        end = request.data['endDate']

        verify_data = (isinstance(business, str) and business.strip() and isinstance(end, str) and
                       isinstance(user, str) and user.strip() and isinstance(location, str))

        if not verify_data:
            return Response('text_error')
        
        result = report.fetch_data_for_sales_performance(business=business, company=company, user=user, location=location, end=end, start='', reference='customer_aging')
    
        return Response(result)
    
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_report_data_purchase_metric(request):
    if request.method == 'POST':
        business = request.data['business']
        company = request.user.id
        user = request.data['user']
        location = request.data['selectedLocation']
        start = request.data['startDate']
        end = request.data['endDate']

        verify_data = (isinstance(business, str) and business.strip() and isinstance(start, str) and isinstance(end, str) and
                       isinstance(user, str) and user.strip() and isinstance(location, str))

        if not verify_data:
            return Response('text_error')
        
        result = report.fetch_data_for_sales_performance(business=business, company=company, user=user, location=location, start=start, end=end, reference='purchase_metric')
    
        return Response(result)
    
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fetch_supplier_performance(request):
    if request.method == 'POST':
        business = request.data['business']
        company = request.user.id
        user = request.data['user']
        location = request.data['selectedLocation']
        end = request.data['endDate']

        verify_data = (isinstance(business, str) and business.strip() and isinstance(end, str) and
                       isinstance(user, str) and user.strip() and isinstance(location, str))

        if not verify_data:
            return Response('text_error')
        
        result = report.fetch_data_for_sales_performance(business=business, company=company, user=user, location=location, end=end, start='', reference='supplier_performance')
    
        return Response(result)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])   
def fetch_profit_loss(request):
    if request.method == 'POST':
        business = request.data['business']
        user = request.data['user']
        period_type = request.data['timeframe']
        start = request.data['startDate']
        end = request.data['endDate']
        company = request.user.id

        verify_data = (isinstance(business, str) and business.strip() and isinstance(start, str) and isinstance(end, str) and
                       isinstance(user, str) and user.strip() and isinstance(period_type, str) and period_type.strip())

        if not verify_data:
            return Response('Invalid data submitted for processing')

        result = report.fetch_pl_report(business=business, user=user, company=company,
                                        start=start, end=end, period_type=period_type)
        
        return Response(result)
    
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])   
def fetch_inventory_valuation(request):
    if request.method == 'POST':
        business = request.data['business']
        user = request.data['user']
        category = request.data['category']
        start = request.data['startDate']
        end = request.data['endDate']
        company = request.user.id

        verify_data = (isinstance(business, str) and business.strip() and isinstance(start, str) and isinstance(end, str) and
                       isinstance(user, str) and user.strip() and isinstance(category, str) and category.strip())

        if not verify_data:
            return Response('Invalid data submitted for processing')

        result = report.fetch_iv_report(business=business, user=user, company=company,
                                        start=start, end=end, category=category)
        
        return Response(result)
    
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])   
def fetch_trial_balance(request):
    if request.method == 'POST':
        business = request.data['business']
        user = request.data['user']
        start = request.data['startDate']
        end = request.data['endDate']
        company = request.user.id

        verify_data = (isinstance(business, str) and business.strip() and isinstance(start, str) and isinstance(end, str) and
                       isinstance(user, str) and user.strip())

        if not verify_data:
            return Response('Invalid data submitted for processing')

        result = report.fetch_tb_report(business=business, user=user, company=company,
                                        start=start, end=end)
        
        return Response(result)

    
#dashboard

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def dashboard_stock(request):
    if request.method == 'POST':
        business = request.data['business']
        company = request.user.id
        user = request.data['user']
        location = request.data['selectedLocation']

        verify_data = (isinstance(business, str) and business.strip() and
                       isinstance(user, str) and user.strip() and isinstance(location, str))

        if not verify_data:
            return Response('text_error')
        
        result = report.fetch_data_for_dashboard(business=business, company=company, user=user, location=location)
    
        return Response(result)