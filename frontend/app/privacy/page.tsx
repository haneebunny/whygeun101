import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-2xl font-black text-slate-800 mb-6">
          개인정보 처리방침
        </h1>

        <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              1. 개인정보의 처리 목적
            </h2>
            <p>
              '모두의 외근'은(는) 다음의 목적을 위하여 개인정보를 처리합니다.
              처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지
              않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한
              조치를 이행할 예정입니다.
              <br />- 카카오 소셜 로그인을 통한 사용자 식별 및 서비스 제공
              <br />- 위치 기반(GPS) 영업 동선 시각화 및 최적 경로 안내
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              2. 수집하는 개인정보의 항목
            </h2>
            <p>
              회사는 회원가입, 상담, 서비스 신청 등을 위해 아래와 같은
              개인정보를 수집하고 있습니다.
              <br />- 필수항목 : 카카오 고유 식별자, 카카오 프로필 닉네임
              <br />- 선택항목 : 사용자의 실시간 기기 위치 정보 (GPS 기반 동선
              정렬 시에만 활용되며 서버에 영구 저장되지 않습니다.)
              <br />- 회원이 등록하는 제3자 정보 : 회원이 직접 입력하거나 엑셀 파일 업로드를 통해 등록하는 영업 대상 고객의 개인정보(이름, 주소, 연락처, 기기 모델명, 서비스 타입, 방문 메모 등). 이 정보는 회원의 영업 동선 관리 및 시각화 서비스 제공 목적으로만 시스템 내에 보관·위탁 처리되며, 회사는 이를 임의로 활용하거나 제3자에게 유출하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              3. 개인정보의 보유 및 이용기간
            </h2>
            <p>
              원칙적으로, 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를
              지체 없이 파기합니다. 단, 관계법령의 규정에 의하여 보존할 필요가
              있는 경우 회사는 관계법령에서 정한 일정한 기간 동안 회원정보를
              보관합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              4. 개인정보 보호책임자
            </h2>
            <p>
              - 이름 : 신하니
              <br />- 이메일 : re____@naver.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
