from pydantic import BaseModel, Field

class UserRequest(BaseModel):
    username: str = Field(..., ge=0, le=255)
    password: str = Field(..., ge=0, le=255)