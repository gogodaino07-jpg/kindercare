const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

initializeApp();

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');
const SUPPORT_EMAIL = 'gogodaino07@gmail.com';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * 앱(AIUsageLimitService)이 관리하는 무료(평생 5회 공유 풀)/프리미엄(주간·월간) 한도는
 * 클라이언트에서만 체크되므로, Firestore 문서를 직접 조작하거나 앱을 거치지 않고 이 함수를
 * 반복 호출하면 우회될 수 있다. 여기서는 실제 요금제를 서버가 알 방법이 없어 정확한
 * 무료/프리미엄 한도를 그대로 재현하진 않지만, 프리미엄 최대 한도(월 기준)를 절대 상한으로
 * 걸어 정상 이용자는 걸리지 않으면서 Gemini 비용이 무한정 새는 것만은 막는 최종 방어선이다.
 * 클라이언트가 관리하는 aiUsage/mealAiUsage/aiUsageFreeLifetime 문서와는 별도 문서에
 * 서버가 직접 카운트한다.
 */
const HARD_MONTHLY_LIMIT_BY_TYPE = { newsletter: 50, meal: 15 };

async function assertUnderHardLimit(email, usageType) {
  const limit = HARD_MONTHLY_LIMIT_BY_TYPE[usageType];
  const monthStart = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const guardRef = getFirestore().collection('users').doc(email).collection('serverGuard').doc(usageType);

  await getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(guardRef);
    const data = snap.exists ? snap.data() : null;
    const monthCount = data?.monthStart === monthStart ? (data.monthCount ?? 0) : 0;
    if (monthCount >= limit) {
      throw new HttpsError('resource-exhausted', '이번 달 AI 분석 한도를 모두 사용했어요.');
    }
    tx.set(guardRef, { monthStart, monthCount: monthCount + 1 });
  });
}

/**
 * 가정통신문 AI 분석 프록시.
 *
 * 진짜 Gemini API 키는 이 함수(서버)에만 있고 앱에는 절대 내려주지 않는다.
 * 프롬프트 조립·이미지 압축·결과 파싱은 그대로 앱(GeminiAnalysisService.ts)에서
 * 하고, 이 함수는 로그인된 사용자로부터 받은 요청 본문에 키를 붙여 Gemini에
 * 대신 전달해주는 역할만 한다 — 키가 기기/네트워크로 유출될 통로를 없애기 위함.
 */
exports.analyzeNewsletter = onCall(
  {
    secrets: [GEMINI_API_KEY],
    region: 'asia-northeast3',
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const email = request.auth.token?.email;
    if (!email) {
      throw new HttpsError('failed-precondition', '계정 이메일을 확인할 수 없습니다.');
    }

    const body = request.data?.body;
    if (!body || typeof body !== 'object') {
      throw new HttpsError('invalid-argument', '요청 본문이 올바르지 않습니다.');
    }
    const usageType = request.data?.usageType === 'meal' ? 'meal' : 'newsletter';

    await assertUnderHardLimit(email, usageType);

    let response;
    try {
      response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY.value()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      logger.error('Gemini fetch failed', err);
      throw new HttpsError('unavailable', 'AI 서버에 연결하지 못했어요.');
    }

    const json = await response.json();

    if (!response.ok) {
      logger.error('Gemini API error', { status: response.status, json });
      if (response.status === 429) {
        throw new HttpsError(
          'resource-exhausted',
          'AI 분석 요청이 너무 많습니다. 1분만 기다렸다가 다시 시도해 주세요.'
        );
      }
      const detail = json?.error?.message;
      throw new HttpsError(
        'internal',
        detail ? `Gemini 오류 (${response.status}): ${detail}` : `문서 분석에 실패했어요 (HTTP ${response.status})`
      );
    }

    return json;
  }
);

/**
 * 카카오 로그인 검증 프록시.
 *
 * 예전 클라이언트는 "고정 문자열 + 이메일"을 해시해 Firebase 이메일/비밀번호 로그인의
 * 비밀번호로 썼는데, 그 값은 이메일만 알면 누구나 계산 가능해(코드도 공개 저장소에
 * 그대로 노출됨) 계정 탈취에 악용될 수 있었다. 이제는 앱이 카카오 액세스 토큰만
 * 이 함수로 보내고, 여기서 카카오 서버에 그 토큰을 직접 검증받아 진짜 이메일을 확인한
 * 뒤 Firebase Custom Token을 발급해준다 — 클라이언트가 스스로 계산해서 위조할 수 있는
 * 값이 로그인 경로에 전혀 남지 않는다. 검증 성공 시 그 계정의 비밀번호도 아무도 모르는
 * 값으로 덮어써서, 예전 방식으로 만들어진 계정이라도 결정적 비밀번호로는 더 이상
 * 로그인되지 않게 막는다.
 */
