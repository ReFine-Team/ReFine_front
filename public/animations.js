document.addEventListener("DOMContentLoaded", () => {
    const animatedElements = document.querySelectorAll(
        '.reasons-section h2, .reasons-intro, .reason-card, .indicator-card, .feature-card'
    );

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // 텍스트 요소들(h2, p)은 한 번만 애니메이션되도록 감시 중지
                if (entry.target.tagName === 'H2' || entry.target.tagName === 'P') {
                    observer.unobserve(entry.target);
                }
            } else {
                // 👇 카드는 반복 애니메이션을 위해 클래스 제거 로직에 .feature-card 추가
                if (entry.target.classList.contains('reason-card') || 
                    entry.target.classList.contains('indicator-card') || 
                    entry.target.classList.contains('feature-card')) {
                    entry.target.classList.remove('is-visible');
                }
            }
        });
    }, {
        threshold: 0.5 // 요소가 50% 정도 보였을 때 애니메이션 시작
    });

    animatedElements.forEach(element => {
        observer.observe(element);
    });

    // 슬라이드쇼 로직
    const slideshowContainer = document.querySelector('.slideshow-container');
    
    // 슬라이드쇼 컨테이너가 페이지에 존재할 때만 실행
    if (slideshowContainer) {
        const slides = slideshowContainer.querySelectorAll('.slide');
        let currentSlideIndex = 0;
        const slideInterval = 2000; // 이미지가 바뀌는 시간 (2000ms = 2초)

        if (slides.length > 0) {
            // 첫 번째 슬라이드는 바로 보이도록 설정
            slides[currentSlideIndex].classList.add('is-visible');

            setInterval(() => {
                // 현재 슬라이드는 숨김
                slides[currentSlideIndex].classList.remove('is-visible');
                
                // 다음 슬라이드 인덱스 계산 (마지막 슬라이드면 처음으로 돌아감)
                currentSlideIndex = (currentSlideIndex + 1) % slides.length;
                
                // 다음 슬라이드를 보이게 함
                slides[currentSlideIndex].classList.add('is-visible');
            }, slideInterval);
        }
    }
});