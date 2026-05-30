from os import getenv

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Config(BaseSettings):
    CADDYFILE: str = getenv("CADDYFILE", "")
    USERS_CONF: str = getenv("USERS_CONF", "")
    DOMAIN: str = getenv("DOMAIN", "")
    ADMIN_PASSWORD: str = getenv("ADMIN_PASSWORD", "")
    TT_HOST: str = getenv("TT_HOST", "")
    TT_PORT: int = int(getenv("TT_PORT", "8443"))
    TT_CREDENTIALS_PATH: str = getenv("TT_CREDENTIALS_PATH", "/opt/trusttunnel/credentials.toml")
    TT_CUSTOM_SNI: str = getenv("TT_CUSTOM_SNI", "")
    TT_SKIP_VERIFY: bool = getenv("TT_SKIP_VERIFY", "true").lower() == "true"


config = Config()
