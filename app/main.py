from fastapi import FastAPI
from slowapi.errors import RateLimitExceeded
from slowapi.extension import _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from app.routers import auth, user
from slowapi import Limiter


app = FastAPI()

app.include_router(auth.router, prefix='/v1')
app.include_router(user.router, prefix='/v1')

limiter = Limiter(key_func=get_remote_address)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SlowAPIMiddleware)

@app.get("/health")
def health():
    return {"status": "ok"}

