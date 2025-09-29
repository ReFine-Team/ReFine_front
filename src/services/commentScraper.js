// 댓글 선택자들 - 실제 댓글 텍스트만
const COMMENT_SELECTORS = [

  // Youtube
  'ytd-comment-thread-renderer #content-text',
  'ytd-comment-replies-renderer #content-text',
  'ytd-comment-renderer #content-text',

  // Naver News
  '.u_cbox_contents',
  '.u_cbox_comment_box',
  '.u_cbox_type_profile',
  '.u_cbox_reply_contents',
  '.reply-text',
  '.reply-content',

  // Instagram
  'ul li div span._ap3a',            // 기본 댓글 구조
  'ul li div span:not([class])',     // class 없는 경우
  'span._ap3a[dir="auto"]',          // 댓글 본문 (주요)
];

export class CommentScraper {
  constructor() {
    this.comments = [];
    this.processedElements = new Set();
    this.initObservers();
  }

  // DOM 변화 감지
  initObservers() {
    const observer = new MutationObserver(() => {
      this.scrapeComments();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 인스타그램 모달 열리면 관찰
    const observeInstagramModal = () => {
      const modal = document.querySelector('div[role="dialog"]');
      if (modal && !modal.dataset.observed) {
        observer.observe(modal, { childList: true, subtree: true });
        modal.dataset.observed = 'true';
      }
    };

    setInterval(observeInstagramModal, 500);
  }

  static getInstance() {
    if (!CommentScraper.instance) {
      CommentScraper.instance = new CommentScraper();
    }
    return CommentScraper.instance;
  }

  async scrapeComments() {
    const previousCount = this.comments.length;

    for (const selector of COMMENT_SELECTORS) {
      const elements = document.querySelectorAll(selector);

      elements.forEach((element) => {
        // subscribe_wrap 내부이면 제외
        if (element.closest('.subscribe_wrap')) return;

        if (this.processedElements.has(element)) return;

        if (this.isValidCommentElement(element)) {
          const comment = this.createCommentFromElement(element);
          if (comment && !this.isDuplicate(comment) && this.isValidComment(comment)) {
            this.comments.push(comment);
            this.processedElements.add(element);

            // 댓글 전체 컨테이너에 파란색 표시 적용
            let container = element;
            for (let i = 0; i < 3; i++) {
              if (
                container.parentElement &&
                container.parentElement.textContent?.includes(element.textContent)
              ) {
                container = container.parentElement;
              } else {
                break;
              }
            }
            container.style.outline = '2px solid #007BFF';
            container.style.outlineOffset = '2px';
            comment.element = container;

            // 콘솔에 댓글 객체 그대로 출력
            console.log(comment);
          }
        }
      });
    }

    return this.comments;
  }

  createCommentFromElement(element) {
    let text = element.textContent?.trim();
    if (!text) return null;

    text = text.replace(/\s*(댓글|comment|답글|reply)\s*\d*$/i, '').trim();
    if (!text) return null;

    return {
      id: this.generateStableId(element),
      text,
      element,
      isReply: this.isReplyComment(element),
    };
  }

  isReplyComment(element) {
    if (
      element.closest('ytd-comment-replies-renderer') ||
      element.closest('ytd-comment-replies')
    ) return true;

    if (
      element.classList?.contains('u_cbox_reply_contents') ||
      element.classList?.contains('reply-content')
    ) return true;

    return false;
  }

  generateStableId(element) {
    const tagName = element.tagName;
    const textHash = this.simpleHash(element.textContent?.trim() || '');
    const parentId = element.closest('[id]')?.id || 'no-parent';
    return `${tagName.toLowerCase()}-${textHash}-${parentId}`;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  isValidComment(comment) {
    const text = comment.text;
    if (!text || text.trim().length < 1) return false;

    // 공백만 있는 댓글 제외
    if (/^\s+$/.test(text)) return false;

    // 이모지 정규식
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u;

    // 텍스트에 이모지가 하나라도 포함되어 있는지 확인
    const hasEmoji = emojiRegex.test(text);
    
    // 이모지만 있는 댓글
    const emojiOnlyRegex = new RegExp(`^(${emojiRegex.source})+$`, 'u');
    if (emojiOnlyRegex.test(text.trim())) {
      return true;
    }

    // 텍스트와 이모지가 섞여 있거나, 텍스트만 있는 경우도 유효
    return text.trim().length > 0;
  }

  // 댓글 DOM 요소가 실제 댓글인지 확인 (광고, 구독 UI 등 제외)
  isValidCommentElement(element) {
    if (!element || !(element instanceof HTMLElement)) return false;

    // 제외할 클래스 목록
    const excludeClasses = ['subscribe_wrap'];

    for (const cls of excludeClasses) {
      if (element.classList.contains(cls)) return false;
    }

    // 텍스트 없는 경우 제외
    if (!element.textContent || !element.textContent.trim()) return false;

    return true;
  }

  isDuplicate(comment) {
    return this.comments.some(
      (existing) =>
        existing.id === comment.id ||
        existing.element === comment.element ||
        existing.text === comment.text
    );
  }

  updateComment(commentId, updates) {
    const index = this.comments.findIndex((c) => c.id === commentId);
    if (index !== -1) {
      this.comments[index] = { ...this.comments[index], ...updates };
    }
  }

  getComments() {
    return [...this.comments];
  }

  clearComments() {
    this.comments = [];
    this.processedElements.clear();
  }
}
