from fastapi import FastAPI
from app.routers import auth, user

app = FastAPI()

app.include_router(auth.router, prefix='/v1')
app.include_router(user.router, prefix='/v1')

@app.get("/health")
def health():
    return {"status": "ok"}