const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const body = request.data?.body;
    if (!body || typeof body !== 'object') {
      throw new HttpsError('invalid-argument', '요청 본문이 올바르지 않습니다.');
    }

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
