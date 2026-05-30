import secrets
from config import config
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
from routes import router

security = HTTPBasic()

def get_current_username(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, "admin")
    correct_password = secrets.compare_digest(credentials.password, config.ADMIN_PASSWORD)
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

from utils import parse_users
from trusttunnel import sync_tt_credentials

@app.on_event("startup")
async def startup_event():
    sync_tt_credentials(parse_users())

app = FastAPI(
    root_path="/api",
    title="Naive Panel API",
    description="Advanced management API for NaiveProxy based on Caddy",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[f"https://ui.{config.DOMAIN}"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/docs", include_in_schema=False)
async def get_swagger_documentation(_: str = Depends(get_current_username)):
    return get_swagger_ui_html(openapi_url="/api/openapi.json", title="API Documentation")

@app.get("/redoc", include_in_schema=False)
async def get_redoc_documentation(_: str = Depends(get_current_username)):
    return get_redoc_html(openapi_url="/api/openapi.json", title="API Documentation")

@app.get("/openapi.json", include_in_schema=False)
async def openapi(_: str = Depends(get_current_username)):
    return get_openapi(title="Naive Panel API", version="1.0.0", routes=app.routes)

app.include_router(router)
