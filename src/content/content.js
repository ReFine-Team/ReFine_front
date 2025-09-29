import { CommentScraper } from '../services/commentScraper.js';

class ContentScript {
  constructor() {
    this.commentScraper = CommentScraper.getInstance();
    this.isProcessing = false;
    this.setupMessageListener();
    this.init();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

      console.log("★★★ content.js: background로부터 메시지 수신 성공!", message);

      if (message.type === 'URL_CHANGED') {
        console.clear();
        this.commentScraper.clearComments();
        console.log('URL 변경 감지: 콘솔 및 댓글 데이터 초기화 완료.');
        this.startScraping();
      }
      return true;
    });
  }

  init() {
    console.log('KnowCommentAI Content Script 초기화 - 댓글 스크래핑 시작');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.startScraping());
    } else {
      this.startScraping();
    }

    window.addEventListener('scroll', this.throttle(() => {
      this.scrapeNewComments();
    }, 2000));

    this.observeDOMChanges();
  }

  async startScraping() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('새로운 페이지에서 댓글 스크래핑을 시작합니다.');

    try {
      await this.scrapeNewComments();
    } catch (error) {
      console.error('댓글 스크래핑 중 오류:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async scrapeNewComments() {
    try {
      const allComments = this.commentScraper.getComments();
      const newComments = await this.commentScraper.scrapeComments(); // 새로운 댓글 스크래핑
      
      const newCommentsCount = newComments.length - allComments.length;

      if (newCommentsCount > 0) {
         // 새로 추가된 댓글만 로그로 출력
        const newlyAdded = newComments.slice(allComments.length);
        newlyAdded.forEach((comment) => {
           console.log('새 댓글:', comment);
        });

        console.log(`총 댓글 ${newComments.length}개, 최근 ${newCommentsCount}개 추가`);
      }
      
    } catch (error) {
      console.error('새 댓글 스크래핑 중 오류:', error);
    }
  }

  observeDOMChanges() {
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (this.isCommentElement(node)) {
                shouldProcess = true;
              }
            }
          });
        }
      });
      if (shouldProcess) {
        setTimeout(() => this.scrapeNewComments(), 1000);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  isCommentElement(element) {
    const commentSelectors = [
      '[class*="comment"]', '[class*="reply"]', '[id*="comment"]'
    ];
    return commentSelectors.some(selector => 
      element.matches(selector) || element.querySelector(selector)
    );
  }

  throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    return function (...args) {
      const currentTime = Date.now();
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }
}

new ContentScript();