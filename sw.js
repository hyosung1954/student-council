const CACHE_NAME = 'student-council-v11-20261001';

const CORE = [
  './',
  './manifest.webmanifest'
];

// 새 Service Worker 설치
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

  // 새 버전을 바로 대기 상태에서 해제
  self.skipWaiting();
});

// 새 Service Worker 활성화
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // 예전 캐시 삭제
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

      // 열려 있는 페이지를
      // 새 Service Worker가 즉시 제어
      await self.clients.claim();
    })()
  );
});

// 페이지 및 파일 요청 처리
self.addEventListener('fetch', event => {
  // GET 요청만 처리
  if (
    event.request.method !==
    'GET'
  ) {
    return;
  }

  // HTML 페이지 이동 요청은
  // 항상 인터넷의 최신 버전을 먼저 확인
  if (
    event.request.mode ===
    'navigate'
  ) {
    event.respondWith(
      (async () => {
        try {
          const fresh =
            await fetch(
              event.request,
              {
                cache: 'no-store'
              }
            );

          // 최신 페이지를 캐시에 저장
          const cache =
            await caches.open(
              CACHE_NAME
            );

          cache
            .put(
              './',
              fresh.clone()
            )
            .catch(() => {});

          return fresh;
        } catch (error) {
          // 인터넷 연결 실패 시
          // 캐시된 페이지 사용
          return (
            await caches.match(
              event.request
            )
          ) || (
            await caches.match(
              './'
            )
          );
        }
      })()
    );

    return;
  }

  // 기타 파일은
  // 캐시 우선 → 없으면 인터넷
  event.respondWith(
    caches
      .match(event.request)
      .then(cached => {
        return (
          cached ||
          fetch(event.request)
        );
      })
  );
});

// ============================
// 푸시 알림 수신
// ============================

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

// ============================
// 알림 눌렀을 때
// ============================

self.addEventListener(
  'notificationclick',
  event => {
    // 알림 닫기
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
        // 열려 있는지 확인
        const list =
          await clients.matchAll({
            type: 'window',
            includeUncontrolled: true
          });

        // 이미 열려 있으면
        // 해당 창으로 이동
        for (
          const client of list
        ) {
          if (
            'focus' in client
          ) {
            await client.focus();

            if (
              'navigate' in
              client
            ) {
              try {
                await client.navigate(
                  target
                );
              } catch (
                error
              ) {}
            }

            return;
          }
        }

        // 열려 있지 않으면
        // 학생회 앱 새로 열기
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
