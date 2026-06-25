from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.user import UserRepository, RoleRepository
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.schemas import (
    RegisterRequest,
    LoginRequest,
    Token,
    UserResponse,
    RoleResponse,
)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)

    async def register(self, data: RegisterRequest) -> UserResponse:
        existing = await self.user_repo.get_by_email(data.email)
        if existing:
            raise ValueError("Email already registered")

        role = await self.role_repo.get_by_id(data.role_id)
        if not role:
            raise ValueError("Invalid role")

        user = await self.user_repo.create({
            "full_name": data.full_name,
            "email": data.email,
            "hashed_password": hash_password(data.password),
            "phone": data.phone,
            "role_id": data.role_id,
        })
        return UserResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            phone=user.phone,
            is_active=user.is_active,
            role=RoleResponse.model_validate(role),
            created_at=user.created_at,
        )

    async def login(self, data: LoginRequest) -> Token:
        user = await self.user_repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.hashed_password):
            raise ValueError("Invalid credentials")
        if not user.is_active:
            raise ValueError("Account is inactive")

        token_data = {"sub": str(user.id), "email": user.email, "role": user.role.name}
        return Token(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
        )

    async def get_me(self, user_id: int) -> UserResponse:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        role = await self.role_repo.get_by_id(user.role_id)
        return UserResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            phone=user.phone,
            is_active=user.is_active,
            role=RoleResponse.model_validate(role),
            created_at=user.created_at,
        )
