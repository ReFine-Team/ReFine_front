import { CommentScraper } from '../services/commentScraper.js';
import { analyzeComment } from '../services/api.js';

class ContentScript {
  constructor() {
    this.commentScraper = CommentScraper.getInstance();

    this.commentQueue = [];
    this.batchTimer = null;
    this.isProcessing = false;

    this.injectGlobalStyles();

    this.commentScraper.setOnCommentFound((comment) => this.addCommentToQueue(comment));

    this.setupMessageListener();
    this.init();
  }

  injectGlobalStyles() {
    // 기존에 추가된 스타일이 있으면 중복 방지
    if (document.getElementById('know-comment-ai-styles')) return;

    const link = document.createElement('link');
    link.id = 'know-comment-ai-styles';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    // content.css 파일을 로드
    link.href = chrome.runtime.getURL('content.css');
    document.head.appendChild(link);
    console.log('KnowCommentAI: 외부 CSS 파일 로드 완료');
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
    if (!commentBox || commentBox.dataset.knowCommentProcessed) return;

    commentBox.dataset.knowCommentProcessed = 'true';
    this.commentQueue.push(comment);
    clearTimeout(this.batchTimer);
    this.batchTimer = setTimeout(() => this.startBatchProcessing(), 500);
  }

  startBatchProcessing() {
    if (this.isProcessing) {
      console.log('이미 다른 묶음을 처리 중입니다. 잠시 대기합니다.');
      return;
    }
    this.processBatches();
  }

  async processBatches() {
    this.isProcessing = true;

    if (this.commentQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    const chunk = this.commentQueue.splice(0, 5);

    chunk.forEach(comment => {
      const textElement = comment.element.querySelector('#content-text, .u_cbox_contents, ._a9zr span._ap3a[dir="auto"]');
      if (textElement) {
        comment.textElement = textElement;
        const loadingElement = document.createElement('div');
        loadingElement.className = 'know-comment-ai-loading';
        loadingElement.textContent = '댓글 분석 중... 🤖';
        textElement.parentNode.insertBefore(loadingElement, textElement);
        comment.loadingElement = loadingElement;
      }
    });

    console.log(`📤 ${chunk.length}개 묶음을 병렬로 API에 전송합니다.`);
    const promises = chunk.map(comment => analyzeComment(comment));
    const apiResults = await Promise.all(promises);

    console.log(`📥 ${chunk.length}개 묶음의 응답을 모두 수신했습니다.`);

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
        if (hostname.includes('youtube.com') || hostname.includes('naver.com')) {
          purifiedContainer.style.fontSize = '14px';
          this.createToggleSwitch(originalComment, purifiedContainer, hostname);
        } else if (hostname.includes('instagram.com')) {
          this.createInstagramToggleButton(textElement, purifiedContainer);
        }

        textElement.parentNode.insertBefore(purifiedContainer, textElement);
      } else {
        textElement.style.setProperty('display', 'inline', 'important');
      }
    });

    this.isProcessing = false;
    if (this.commentQueue.length > 0) this.startBatchProcessing();
  }

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
        e.preventDefault();
        e.stopPropagation();
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
      } else {
        const replyButton = actionsContainer.querySelector('yt-button-shape a');
        if (replyButton) {
          replyButton.parentNode.insertBefore(switchDiv, replyButton);
        } else {
          actionsContainer.appendChild(switchDiv);
        }
      }
    }
  }

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

      const moreButtonDiv = actionsSpan.querySelector('div._a9ze');
      if (moreButtonDiv) {
        moreButtonDiv.style.marginLeft = 'auto';
      }
    }
  }
}

new ContentScript();
