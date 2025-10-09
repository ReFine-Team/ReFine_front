import { CommentScraper } from '../services/commentScraper.js';
import { analyzeComment } from '../services/api.js';

class ContentScript {
  constructor() {
    this.commentScraper = CommentScraper.getInstance();

    this.commentQueue = []; // 댓글 대기열 생성
    this.batchTimer = null; // 댓글 타이머 생성
    this.isProcessing = false;

    this.commentScraper.setOnCommentFound((comment) => this.addCommentToQueue(comment));

    this.setupMessageListener();
    this.init();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'URL_CHANGED') {
        console.clear();
        this.commentScraper.clearComments();
        this.isProcessing = false; // 깃발 초기화
        console.log('URL 변경 감지: 데이터 초기화 완료.');
        this.init();
      }
      return true;
    });
  }

  init() {
    console.log('KnowCommentAI Content Script 초기화 완료.');
    setTimeout(() => {
      console.log('초기 댓글 탐색 시작');
      this.commentScraper.scrapeComments();
    }, 1000);
  }

  addCommentToQueue(comment) {
    if (comment.element.dataset.apiQueued === 'true') return;
    comment.element.dataset.apiQueued = 'true';

    const textElement = comment.element.querySelector('#content-text, .u_cbox_contents, span._ap3a[dir="auto"]');

    if (textElement) {
      // 로딩 UI 생성
      const loadingElement = document.createElement('div');
      loadingElement.className = 'know-comment-ai-loading';
      loadingElement.textContent = '댓글 분석 중... 🤖';
    
    textElement.style.display = 'none';
    textElement.parentNode.insertBefore(loadingElement, textElement.nextSibling);

    // 로딩 UI 제거, 원본 댓글 comment 객체에 저장
    comment.textElement = textElement;
    comment.loadingElement = loadingElement;
  }

  this.commentQueue.push(comment);
  
  clearTimeout(this.batchTimer);

  this.batchTimer = setTimeout(() => {
    this.startBatchProcessing();
  }, 500);
}

// API 비어있을 때만 실행
startBatchProcessing() {
  if (this.isProcessing) {
    console.log('이미 다른 묶음을 처리 중입니다. 잠시 대기합니다.');
    return;
  }
  this.processBatches();
}
  
// 원본 댓글 5개씩 병렬 처리
async processBatches() {
  this.isProcessing = true;

  // 탐지된 댓글이 없을 때까지 반복
  while (this.commentQueue.length > 0) {
    const chunk = this.commentQueue.splice(0, 5); // 앞에서부터 5개씩 꺼냄
    console.log(`📤 ${chunk.length}개 묶음을 병렬로 API에 전송합니다.`);

    // api 병렬 처리
    const promises = chunk.map(comment => analyzeComment(comment));
    const apiResults = await Promise.all(promises);

    console.log(`📥 ${chunk.length}개 묶음의 응답을 모두 수신했습니다.`);

    // 5개의 결과에 대해 UI 업데이트
    apiResults.forEach((result, index) => {
      const originalComment = chunk[index];
      if (originalComment.loadingElement) originalComment.loadingElement.remove();

      if (result && result.status === 'purified') {
        const purifiedElement = document.createElement('div');
        purifiedElement.className = 'know-comment-ai-purified';
        purifiedElement.style.fontSize = '14px'
        purifiedElement.innerHTML = `<span style="font-size: 12px; color: #6694FF;">[순화된 댓글입니다]</span><br>${result.purified_text}`;
        originalComment.textElement.parentNode.insertBefore(purifiedElement, originalComment.textElement.nextSibling);
      } else {
        if(originalComment.textElement) originalComment.textElement.style.display = '';
      }
    });
  }

  this.isProcessing = false;
  console.log('✅ 모든 묶음 처리가 완료되었습니다.');
}
}

new ContentScript();