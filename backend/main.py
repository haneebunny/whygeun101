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
async def upload_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="엑셀 파일만 업로드 가능합니다.")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        if '실사용자명' not in df.columns or '주소' not in df.columns:
            raise HTTPException(status_code=400, detail="'실사용자명'과 '주소' 열이 필요합니다.")
            
        phone_col = '휴대폰번호' if '휴대폰번호' in df.columns else '전화번호' if '전화번호' in df.columns else None
        
        for index, row in df.iterrows():
            name = str(row['실사용자명']).strip()
            raw_address = str(row['주소']).strip()
            
            # 💡 [전화번호 보정 로직 추가]
            phone = ""
            if phone_col and pd.notna(row[phone_col]):
                phone_raw = str(row[phone_col]).strip()
                
                # 1. 엑셀이 숫자로 인식해서 끝에 '.0'을 붙였다면 제거
                if phone_raw.endswith(".0"):
                    phone_raw = phone_raw[:-2]
                    
                # 2. 맨 앞의 '0'이 날아갔다면 다시 붙여주기 (한국 번호는 무조건 0으로 시작)
                if phone_raw and not phone_raw.startswith("0"):
                    phone_raw = "0" + phone_raw
                    
                phone = phone_raw
            
            existing = db.query(models.Customer).filter(
                models.Customer.name == name,
                models.Customer.address == raw_address
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
                status="미컨택"   
            )
            db.add(db_customer)
            
        db.commit()
        return {"message": "업로드 및 동기화 처리가 완료되었습니다."}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"서버 내부 오류: {str(e)}")

# 💡 상태 저장 API 신설
@app.put("/api/customers/{customer_id}/status")
def update_customer_status(customer_id: int, payload: StatusUpdateRequest, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="고객을 찾을 수 없습니다.")
    
    customer.status = payload.status
    db.commit()
    return {"success": True}

@app.get("/api/customers")
def get_customers(db: Session = Depends(get_db)):
    all_customers = db.query(models.Customer).all()
    success_list = []
    failed_list = []
    for c in all_customers:
        if c.latitude is not None and c.longitude is not None:
            success_list.append({
                "id": c.id, "name": c.name, "address": c.address,
                "latitude": c.latitude, "longitude": c.longitude,
                "phone": c.phone, "status": c.status  # 💡 반환값 추가
            })
        else:
            failed_list.append({
                "id": c.id, "row": 0, "name": c.name, "address": c.address
            })
    return {"success_list": success_list, "failed_list": failed_list}

@app.put("/api/customers/{customer_id}")
def update_customer_address(customer_id: int, payload: AddressUpdateRequest, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
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
def clear_all_customers(db: Session = Depends(get_db)):
    db.query(models.Customer).delete()
    db.commit()
    return {"message": "모든 영업 동선 데이터가 초기화되었습니다."}

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