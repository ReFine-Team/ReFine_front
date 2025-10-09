import { API_BASEURL } from '../apikey.js';

// API 요청
export async function analyzeComment(comment) {
  const API_ENDPOINT = `${API_BASEURL}/purification/v1.1`;

  const requestBody = [{
    comment_id: comment.id,
    text: comment.text
  }];

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API 에러 응답:', errorData);
      throw new Error(`API 요청 실패: ${response.status}`);
    }

    const successData = await response.json();
    
    // 응답 배열의 첫 번째 결과 출력
    return successData[0]; 

  } catch (error) {
    console.error('API 통신 중 오류 발생:', error);
    return null;
  }
}