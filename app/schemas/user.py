from pydantic import BaseModel, ConfigDict, Field

class UserLogin(BaseModel):
    username: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=1, max_length=255)

class UserRegister(BaseModel):
    username: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=1, max_length=255)
    roles: list[str] =  Field(default_factory=lambda: ["user"], min_length=1)
    buisness_id: str = Field(..., min_length=1, max_length=255)

class UserResponse(BaseModel):
    id: int = Field(..., ge=0)
    username: str = Field(..., min_length=0, max_length=255)
    email: str = Field(..., min_length=0, max_length=255)
    is_active: bool = Field(False)
    roles: list[str] = Field(..., min_items=1)
    buisness_id: str = Field(..., min_length=1, max_length=255)
    model_config = ConfigDict(from_attributes=True)

