from config import config
from fastapi import Header, HTTPException


def check_auth(x_admin_password: str = Header(...)):
    if x_admin_password != config.ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
