from config import config
from fastapi import Header, HTTPException, Query

def check_auth(
    x_admin_password: str = Header(None),
    token: str = Query(None)
):
    provided = x_admin_password or token
    if provided != config.ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
