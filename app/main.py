from fastapi import FastAPI
from slowapi.errors import RateLimitExceeded
from slowapi.extension import _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from app.routers import auth, user, contract, profile, analytics, saved_contract
from slowapi import Limiter
from fastapi.middleware.cors import CORSMiddleware

from app import limiter
from app.database import create_tables, ensure_analytics_support, ensure_search_support


app = FastAPI()

app.include_router(auth.router, prefix='/v1')
app.include_router(user.router, prefix='/v1')
app.include_router(contract.router, prefix='/v1')
app.include_router(profile.router, prefix='/v1')
app.include_router(analytics.router, prefix='/v1')
app.include_router(saved_contract.router, prefix='/v1')

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

create_tables()
ensure_analytics_support()
ensure_search_support()

@app.get("/health")
def health():
    return {"status": "ok"}

