document.addEventListener("DOMContentLoaded", () => {
    const animatedElements = document.querySelectorAll(
        '.reasons-section h2, .reasons-intro, .reason-card'
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
                // 카드는 반복 애니메이션을 위해 클래스 제거
                if (entry.target.classList.contains('reason-card')) {
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
});