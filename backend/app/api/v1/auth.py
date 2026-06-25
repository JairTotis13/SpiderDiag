from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.services.auth import AuthService
from app.schemas import (
    LoginRequest,
    RegisterRequest,
    Token,
    UserResponse,
    PasswordRecoveryRequest,
    PasswordResetRequest,
)
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    try:
        return await service.register(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=Token)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    try:
        return await service.login(data)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    return await service.get_me(current_user.id)


@router.post("/recovery")
async def request_password_recovery(data: PasswordRecoveryRequest, db: AsyncSession = Depends(get_db)):
    # In production, send email with reset token
    return {"message": "If the email exists, a recovery link has been sent"}


@router.post("/reset-password")
async def reset_password(data: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    # In production, validate token and update password
    return {"message": "Password has been reset successfully"}


@router.get("/roles")
async def get_roles(db: AsyncSession = Depends(get_db)):
    from app.repositories.user import RoleRepository
    repo = RoleRepository(db)
    roles = await repo.get_all()
    return [{"id": r.id, "name": r.name, "description": r.description} for r in roles]
