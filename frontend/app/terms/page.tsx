import React from "react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-2xl font-black text-slate-800 mb-6">
          서비스 이용약관
        </h1>

        <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              제 1 조 (목적)
            </h2>
            <p>
              본 약관은 '모두의 외근'(이하 "서비스")이 제공하는 위치 기반 영업 동선 최적화 및 고객 관리 서비스의 이용 조건 및 절차, 이용자와 서비스 제공자 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              제 2 조 (용어의 정의)
            </h2>
            <p>
              1. "서비스"라 함은 영업 사원 및 외근직 종사자의 효율적인 동선 관리를 위해 제공하는 웹 애플리케이션 및 관련 부가 서비스를 의미합니다.
              <br />
              2. "회원"이라 함은 카카오 소셜 로그인을 통해 회원가입을 완료하고 서비스를 이용하는 이용자를 말합니다.
              <br />
              3. "고객 정보"라 함은 회원이 동선 관리 목적으로 서비스 내에 직접 입력하거나 엑셀 업로드를 통해 등록한 제3자(영업 대상 고객 등)의 주소, 연락처, 메모 등의 정보를 의미합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              제 3 조 (서비스의 제공 및 변경)
            </h2>
            <p>
              1. 서비스는 회원에게 카카오 로그인 연동, 영업 고객 위치 지도 표시, 동선 최적화 정렬, 3시간 뒤 날씨 정보 제공 등의 기능을 기본 무료 서비스로 제공합니다.
              <br />
              2. 서비스 제공자는 서비스 고도화 및 기술적 필요에 따라 제공하는 기능의 일부 또는 전부를 변경하거나 중단할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              제 4 조 (회원의 의무 및 개인정보 보호)
            </h2>
            <p>
              1. 회원은 본 서비스에 타인의 개인정보(영업 대상 고객의 이름, 연락처, 주소 등)를 등록할 경우, 개인정보 보호법 등 관계 법령에 규정된 적법한 동의나 권한을 보유해야 하며 이를 준수할 책임이 있습니다.
              <br />
              2. 회원의 귀책 사유로 발생한 타인의 개인정보 유출, 오남용 등의 법적 책임에 대하여 서비스 제공자는 일체의 책임을 지지 않습니다.
              <br />
              3. 회원은 서비스의 안정적 운영을 방해하거나 비정상적인 방법으로 시스템에 부하를 주는 행위를 하여서는 안 됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              제 5 조 (책임의 제한)
            </h2>
            <p>
              1. 서비스 제공자는 천재지변, 서버 점검, 네트워크 장애 등 불가항력적인 사유로 서비스를 일시적으로 중단할 수 있으며, 이로 인해 발생한 회원의 손실에 대해 책임을 지지 않습니다.
              <br />
              2. 본 서비스에서 안내하는 영업 동선 최적화 결과 및 기상 예보 정보는 외부 API(카카오 맵, Open-Meteo) 등의 데이터를 참조하므로 실제 환경과 다를 수 있으며, 이에 따른 영업적 손실에 대해 책임을 보증하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              제 6 조 (관할법원)
            </h2>
            <p>
              본 서비스 이용과 관련하여 분쟁이 발생하는 경우, 서비스 제공자의 본점 소재지를 관할하는 법원을 합의 관할법원으로 합니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
