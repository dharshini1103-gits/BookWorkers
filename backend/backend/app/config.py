import os

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bookworker.db")
