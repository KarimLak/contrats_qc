from pydantic import BaseModel, ConfigDict, Field

class UserLogin(BaseModel):
    username: str = Field(..., min_length=0, max_length=255)
    password: str = Field(..., min_length=0, max_length=255)

class UserRegister(BaseModel):
    username: str = Field(..., min_length=0, max_length=255)
    email: str = Field(..., min_length=0, max_length=255)
    password: str = Field(..., min_length=0, max_length=255)

class UserResponse(BaseModel):
    id: int = Field(..., ge=0)
    username: str = Field(..., min_length=0, max_length=255)
    email: str = Field(..., min_length=0, max_length=255)
    is_active: str = Field(False)
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"