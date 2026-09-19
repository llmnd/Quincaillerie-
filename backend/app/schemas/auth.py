from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned.count("@") != 1:
            raise ValueError("Invalid email address")
        local_part, domain = cleaned.split("@", 1)
        if not local_part or not domain or "." not in domain:
            raise ValueError("Invalid email address")
        return cleaned


class BootstrapAdminRequest(LoginRequest):
    full_name: str = Field(min_length=2, max_length=255)
    organization_name: str = Field(min_length=2, max_length=255)
    organization_logo: str | None = Field(default=None, max_length=2_000_000)


class UserCreate(BaseModel):
    email: str
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8)
    role: Literal["admin", "seller"] = "seller"

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned.count("@") != 1:
            raise ValueError("Invalid email address")
        local_part, domain = cleaned.split("@", 1)
        if not local_part or not domain or "." not in domain:
            raise ValueError("Invalid email address")
        return cleaned


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    email: str | None = None
    role: Literal["admin", "seller"] | None = None
    password: str | None = Field(default=None, min_length=8)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = value.strip().lower()
        if cleaned.count("@") != 1:
            raise ValueError("Invalid email address")
        local_part, domain = cleaned.split("@", 1)
        if not local_part or not domain or "." not in domain:
            raise ValueError("Invalid email address")
        return cleaned


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int | None = None
    email: str
    full_name: str
    role: Literal["admin", "seller"]
    is_active: bool
    access_token: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead