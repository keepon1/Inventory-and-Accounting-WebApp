from re import T
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings

def set_tokens_as_cookies(response, user):
    refresh = RefreshToken.for_user(user)
    access = refresh.access_token

    response.set_cookie(
        key="access",
        value=str(access),
        httponly=True,
        secure=True,
        samesite="None",
        max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
    )

    response.set_cookie(
        key="refresh",
        value=str(refresh),
        httponly=True,
        secure=True,
        samesite="None",
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
    )

    response.data["access"] = str(access)

    return response