exports.kakaoSignIn = onCall(
  { region: 'asia-northeast3', timeoutSeconds: 20 },
  async (request) => {
    const accessToken = request.data?.accessToken;
    if (!accessToken || typeof accessToken !== 'string') {
      throw new HttpsError('invalid-argument', '카카오 인증 정보가 올바르지 않습니다.');
    }

    let kakaoResponse;
    try {
      kakaoResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      logger.error('Kakao user info fetch failed', err);
      throw new HttpsError('unavailable', '카카오 서버에 연결하지 못했어요.');
    }

    if (!kakaoResponse.ok) {
      throw new HttpsError('unauthenticated', '카카오 인증에 실패했습니다.');
    }

    const kakaoUser = await kakaoResponse.json();
    const email = kakaoUser?.kakao_account?.email;
    if (!email || typeof email !== 'string') {
      throw new HttpsError(
        'failed-precondition',
        '카카오 계정에서 이메일을 확인할 수 없습니다. 카카오 계정 설정에서 이메일 제공에 동의해주세요.'
      );
    }

    const authAdmin = getAuth();
    let userRecord;
    try {
      userRecord = await authAdmin.getUserByEmail(email);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        userRecord = await authAdmin.createUser({ email, emailVerified: true });
      } else {
        logger.error('Kakao sign-in user lookup failed', err);
        throw new HttpsError('internal', '로그인 처리 중 오류가 발생했어요.');
      }
    }

    // 서로 의존하지 않는 두 호출(비밀번호 무효화 + 커스텀 토큰 서명)을 동시에 보내
    // 로그인 지연 시간을 줄인다.
    const [, customToken] = await Promise.all([
      authAdmin.updateUser(userRecord.uid, { password: crypto.randomBytes(32).toString('hex') }),
      authAdmin.createCustomToken(userRecord.uid),
    ]);
    return { customToken, email };
  }
);

/**
 * 회원탈퇴 시 Firebase Auth 계정 삭제 프록시.
 *
 * 클라이언트에서 직접 `currentUser.delete()`를 호출하면 Firebase가 "최근 로그인"이
 * 아닌 세션에 대해 auth/requires-recent-login 에러로 거부한다. 예전엔 이 실패를
 * 로그만 남기고 삼켜버려서, Firestore 데이터는 지워져도 Auth 계정은 살아남아 같은
 * 소셜 로그인으로 재로그인이 가능한 문제가 있었다. Admin SDK로 서버에서 지우면 이
 * "최근 로그인" 제약이 아예 없어 항상 확실하게 삭제된다.
 */
exports.deleteAccount = onCall(
  { region: 'asia-northeast3', timeoutSeconds: 20 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    try {
      await getAuth().deleteUser(request.auth.uid);
    } catch (err) {
      logger.error('Failed to delete Firebase Auth account', err);
      throw new HttpsError('internal', '계정 삭제 중 오류가 발생했어요.');
    }
    return { success: true };
  }
);

/** 하루에 같은 사람이 너무 많이 보내는 걸 막는 최소한의 방어선(스팸/오남용 방지). */
const SUPPORT_EMAIL_DAILY_LIMIT = 10;

async function assertUnderSupportEmailLimit(uid) {
  const todayKey = toISODateUTC(new Date());
  const guardRef = getFirestore().collection('users').doc(uid).collection('serverGuard').doc('supportEmail');

  await getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(guardRef);
    const data = snap.exists ? snap.data() : null;
    const dayCount = data?.dayKey === todayKey ? (data.dayCount ?? 0) : 0;
    if (dayCount >= SUPPORT_EMAIL_DAILY_LIMIT) {
      throw new HttpsError('resource-exhausted', '오늘 문의 가능 횟수를 모두 사용했어요. 내일 다시 시도해주세요.');
    }
    tx.set(guardRef, { dayKey: todayKey, dayCount: dayCount + 1 });
  });
}

function toISODateUTC(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * 고객센터 문의 메일 발송.
 *
 * 앱 안에 이메일 발송 백엔드가 없어서 예전엔 "문의 전송하기"를 눌러도 실제로는
 * 아무것도 보내지지 않고 성공 토스트만 뜨는 미완성 상태였다. 별도 이메일 API를
 * 새로 계약하는 대신, 이미 있는 Gmail 계정의 SMTP(앱 비밀번호)로 개발자 본인
 * 메일함에 직접 발송한다 — 사용자가 입력한 답변받을 이메일은 replyTo로 넣어서,
 * 그대로 "답장"만 눌러도 사용자에게 회신되게 한다.
 */
exports.sendSupportEmail = onCall(
  {
    secrets: [GMAIL_APP_PASSWORD],
    region: 'asia-northeast3',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const replyEmail = request.data?.replyEmail;
    const content = request.data?.content;
    if (!replyEmail || typeof replyEmail !== 'string' || !EMAIL_PATTERN.test(replyEmail)) {
      throw new HttpsError('invalid-argument', '올바른 이메일 형식이 아닙니다.');
    }
    if (!content || typeof content !== 'string' || !content.trim() || content.length > 1000) {
      throw new HttpsError('invalid-argument', '문의 내용이 올바르지 않습니다.');
    }

    await assertUnderSupportEmailLimit(request.auth.uid);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: SUPPORT_EMAIL, pass: GMAIL_APP_PASSWORD.value() },
    });

    try {
      await transporter.sendMail({
        from: `킨더케어 고객센터 <${SUPPORT_EMAIL}>`,
        to: SUPPORT_EMAIL,
        replyTo: replyEmail,
        subject: '[킨더케어] 고객센터 문의',
        text: `답변받을 이메일: ${replyEmail}\n\n${content.trim()}`,
      });
    } catch (err) {
      logger.error('Support email send failed', err);
      throw new HttpsError('internal', '메일 전송에 실패했어요. 잠시 후 다시 시도해주세요.');
    }

    return { success: true };
  }
);
