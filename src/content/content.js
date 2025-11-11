import { CommentScraper } from '../services/commentScraper.js';
import { analyzeComment } from '../services/api.js';

class ContentScript {
  constructor() {
    this.commentScraper = CommentScraper.getInstance();
    this.commentQueue = [];
    this.batchTimer = null;
    this.isProcessing = false;
    this.buttonObserver = null; // 버튼 삽입을 위한 별도의 Observer

    this.injectGlobalStyles();
    this.commentScraper.setOnCommentFound((comment) => this.addCommentToQueue(comment));
    this.setupMessageListener();
    this.init();

    window.addEventListener('beforeunload', () => this.cleanup());
  }

  cleanup() {
    console.log('KnowCommentAI: 페이지를 떠나기 전 정리 작업 수행');
    // MutationObserver 연결 해제
    if (this.buttonObserver) {
      this.buttonObserver.disconnect();
      this.buttonObserver = null;
    }
  }

  injectGlobalStyles() {
    if (document.getElementById('know-comment-ai-styles')) return;
    const link = document.createElement('link');
    link.id = 'know-comment-ai-styles';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('content.css');
    document.head.appendChild(link);
    console.log('KnowCommentAI: 외부 CSS 파일 로드 완료');
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'URL_CHANGED') {
        this.cleanup();
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

    this.observeForButtons();
  }

  // 페이지 변화를 감지하여 버튼을 삽입하는 새로운 메서드 
  observeForButtons() {
    // 기존 Observer가 있다면 중복 실행 방지
    if (this.buttonObserver) this.buttonObserver.disconnect();

    this.buttonObserver = new MutationObserver((mutations) => {
      // DOM에 변화가 있을 때마다 버튼 주입을 시도
      this.injectInfoButton();
    });

    this.buttonObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 각 사이트의 특정 위치에 '왜 순화됐나요?' 버튼 주입
  injectInfoButton() {
    // 컨텍스트가 유효하지 않으면 즉시 중단
    if (!chrome.runtime || !chrome.runtime.id) {
        this.cleanup();
        return;
    }
    const landingPageUrl = chrome.runtime.getURL('landing.html');

    // YouTube
    const ytAnchor = document.querySelector('#sort-menu');
    if (ytAnchor && !ytAnchor.querySelector('.refine-info-button')) {
      const button = document.createElement('button');
      button.textContent = '왜 순화됐나요?';
      button.className = 'refine-info-button youtube';
      button.onclick = () => window.open(landingPageUrl, '_blank');
      ytAnchor.appendChild(button);
      console.log(`✅ Re:Fine: YouTube에 버튼을 추가했습니다.`);
    }

    // Naver News
    const naverList = document.querySelector('ul.u_cbox_sort_option_list');
    if (naverList && !naverList.querySelector('.refine-info-button')) {
      const listItem = document.createElement('li');
      const button = document.createElement('button');
      button.textContent = '왜 순화됐나요?';
      button.className = 'refine-info-button naver';
      button.onclick = () => window.open(landingPageUrl + '#reasons', '_blank');
      listItem.appendChild(button);
      naverList.appendChild(listItem);
      console.log(`✅ Re:Fine: Naver 뉴스에 버튼을 추가했습니다.`);
    }

    // Instagram
    // 아직 처리되지 않은 모든 게시물 컨테이너 찾기
    const instaPostContainers = document.querySelectorAll('div._aasi:not([data-refine-processed])');
    
    instaPostContainers.forEach(container => {
        // 중복 추가를 막기 위해 즉시 처리되었음을 표시
        container.setAttribute('data-refine-processed', 'true');

        // 컨테이너 안에서 '옵션'이라는 라벨을 가진 '...' 버튼(_aasm) 찾기
        const optionsButtonDiv = container.querySelector('div._aasm');

        if (optionsButtonDiv) {
            const button = document.createElement('button');
            button.textContent = '왜 순화됐나요?';
            button.className = 'refine-info-button instagram';
            button.onclick = (e) => {
                e.stopPropagation(); // '...' 메뉴가 열리는 것을 방지
                window.open(landingPageUrl, '_blank');
            };
            
            // '...' 버튼(_aasm) 바로 앞에 우리 버튼을 삽입
            optionsButtonDiv.parentElement.insertBefore(button, optionsButtonDiv);
            console.log(`✅ Re:Fine: Instagram 게시물 헤더에 버튼을 추가했습니다.`);
        }
    });
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
    if (this.isProcessing) return;
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
    const textElement = comment.element.querySelector('#content-text, .u_cbox_contents, span._ap3a[dir="auto"]');
    if (textElement) {
      comment.textElement = textElement;
      const loadingElement = document.createElement('div');
      loadingElement.className = 'know-comment-ai-loading';
      loadingElement.textContent = '댓글 분석 중… 🤖';
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
      
      // 원본 텍스트와 순화된 텍스트 가져옴
      const originalText = originalComment.text;
      const purifiedText = result.purified_text;

      // 모든 공백을 제거한 텍스트를 만듦.
      const originalNormalized = originalText.replace(/\s+/g, '');
      const purifiedNormalized = purifiedText.replace(/\s+/g, '');

      // 과도한 잘림 검증 - 길이 비율이 50% 미만인 경우 원본 유지
      const lenRatio = purifiedText.length / originalText.length;
      if (originalText.length > 5 && lenRatio < 0.7) {
        console.warn(`⚠️ 순화 실패 (과도한 잘림 감지, ${Math.round(lenRatio * 100)}%) → 원본 유지`, {
          원본: originalText,
          순화본: purifiedText
        });
        textElement.style.setProperty('display', 'inline', 'important');
        return;
      }

      // 두 텍스트가 완전히 같거나, 공백만 다른지 비교
      if (originalText === purifiedText || originalNormalized === purifiedNormalized) {
        
        // 순화가 불필요한 경우: 콘솔에 경고를 띄우고 원본을 표시
        console.warn('순화 실패 (결과 동일 또는 띄어쓰기만 변경):', originalText);
        textElement.style.setProperty('display', 'inline', 'important');

      } else {
        
        // 순화가 필요한 경우에만 UI 생성
        const purifiedContainer = document.createElement('span');
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
      }

    } else {
      // 'not_malicious' 상태일 때: 원본을 표시
      textElement.style.setProperty('display', 'inline', 'important');
    }
  });

