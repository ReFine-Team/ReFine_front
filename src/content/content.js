import { CommentScraper } from '../services/commentScraper.js';
import { analyzeComment } from '../services/api.js';

class ContentScript {
  constructor() {
    this.commentScraper = CommentScraper.getInstance();

    this.commentQueue = []; // 댓글 대기열 생성
    this.batchTimer = null; // 댓글 타이머 생성
    this.isProcessing = false;
    this.injectGlobalStyles();

    this.commentScraper.setOnCommentFound((comment) => this.addCommentToQueue(comment));

    this.setupMessageListener();
    this.init();
  }

  injectGlobalStyles() {
    if (document.getElementById('know-comment-ai-styles')) return;

    const style = document.createElement('style');
    style.id = 'know-comment-ai-styles';
    style.innerHTML = `
    /* 각 사이트별 댓글 텍스트 영역을 미리 숨깁니다 */
    #content-text, /* 유튜브 */
    .u_cbox_contents, /* 네이버 뉴스 (이 부분을 추가) */
    span._ap3a[dir="auto"] /* 인스타그램 */ {
      display: none !important;
    }

    .know-comment-ai-loading { 
      color: #888; 
      font-style: italic; 
      font-size: 14px; 
    }
    /* 신규 토글 스위치 스타일 */
      .toggle-switch {
        display: inline-flex;
        align-items: center;
        width: 50px;
        height: 22px;
        background-color: #ccc;
        border-radius: 11px;
        padding: 2px;
        box-sizing: border-box;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        margin-left: 12px;
        vertical-align: middle;
        user-select: none;
      }
      .toggle-switch.active {
        background-color: #BFD2FF; /* 활성 상태 색상 */
        flex-direction: row-reverse; /* 내부 아이템 순서 뒤집기 */
      }
      .toggle-label-inside {
        font-size: 11px;
        color: white;
        text-align: center;
        flex-grow: 1; /* 남는 공간 채우기 */
        user-select: none;
        font-weight: normal;
      }
      .toggle-circle {
        width: 18px;
        height: 18px;
        background-color: white;
        border-radius: 50%;
        flex-shrink: 0; /* 원 크기 유지 */
        transition: transform 0.2s ease-in-out;
      }
    `;
    document.head.appendChild(style);
    console.log('KnowCommentAI: 스타일 규칙 추가');
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'URL_CHANGED') {
        console.clear();
        this.commentScraper.clearComments();
        this.commentQueue = [];
        this.isProcessing = false;
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
const commentBox = comment.element.closest('.u_cbox_comment_box, ._a9zr, #main');
    if (!commentBox || commentBox.dataset.knowCommentProcessed)return;

    commentBox.dataset.knowCommentProcessed = 'true';
    this.commentQueue.push(comment);
    clearTimeout(this.batchTimer);
    this.batchTimer = setTimeout(() => this.startBatchProcessing(), 500);
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

  if (this.commentQueue.length === 0) {
    this.isProcessing = false;
    return;
  }

    // 탐지된 댓글이 없을 때까지 반복
    const chunk = this.commentQueue.splice(0, 5);

    // 로딩 UI 표시
    chunk.forEach(comment => {
      const textElement = comment.element.querySelector('#content-text, .u_cbox_contents, span._ap3a[dir="auto"]');
      if (textElement) {
        comment.textElement = textElement;
        const loadingElement = document.createElement('div');
        loadingElement.className = 'know-comment-ai-loading';
        loadingElement.textContent = '댓글 분석 중... 🤖';
        
        // CSS로 숨겨진 textElement 옆에 loadingElement를 삽입
        textElement.parentNode.insertBefore(loadingElement, textElement);
        comment.loadingElement = loadingElement;
      }
    });

    console.log(`📤 ${chunk.length}개 묶음을 병렬로 API에 전송합니다.`);
    const promises = chunk.map(comment => analyzeComment(comment));
    const apiResults = await Promise.all(promises);

    console.log(`📥 ${chunk.length}개 묶음의 응답을 모두 수신했습니다.`);
    
    // 5개의 결과에 대해 UI 업데이트
    apiResults.forEach((result, index) => {
      const originalComment = chunk[index];
      if (originalComment.loadingElement) originalComment.loadingElement.remove();
      if (!originalComment.textElement) return;

      const textElement = originalComment.textElement;

      if (result && result.status === 'purified') {
        const purifiedContainer = document.createElement('div');
        purifiedContainer.className = 'know-comment-ai-purified-container';
        purifiedContainer.innerHTML = `<span style="font-size: 12px; color: #6694FF;">[순화된 댓글입니다]</span><br>${result.purified_text}`;

        const hostname = window.location.hostname;
        // 웹 페이지별 버튼 추가
        if (hostname.includes('youtube.com') || hostname.includes('naver.com')) {
            purifiedContainer.style.fontSize = '14px';
            this.createToggleSwitch(originalComment, purifiedContainer, hostname);
          } else if (hostname.includes('instagram.com')) {
            // 인스타그램 버튼 호출
            this.createInstagramToggleButton(textElement, purifiedContainer);
          }
          
          // 완성된 결과물을 화면에 딱 한 번만 삽입합니다.
          textElement.parentNode.insertBefore(purifiedContainer, textElement);

        } else {
          textElement.style.setProperty('display', 'inline', 'important');
        }
      });

    this.isProcessing = false;
      if (this.commentQueue.length > 0) this.startBatchProcessing();
    }

// 유튜브/네이버 뉴스 토글 스위치 생성
createToggleSwitch(originalComment, purifiedContainer, hostname) {
  const textElement = originalComment.textElement;

  const actionsContainer = hostname.includes('youtube.com')
    ? originalComment.element.querySelector('#toolbar')
    : originalComment.element.querySelector('.u_cbox_tool');

  if (actionsContainer && !actionsContainer.querySelector('.toggle-switch')) {
    const switchDiv = document.createElement('div');
    switchDiv.className = 'toggle-switch active';

    const label = document.createElement('span');
    label.className = 'toggle-label-inside';
    label.textContent = '순화';
    
    const circle = document.createElement('span');
    circle.className = 'toggle-circle';

    switchDiv.appendChild(label);
    switchDiv.appendChild(circle);
    
    let isPurified = true;
    switchDiv.onclick = (e) => {
      e.preventDefault();  // 링크의 기본 동작(페이지 이동) 제어
      e.stopPropagation(); // 이벤트 버블링 방지
      isPurified = !isPurified;
      switchDiv.classList.toggle('active', isPurified);
      label.textContent = isPurified ? '순화' : '원본';
      purifiedContainer.style.display = isPurified ? '' : 'none';
      
      if (isPurified) {
        textElement.style.setProperty('display', 'none', 'important');
      } else {
        textElement.style.setProperty('display', 'inline', 'important');
      }
    };

    if (hostname.includes('naver.com')) {
      const replyCountSpan = actionsContainer.querySelector('.u_cbox_reply_cnt');

      if (replyCountSpan) {
        replyCountSpan.parentNode.insertBefore(switchDiv, replyCountSpan.nextSibling);
      } else {
        actionsContainer.appendChild(switchDiv);
      }
    } else { // 유튜브
      const replyButton = actionsContainer.querySelector('yt-button-shape a');
      if (replyButton) {
        replyButton.parentNode.insertBefore(switchDiv, replyButton);
      } else {
        actionsContainer.appendChild(switchDiv);
      }
    }
  }
}

// 인스타그램 버튼 생성
createInstagramToggleButton(textElement, purifiedContainer) {
  const actionsSpan = textElement.closest('._a9zr')?.querySelector('span[class*="x1lliihq"]');

  if (actionsSpan && !actionsSpan.querySelector('.know-comment-ai-toggle-btn')) {
    const toggleButton = document.createElement('button');
    toggleButton.textContent = '원본';
    toggleButton.className = 'know-comment-ai-toggle-btn';
    Object.assign(toggleButton.style, {
      border: 'none', background: 'none', color: '#A8A8A8',
      fontSize: '12px', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer', padding: '0',
      marginLeft: '3px', marginRight: '3px', lineHeight: 'inherit'
    });

      let isPurified = true;
      toggleButton.onclick = () => {
        isPurified = !isPurified;
        purifiedContainer.style.display = isPurified ? '' : 'none';
        toggleButton.textContent = isPurified ? '원본' : '순화';

        if (isPurified) {
          textElement.style.setProperty('display', 'none', 'important');
        } else { 
          textElement.style.setProperty('display', 'inline', 'important');
        }
      };
      
      // 위치 조정을 위해 답글 달기 버튼 찾기
      let replyButton = null;
      const allButtons = actionsSpan.querySelectorAll('button, div[role="button"]');
      for (const btn of allButtons) {
        if (btn.textContent === '답글 달기') {
          replyButton = btn;
          break;
        }
      }

      if (replyButton) {
        replyButton.insertAdjacentElement('afterend', toggleButton);
      } else {
        actionsSpan.appendChild(toggleButton);
      }

      // 더보기 버튼을 원본 버튼 뒤에 삽입 
      const moreButtonDiv = actionsSpan.querySelector('div._a9ze');
      if (moreButtonDiv) {
        moreButtonDiv.style.marginLeft = 'auto';
      }
    }
  }
}

new ContentScript();