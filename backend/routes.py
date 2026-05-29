from config import config
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Body
)
from security import check_auth
from schemas import (
    UserListResponse,
    UserResponse,
    UserCreateResponse,
    UserCreateRequest,
    UserUpdateRequest,
    GenericResponse,
    DeleteUserResponse,
    LinkResponse,
    SystemStatusResponse
)
from utils import (
    add_user_to_file,
    enrich_user,
    gen_token,
    parse_users,
    reload_caddy,
    remove_user_from_file,
    validate_caddy,
    toggle_user_status
)

router = APIRouter()

# ----------------- USERS ----------------- #

@router.post("/users", response_model=UserCreateResponse, summary="Create a new user", tags=["Users"])
def create_user(
    request: UserCreateRequest = Body(default_factory=UserCreateRequest),
    _: str = Depends(check_auth),
):
    """
    Creates a new user. You can optionally provide a specific login and password. 
    If not provided, they will be generated automatically based on the prefix.
    """
    if request.login:
        login = request.login
    else:
        suffix = gen_token(6)
        login = f"{request.prefix}_{suffix}"

    password = request.password if request.password else gen_token(24)

    users = parse_users()
    if any(u["id"] == login for u in users):
        raise HTTPException(status_code=400, detail="User already exists")

    max_id = max((u.get("seq_id", 0) for u in users), default=0)
    seq_id = max_id + 1

    add_user_to_file(
        login,
        password,
        seq_id,
    )

    if not validate_caddy():
        remove_user_from_file(login)
        raise HTTPException(
            status_code=500,
            detail="Caddy config invalid",
        )

    if not reload_caddy():
        remove_user_from_file(login)
        raise HTTPException(
            status_code=500,
            detail="Caddy reload failed",
        )
    
    user_dict = {
        "id": login,
        "seq_id": seq_id,
        "login": login,
        "password": password,
        "file": f"{login}.conf",
        "enabled": True
    }

    return {
        "status": "ok",
        "data": enrich_user(user_dict),
    }


@router.get("/users", response_model=UserListResponse, summary="List all users", tags=["Users"])
def get_users(_: str = Depends(check_auth)):
    """
    Returns a list of all existing NaiveProxy users.
    """
    users = parse_users()
    enriched = [enrich_user(u) for u in users]

    return {
        "count": len(enriched),
        "users": enriched,
    }


@router.get("/users/{user_id}", response_model=UserResponse, summary="Get user details", tags=["Users"])
def get_user(user_id: str, _: str = Depends(check_auth)):
    """
    Returns detailed information about a specific user.
    """
    users = parse_users()

    for user in users:
        if user["id"] == user_id:
            return {
                "status": "ok",
                "data": enrich_user(user),
            }

    raise HTTPException(status_code=404, detail="User not found")


@router.put("/users/{user_id}", response_model=GenericResponse, summary="Update user password", tags=["Users"])
def update_user(user_id: str, request: UserUpdateRequest, _: str = Depends(check_auth)):
    """
    Updates the password for an existing user.
    """
    users = parse_users()
    target_user = None

    for user in users:
        if user["id"] == user_id:
            target_user = user
            break

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    add_user_to_file(
        user_id,
        request.password,
        target_user["seq_id"]
    )

    if not reload_caddy():
        # rollback to old password
        add_user_to_file(user_id, target_user["password"], target_user["seq_id"])
        raise HTTPException(status_code=500, detail="Caddy reload failed")

    return {
        "status": "ok",
        "message": f"Password updated for {user_id}",
    }


@router.get("/users/{user_id}/link", response_model=LinkResponse, summary="Get user connection link", tags=["Users"])
def get_user_link(user_id: str, _: str = Depends(check_auth)):
    """
    Returns the plain connection link for a specific user.
    """
    users = parse_users()

    for user in users:
        if user["id"] == user_id:
            enriched = enrich_user(user)
            return {
                "status": "ok",
                "link": enriched["link"],
            }

    raise HTTPException(status_code=404, detail="User not found")


@router.post("/users/{user_id}/toggle", response_model=GenericResponse, summary="Toggle user status", tags=["Users"])
def toggle_user(
    user_id: str, 
    enable: bool = Query(..., description="True to enable, False to disable"),
    _: str = Depends(check_auth)
):
    """
    Enables or disables a user by renaming their Caddy configuration file and reloading the server.
    """
    users = parse_users()
    exists = any(user["id"] == user_id for user in users)

    if not exists:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if not toggle_user_status(user_id, enable):
        raise HTTPException(
            status_code=500,
            detail="Failed to toggle user status"
        )
    
    if not reload_caddy():
        toggle_user_status(user_id, not enable)
        raise HTTPException(
            status_code=500,
            detail="Caddy reload failed"
        )
    
    action = "enabled" if enable else "disabled"
    return {
        "status": "ok",
        "message": f"User {user_id} {action} successfully",
    }


@router.delete("/users/{user_id}", response_model=DeleteUserResponse, summary="Delete a user", tags=["Users"])
def delete_user(
    user_id: str,
    _: str = Depends(check_auth),
):
    """
    Deletes a user's Caddy configuration file and reloads the server.
    """
    users = parse_users()

    if not users:
        raise HTTPException(
            status_code=400,
            detail="No users exist",
        )

    exists = any(user["id"] == user_id for user in users)

    if not exists:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if len(users) == 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete last remaining user",
        )

    remove_user_from_file(user_id)
    updated_users = parse_users()

    if not validate_caddy():
        raise HTTPException(
            status_code=500,
            detail="Caddy config invalid",
        )

    if not reload_caddy():
        raise HTTPException(
            status_code=500,
            detail="Caddy reload failed",
        )

    return {
        "status": "ok",
        "message": f"{user_id} deleted",
        "remaining_users": len(updated_users),
    }

# ----------------- SYSTEM ----------------- #

@router.get("/system/status", response_model=SystemStatusResponse, summary="Get system status", tags=["System"])
def get_system_status(_: str = Depends(check_auth)):
    """
    Checks if Caddy config is valid.
    """
    return {
        "caddy_running": True, # Hard to check process reliably across platforms without psutil
        "config_valid": validate_caddy()
    }

@router.post("/system/reload", response_model=GenericResponse, summary="Reload proxy server", tags=["System"])
def system_reload(_: str = Depends(check_auth)):
    """
    Manually forces a Caddy server reload.
    """
    if reload_caddy():
        return {"status": "ok", "message": "Proxy reloaded successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to reload proxy")

