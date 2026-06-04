# reset_db.py
from dotenv import load_dotenv
load_dotenv()  

from backend.database import engine
from backend import models

print("기존 클라우드 DB 테이블을 싹 지웁니다...")
models.Base.metadata.drop_all(bind=engine)

print("새로운 구조(user_id 포함)로 테이블을 다시 만듭니다...")
models.Base.metadata.create_all(bind=engine)

print("초기화 완료! 🎉 이제 서버를 다시 켜주세요.")