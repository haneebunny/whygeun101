from pydantic import BaseModel
from typing import Optional

class CustomerBase(BaseModel):
    name: str
    address: str

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True