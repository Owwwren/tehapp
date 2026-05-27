import bleach
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import json


class SanitizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Очищаем query-параметры
        if request.query_params:
            clean_params = {}
            for key, value in request.query_params.items():
                clean_params[key] = bleach.clean(str(value), tags=[], strip=True)
            request._query_params = clean_params

        response = await call_next(request)
        return response