export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#FFF8E7] p-8 text-slate-800">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold text-green-700">개인정보처리방침 (Privacy Policy)</h1>
        <p className="mb-6 text-sm text-slate-500">최종 수정일: 2026년 9월 10일</p>

        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">1. 개인정보 수집 및 이용</h2>
          <p className="leading-relaxed text-slate-700">
            '과일 합치기 (Fruit Merge)'는 회원가입을 요구하지 않으며, 사용자의 고유한 개인정보(이름, 연락처, 이메일 등)를 직접 수집, 저장, 처리하지 않습니다. 
            게임 내 최고 점수는 서버가 아닌 사용자의 기기(로컬 스토리지)에만 안전하게 저장됩니다.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">2. 제3자 서비스 및 광고 (Google AdSense)</h2>
          <p className="leading-relaxed text-slate-700">
            본 앱은 무료 서비스 제공을 위해 Google AdSense를 통한 광고를 게재합니다. 
            Google을 포함한 제3자 공급업체는 쿠키를 사용하여 사용자가 이 앱이나 다른 웹사이트에 이전에 방문한 기록을 기반으로 맞춤 광고를 게재할 수 있습니다. 
            사용자는 <a href="https://myadcenter.google.com/" target="_blank" rel="noreferrer" className="text-blue-500 underline">Google 광고 설정</a>을 방문하여 맞춤설정 광고를 선택 해제할 수 있습니다.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">3. 푸시 알림</h2>
          <p className="leading-relaxed text-slate-700">
            사용자가 웹 푸시 알림 수신에 동의한 경우에 한해, 브라우저가 제공하는 익명의 구독 식별자만을 사용하여 알림을 전송합니다. 
            이 식별자로는 특정 개인을 식별할 수 없으며, 기기 설정에서 언제든지 알림 수신을 차단할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">4. 문의처</h2>
          <p className="leading-relaxed text-slate-700">
            개인정보처리방침과 관련하여 궁금한 점이 있으시면 언제든지 문의해 주세요.
            twotheg@gmail.com
          </p>
        </section>
      </div>
    </div>
  );
}
