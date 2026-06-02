import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 💡 Render 환경 변수(DATABASE_URL)를 먼저 읽어옴
raw_db_url = os.getenv("DATABASE_URL")

if raw_db_url:
    # 💡 [핵심] Render가 준 주소가 postgresql://로 시작한다면, 
    # SQLAlchemy가 인식할 수 있게 postgresql+psycopg2:// 형태로 앞머리를 강제 치환해 줌
    if raw_db_url.startswith("postgresql://"):
        SQLALCHEMY_DATABASE_URL = raw_db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    else:
        SQLALCHEMY_DATABASE_URL = raw_db_url
else:
    # 로컬 컴퓨터에서 테스트할 때는 기존처럼 파일 기반 sqlite 데이터베이스 사용
    SQLALCHEMY_DATABASE_URL = "sqlite:///./sales_map.db"

# 데이터베이스 연결 엔진 생성
if "sqlite" in SQLALCHEMY_DATABASE_URL:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    except:
        db.close()