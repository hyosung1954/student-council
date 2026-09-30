const CACHE_NAME = 'student-council-v12-20261001';

const CORE = [
  './manifest.webmanifest'
];

// ================================
// Service Worker 설치
// ================================

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(CORE);
      })
      .catch(error => {
        console.error(
          '캐시 설치 실패:',
          error
        );
      })
  );

  // 새 Service Worker를 바로 활성화 준비
  self.skipWaiting();
});


// ================================
// Service Worker 활성화
// ================================

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // 이전 버전 캐시 삭제
      const keys =
        await caches.keys();

      await Promise.all(
        keys
          .filter(
            key =>
              key !== CACHE_NAME
          )
          .map(
            key =>
              caches.delete(key)
          )
      );

      // 현재 열려 있는 앱에도
      // 새 Service Worker 즉시 적용
      await self.clients.claim();
    })()
  );
});


// ================================
// 네트워크 요청 처리
// ================================

self.addEventListener('fetch', event => {
  // GET 요청만 처리
  if (
    event.request.method !==
    'GET'
  ) {
    return;
  }

  const req =
    event.request;

  const accept =
    req.headers.get('accept') || '';

  const isHtml =
    req.mode === 'navigate' ||
    accept.includes('text/html');


  // ----------------------------
  // index.html 같은 페이지
  // ----------------------------
  //
  // 항상 최신 GitHub Pages 버전을
  // 먼저 가져오도록 함
  //
  // 이전 index.html 캐시 때문에
  // 수정사항이 안 보이는 문제 방지
  // ----------------------------

  if (isHtml) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(
            req,
            {
              cache: 'no-store'
            }
          );
        } catch (error) {
          // 인터넷이 없으면
          // 캐시가 있을 경우 사용
          return (
            await caches.match('./')
          ) || Response.error();
        }
      })()
    );

    return;
  }


  // ----------------------------
  // 기타 파일
  // ----------------------------

  event.respondWith(
    (async () => {
      const cached =
        await caches.match(req);

      if (cached) {
        return cached;
      }

      return fetch(req);
    })()
  );
});


// ================================
// 푸시 알림 수신
// ================================

self.addEventListener('push', event => {
  let data = {};

  try {
    data =
      event.data
        ? event.data.json()
        : {};
  } catch (error) {
    data = {
      body:
        event.data
          ? event.data.text()
          : ''
    };
  }


  const title =
    data.title ||
    '학생회 알림';


  const options = {
    body:
      data.body || '',

    tag:
      data.tag ||
      `student-council-${Date.now()}`,

    data: {
      url:
        data.url ||
        './'
    }
  };


  event.waitUntil(
    self.registration
      .showNotification(
        title,
        options
      )
  );
});


// ================================
// 알림 클릭
// ================================

self.addEventListener(
  'notificationclick',
  event => {

    // 알림창 닫기
    event.notification.close();


    const target =
      new URL(
        event.notification
          .data?.url || './',

        self.registration.scope
      ).href;


    event.waitUntil(
      (async () => {

        // 이미 학생회 앱이
        // 실행 중인지 확인
        const windows =
          await clients.matchAll({
            type: 'window',
            includeUncontrolled: true
          });


        // 이미 열려 있다면
        // 기존 앱으로 이동
        for (
          const client of windows
        ) {
          if (
            'focus' in client
          ) {
            await client.focus();

            try {
              if (
                'navigate' in
                client
              ) {
                await client.navigate(
                  target
                );
              }
            } catch (
              error
            ) {}

            return;
          }
        }


        // 앱이 열려 있지 않으면
        // 새로 실행
        if (
          clients.openWindow
        ) {
          await clients.openWindow(
            target
          );
        }
      })()
    );
  }
);
