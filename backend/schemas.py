from pydantic import BaseModel
from typing import List, Optional

class UserCreateRequest(BaseModel):
    login: Optional[str] = None
    password: Optional[str] = None
    prefix: str = "user"

class UserUpdateRequest(BaseModel):
    password: str

class UserBase(BaseModel):
    id: str
    seq_id: int
    login: str
    password: str
    file: str
    enabled: bool

class UserEnriched(UserBase):
    link: str
    desktop: str

class UserListResponse(BaseModel):
    count: int
    users: List[UserEnriched]

class UserResponse(BaseModel):
    status: str
    data: UserEnriched

class UserCreateResponse(BaseModel):
    status: str
    data: UserEnriched

class GenericResponse(BaseModel):
    status: str
    message: str

class DeleteUserResponse(BaseModel):
    status: str
    message: str
    remaining_users: int

class LinkResponse(BaseModel):
    status: str
    link: str

class SystemStatusResponse(BaseModel):
    caddy_running: bool
    config_valid: bool

class ChangePasswordRequest(BaseModel):
    new_password: str
