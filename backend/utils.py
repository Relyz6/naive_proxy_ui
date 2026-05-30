import re
import secrets
import string
import subprocess
from pathlib import Path
from urllib.parse import quote

from config import config
from trusttunnel import generate_tt_link, sync_tt_credentials

USERS_DIR = Path("/etc/caddy/users")
CADDY_CONFIG = "/etc/caddy/Caddyfile"


def enrich_user(user: dict) -> dict:
    login = user["login"]
    password = user["password"]

    # Generate TT link
    tt_link = generate_tt_link(login, password)

    return {
        **user,
        "link": f"naive+quic://{quote(login)}:{quote(password)}@{config.DOMAIN}",
        "tt_link": tt_link,
    }


def gen_token(length: int) -> str:
    alphabet = string.ascii_letters + string.digits

    return "".join(secrets.choice(alphabet) for _ in range(length))


def user_file(login: str) -> Path:
    return USERS_DIR / f"{login}.conf"

def disabled_user_file(login: str) -> Path:
    return USERS_DIR / f"{login}.conf.disabled"


def add_user_to_file(login: str, password: str, seq_id: int):
    USERS_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    file = user_file(login)

    content = f"# id: {seq_id}\n# user: {login}\nbasic_auth {login} {password}\n"

    file.write_text(content)

    file.chmod(0o600)


def remove_user_from_file(login: str):
    active = user_file(login)
    disabled = disabled_user_file(login)

    if active.exists():
        active.unlink()
    
    if disabled.exists():
        disabled.unlink()

def toggle_user_status(login: str, enable: bool) -> bool:
    active = user_file(login)
    disabled = disabled_user_file(login)

    if enable:
        if disabled.exists():
            disabled.rename(active)
            return True
        elif active.exists():
            return True
    else:
        if active.exists():
            active.rename(disabled)
            return True
        elif disabled.exists():
            return True
    
    return False


def parse_users():
    USERS_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    users = []

    for file in USERS_DIR.glob("*.conf*"):
        if not file.name.endswith(".conf") and not file.name.endswith(".conf.disabled"):
            continue

        try:
            text = file.read_text()

            match = re.search(
                r"basic_auth\s+(\S+)\s+(\S+)",
                text,
            )

            if not match:
                continue

            login = match.group(1)
            password = match.group(2)
            enabled = file.name.endswith(".conf")
            
            id_match = re.search(r"# id:\s*(\d+)", text)
            seq_id = int(id_match.group(1)) if id_match else 0

            users.append(
                {
                    "id": login,
                    "seq_id": seq_id,
                    "login": login,
                    "password": password,
                    "file": file.name,
                    "enabled": enabled,
                }
            )

        except Exception:
            continue

    users.sort(key=lambda x: x["login"])

    return users


def write_caddyfile(users):
    sync_tt_credentials(users)
    subprocess.run(["systemctl", "reload", "caddy"], check=False)


def validate_caddy() -> bool:
    result = subprocess.run(
        [
            "caddy",
            "validate",
            "--config",
            CADDY_CONFIG,
        ],
        capture_output=True,
        text=True,
    )

    return result.returncode == 0


def reload_caddy() -> bool:
    sync_tt_credentials(parse_users())
    result = subprocess.run(
        [
            "caddy",
            "reload",
            "--config",
            CADDY_CONFIG,
        ],
        capture_output=True,
        text=True,
    )

    return result.returncode == 0
