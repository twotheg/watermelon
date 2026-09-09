'use client';

import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function PushManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [pushSecret, setPushSecret] = useState('');
  const [message, setMessage] = useState('과일 합치기! 새 기록에 도전해 보세요 🍉');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setIsSupported(true);

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscription(sub))
      .catch(() => {});

    fetch('/api/push/key')
      .then((r) => r.json())
      .then((data) => setPublicKey(data.publicKey))
      .catch(() => setStatus('푸시 키를 불러오지 못했어요.'));
  }, []);

  async function subscribe() {
    if (!publicKey) return;
    setStatus('구독 중...');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as ArrayBuffer,
      });
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
      setSubscription(sub);
      setStatus('푸시 알림이 구독되었어요!');
    } catch (e) {
      setStatus('구독에 실패했어요. 브라우저 권한을 확인해 주세요.');
    }
  }

  async function unsubscribe() {
    if (!subscription) return;
    setStatus('구독 해제 중...');
    try {
      await subscription.unsubscribe();
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      setSubscription(null);
      setStatus('푸시 알림 구독이 해제되었어요.');
    } catch {
      setStatus('구독 해제에 실패했어요.');
    }
  }

  async function sendTest() {
    if (!pushSecret) {
      setStatus('PUSH_SECRET를 입력해 주세요.');
      return;
    }
    setStatus('테스트 알림 전송 중...');
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '과일 합치기',
          message,
          secret: pushSecret,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(`알림 전송 완료: ${data.sent}명 성공, ${data.failed}명 실패`);
      } else {
        setStatus(data.error || '전송에 실패했어요.');
      }
    } catch {
      setStatus('전송 중 오류가 발생했어요.');
    }
  }

  if (!isSupported) {
    return (
      <div className="mx-auto mt-4 max-w-md rounded-xl bg-orange-50 p-4 text-sm text-orange-700">
        이 브라우저는 푸시 알림을 지원하지 않아요.
      </div>
    );
  }

  return (
    <div className="mx-auto mt-4 max-w-md rounded-xl bg-white p-4 shadow">
      <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-800">
        🔔 푸시 알림
      </h3>
      {subscription ? (
        <div className="space-y-3">
          <p className="text-sm text-green-700">✅ 푸시 알림을 받고 있어요.</p>
          <button
            onClick={unsubscribe}
            className="w-full rounded-lg bg-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
          >
            구독 해제
          </button>
          <div className="space-y-2">
            <input
              value={pushSecret}
              onChange={(e) => setPushSecret(e.target.value)}
              placeholder="PUSH_SECRET"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
            />
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="테스트 메시지"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
            />
            <button
              onClick={sendTest}
              className="w-full rounded-lg bg-blue-500 py-2 text-sm font-semibold text-white hover:bg-blue-600"
            >
              테스트 알림 본인에게 보내기
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            새 기록이나 이벤트를 푸시 알림으로 받아볼 수 있어요.
          </p>
          <button
            onClick={subscribe}
            disabled={!publicKey}
            className="w-full rounded-lg bg-green-500 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:bg-slate-300"
          >
            푸시 알림 구독하기
          </button>
        </div>
      )}
      {status && <p className="mt-2 text-xs text-slate-500">{status}</p>}
    </div>
  );
}