  this.isProcessing = false;
  if (this.commentQueue.length > 0) {
    this.startBatchProcessing();
  } else {
    console.log('✅ 모든 묶음 처리가 완료되었습니다.');
  }
}

  createToggleSwitch(originalComment, purifiedContainer, hostname) {
    const textElement = originalComment.textElement;
    const actionsContainer = hostname.includes('youtube.com') ? originalComment.element.querySelector('#toolbar') : originalComment.element.querySelector('.u_cbox_tool');
    if (actionsContainer && !actionsContainer.querySelector('.toggle-switch')) {
      const switchDiv = document.createElement('div');
      switchDiv.className = 'toggle-switch active';
      const label = document.createElement('span');
      label.className = 'toggle-label-inside';
      label.textContent = '원본';

      const circle = document.createElement('span');
      circle.className = 'toggle-circle';
      switchDiv.appendChild(label);
      switchDiv.appendChild(circle);
      let isPurified = true;
      switchDiv.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        isPurified = !isPurified;
        switchDiv.classList.toggle('active', isPurified);
        label.textContent = isPurified ? '원본' : '순화';
        purifiedContainer.style.display = isPurified ? '' : 'none';
        textElement.style.setProperty('display', isPurified ? 'none' : 'inline', 'important');
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
          // 순화 결과 출력 중일 때, 원본을 확실하게 숨김
          textElement.style.setProperty('display', 'none', 'important');
        } else { 
          // 원본 버튼 눌렀을 때, 원본을 !important로 확실하게 보여줌
          textElement.style.setProperty('display', 'inline', 'important');
        }
      };
      let replyButton = null;
      const allButtons = actionsSpan.querySelectorAll('button, div[role="button"]');
      for (const btn of allButtons) {
        if (btn.textContent === '답글 달기') {
          replyButton = btn; break;
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