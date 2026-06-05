from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import pandas as pd
import io
import re
import requests
import os
from pydantic import BaseModel
from dotenv import load_dotenv

from backend import models
from backend import schemas
from backend.database import engine, get_db
from backend.models import Customer
from backend.schemas import AddressUpdateRequest, StatusUpdateRequest

import jwt
from datetime import datetime, timedelta
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-123")
ALGORITHM = "HS256"


load_dotenv()

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sales Route Map API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")


# 💡 API 요청을 받을 때 누구인지 확인하는 함수 
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id: int = int(payload.get("sub"))
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user is None:
            raise HTTPException(status_code=401, detail="유효하지 않은 유저입니다.")
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="토큰이 만료되었거나 유효하지 않습니다.")

def get_coordinates_via_kakao(address: str) -> tuple[float | None, float | None]:
    headers = {"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"}
    
    addr_url = "https://dapi.kakao.com/v2/local/search/address.json"
    try:
        response = requests.get(addr_url, headers=headers, params={"query": address}, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get("documents"):
                return float(data["documents"][0]["y"]), float(data["documents"][0]["x"])
    except:
        pass

    keyword_url = "https://dapi.kakao.com/v2/local/search/keyword.json"
    try:
        response = requests.get(keyword_url, headers=headers, params={"query": address}, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get("documents"):
                return float(data["documents"][0]["y"]), float(data["documents"][0]["x"])
    except:
        pass
        
    return None, None

@app.post("/api/customers/upload")
async def upload_excel(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="엑셀 파일만 업로드 가능합니다.")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        if '실사용자명' not in df.columns or '주소' not in df.columns:
            raise HTTPException(status_code=400, detail="'실사용자명'과 '주소' 열이 필요합니다.")
            
        phone_col = '휴대폰번호' if '휴대폰번호' in df.columns else '전화번호' if '전화번호' in df.columns else None
        
        # 💡 for 반복문 시작! (여기 안쪽에 코드들이 쏙 들어가야 해!)
        for index, row in df.iterrows():
            name = str(row['실사용자명']).strip()
            raw_address = str(row['주소']).strip()
            
            phone = ""
            if phone_col and pd.notna(row[phone_col]):
                phone_raw = str(row[phone_col]).strip()
                if phone_raw.endswith(".0"):
                    phone_raw = phone_raw[:-2]
                if phone_raw and not phone_raw.startswith("0"):
                    phone_raw = "0" + phone_raw
                phone = phone_raw
            
            # 💡 모델명 & 서비스 타입 가져오기 (들여쓰기 완벽!)
            model_name = str(row['모델명']).strip() if '모델명' in df.columns and pd.notna(row['모델명']) else ""
            service_type = str(row['서비스 타입']).strip() if '서비스 타입' in df.columns and pd.notna(row['서비스 타입']) else ""
            
            # 내 데이터 중에 중복이 있는지 확인
            existing = db.query(models.Customer).filter(
                models.Customer.name == name,
                models.Customer.address == raw_address,
                models.Customer.user_id == current_user.id
            ).first()
            
            if existing:
                continue
            
            refined_address = re.sub(r'\(.*?\)', '', raw_address)
            refined_address = re.sub(r'\s+', ' ', refined_address).strip()
            lat, lng = get_coordinates_via_kakao(refined_address)
            
            db_customer = models.Customer(
                name=name,
                address=raw_address,
                latitude=lat,
                longitude=lng,
                phone=phone,      
                status="미컨택",
                model_name=model_name,       # 추가됨!
                service_type=service_type,   # 추가됨!
                user_id=current_user.id
            )
            db.add(db_customer)
            
        db.commit()
        return {"message": "업로드 및 동기화 처리가 완료되었습니다."}

    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"서버 내부 오류: {str(e)}")

# 💡 상태 저장 API 신설
@app.put("/api/customers/{customer_id}/status")
def update_customer_status(customer_id: int, payload: StatusUpdateRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.user_id == current_user.id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="고객을 찾을 수 없습니다.")
    
    customer.status = payload.status
    db.commit()
    return {"success": True}

@app.get("/api/customers")
def get_customers(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 💡 내 이름표(user_id)가 붙은 고객만 가져오기!
    all_customers = db.query(models.Customer).filter(models.Customer.user_id == current_user.id).all()
    
    success_list = []
    failed_list = []
    for c in all_customers:
        if c.latitude is not None and c.longitude is not None:
            success_list.append({
                "id": c.id, "name": c.name, "address": c.address,
                "latitude": c.latitude, "longitude": c.longitude,
                "phone": c.phone, "status": c.status,
                "model_name": c.model_name,     
                "service_type": c.service_type 
            })
        else:
            failed_list.append({
                "id": c.id, "row": 0, "name": c.name, "address": c.address
            })
    return {"success_list": success_list, "failed_list": failed_list}

@app.put("/api/customers/{customer_id}")
def update_customer_address(customer_id: int, payload: AddressUpdateRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.user_id == current_user.id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="고객 정보를 찾을 수 없습니다.")
    
    new_address = payload.address.strip()
    lat, lng = get_coordinates_via_kakao(new_address)
    
    customer.address = new_address
    customer.latitude = lat
    customer.longitude = lng
    db.commit()
    db.refresh(customer)
    
    return {
        "success": lat is not None and lng is not None,
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "address": customer.address,
            "latitude": customer.latitude,
            "longitude": customer.longitude
        }
    }

@app.delete("/api/customers")
def clear_all_customers(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 💡 다른 사람 데이터는 놔두고, 내 데이터만 싹 지우기!
    db.query(models.Customer).filter(models.Customer.user_id == current_user.id).delete()
    db.commit()
    return {"message": "나의 모든 영업 동선 데이터가 초기화되었습니다."}

@app.delete("/api/customers/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.user_id == current_user.id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="고객을 찾을 수 없습니다.")
    
    db.delete(customer)
    db.commit()
    
    return {"message": "성공적으로 삭제되었습니다.", "deleted_id": customer_id}

# 💡 [조회 API 사양 변경] 성공과 실패 대상을 분리하여 반환
@app.get("/api/customers")
def get_customers(db: Session = Depends(get_db)):
    all_customers = db.query(models.Customer).all()
    
    success_list = []
    failed_list = []
    
    for c in all_customers:
        if c.latitude is not None and c.longitude is not None:
            success_list.append({
                "id": c.id,
                "name": c.name,
                "address": c.address,
                "latitude": c.latitude,
                "longitude": c.longitude
            })
        else:
            failed_list.append({
                "id": c.id,
                "row": 0,  # 영속화된 데이터이므로 행 번호는 기본값 대체
                "name": c.name,
                "address": c.address
            })
            
    return {
        "success_list": success_list,
        "failed_list": failed_list
    }


@app.delete("/api/customers/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    # 💡 데이터베이스에서 해당 ID를 가진 고객 탐색
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="고객을 찾을 수 없습니다.")
    
    # 💡 데이터 삭제 및 커밋
    db.delete(customer)
    db.commit()
    
    return {"message": "성공적으로 삭제되었습니다.", "deleted_id": customer_id}

# 💡 ---------------- 카카오 로그인 API ---------------- 💡

class KakaoLoginRequest(BaseModel):
    code: str
    redirect_uri: str

@app.post("/api/auth/kakao")
def kakao_login(payload: KakaoLoginRequest, db: Session = Depends(get_db)):
    # 1. 프론트엔드에서 받은 인가 코드로 카카오 토큰 발급받기
    token_url = "https://kauth.kakao.com/oauth/token"
    data = {
        "grant_type": "authorization_code",
        "client_id": KAKAO_REST_API_KEY,
        "redirect_uri": payload.redirect_uri,
        "code": payload.code,
    }
    res = requests.post(token_url, data=data)
    token_data = res.json()
    
    if "access_token" not in token_data:
        raise HTTPException(status_code=400, detail="카카오 로그인에 실패했습니다.")
        
    # 2. 발급받은 토큰으로 카카오 유저 정보(프로필) 가져오기
    user_info_url = "https://kapi.kakao.com/v2/user/me"
    headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    user_res = requests.get(user_info_url, headers=headers)
    user_data = user_res.json()
    
    kakao_id = str(user_data["id"])
    nickname = user_data.get("properties", {}).get("nickname", "영업사원")
    
    # 3. 우리 DB에 있는 유저인지 확인 (없으면 새로 가입 처리)
    user = db.query(models.User).filter(models.User.kakao_id == kakao_id).first()
    if not user:
        user = models.User(kakao_id=kakao_id, nickname=nickname)
        db.add(user)

    else:
        # 💡 이미 가입된 유저라도, 카카오에서 닉네임을 줬다면 최신으로 업데이트!
        if nickname != "영업사원":
            user.nickname = nickname
    db.commit()
    db.refresh(user)
    
    
        
    # 4. 우리 서비스 전용 JWT 토큰 발급 (유효기간 7일)
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode = {"sub": str(user.id), "exp": expire}
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    
    return {"access_token": encoded_jwt, "nickname": user.nickname}

