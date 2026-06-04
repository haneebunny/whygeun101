from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    kakao_id = Column(String, unique=True, index=True)
    nickname = Column(String)

    # 💡 한 명의 유저는 여러 명의 고객을 가짐 (1:N 관계)
    customers = relationship("Customer", back_populates="owner")

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    address = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    phone = Column(String, nullable=True)
    status = Column(String, default="미컨택")
    
    # 💡 이 고객이 어떤 유저의 데이터인지 저장하는 외래키
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="customers")