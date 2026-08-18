self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 서비스 워커가 개입하지 않고 브라우저가 직접 처리하도록 우회(bypass)할 조건들:
  // 1. GET 요청이 아닌 경우 (POST, PUT, DELETE 등) - Request Body 스트림이 중복 소비되어 에러가 발생하는 것 방지
  // 2. Next.js 내부 리소스 및 빌드 본체 요청 (_next/...)
  // 3. 백엔드 API 요청 (/api/...)
  // 4. Next.js App Router의 RSC 데이터/프리페치 요청 (헤더에 RSC 또는 Next-Router 관련 설정이 있는 경우)
  if (
    event.request.method !== "GET" ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/") ||
    event.request.headers.get("RSC") ||
    event.request.headers.get("Next-Router-Prefetch") ||
    event.request.headers.get("Next-Router-State-Tree")
  ) {
    return; // event.respondWith를 호출하지 않으면 브라우저 기본 동작으로 네트워크 요청을 수행합니다.
  }

  event.respondWith(fetch(event.request));
});
