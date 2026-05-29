from os import getenv

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Config(BaseSettings):
    CADDYFILE: str = getenv("CADDYFILE", "")
    USERS_CONF: str = getenv("USERS_CONF", "")
    DOMAIN: str = getenv("DOMAIN", "")
    ADMIN_PASSWORD: str = getenv("ADMIN_PASSWORD", "")


config = Config()
