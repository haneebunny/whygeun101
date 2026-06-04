from pydantic import BaseModel
from typing import Optional

class CustomerBase(BaseModel):
    name: str
    address: str
    phone: Optional[str] = None
    status: Optional[str] = "미컨택"

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True

class AddressUpdateRequest(BaseModel):
    address: str

class StatusUpdateRequest(BaseModel):
    status: str