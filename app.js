document.addEventListener('DOMContentLoaded', () => {
    // Hero slider rotation
    const heroSlides = document.querySelectorAll('.hero-slide');
    let currentHeroSlide = 0;

    if (heroSlides.length > 1) {
        setInterval(() => {
            heroSlides[currentHeroSlide].classList.remove('active');
            currentHeroSlide = (currentHeroSlide + 1) % heroSlides.length;
            heroSlides[currentHeroSlide].classList.add('active');
        }, 5000);
    }

    const initTeamCarousel = (teamCarousel) => {
        if (!teamCarousel || teamCarousel.dataset.teamReady === 'true') {
            return;
        }

        const track = teamCarousel.querySelector('.team-carousel-track');
        const slides = Array.from(teamCarousel.querySelectorAll('.team-slide'));
        const dotsWrap = teamCarousel.querySelector('.team-dots');
        const dots = Array.from(teamCarousel.querySelectorAll('.team-dot'));
        const prevButton = teamCarousel.querySelector('[data-team-prev]');
        const nextButton = teamCarousel.querySelector('[data-team-next]');

        if (!track || slides.length === 0) {
            return;
        }

        teamCarousel.dataset.teamReady = 'true';

        let currentTeamSlide = 0;
        let autoplayId = null;
        const slideOffset = 100 / slides.length;

        track.style.width = `${slides.length * 100}%`;
        slides.forEach((slide) => {
            slide.style.flex = `0 0 ${slideOffset}%`;
            slide.style.maxWidth = `${slideOffset}%`;
        });

        const updateTeamCarousel = (index) => {
            currentTeamSlide = (index + slides.length) % slides.length;
            track.style.transform = `translateX(-${currentTeamSlide * slideOffset}%)`;

            slides.forEach((slide, slideIndex) => {
                slide.setAttribute('aria-hidden', String(slideIndex !== currentTeamSlide));
            });

            dots.forEach((dot, dotIndex) => {
                dot.classList.toggle('active', dotIndex === currentTeamSlide);
            });
        };

        const stopAutoplay = () => {
            if (autoplayId) {
                clearInterval(autoplayId);
                autoplayId = null;
            }
        };

        const startAutoplay = () => {
            if (slides.length <= 1) {
                return;
            }

            stopAutoplay();
            autoplayId = setInterval(() => {
                updateTeamCarousel(currentTeamSlide + 1);
            }, 5500);
        };

        if (slides.length <= 1) {
            if (prevButton) prevButton.hidden = true;
            if (nextButton) nextButton.hidden = true;
            if (dotsWrap) dotsWrap.hidden = true;
            updateTeamCarousel(0);
            return;
        }

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                updateTeamCarousel(currentTeamSlide - 1);
                startAutoplay();
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                updateTeamCarousel(currentTeamSlide + 1);
                startAutoplay();
            });
        }

        dots.forEach((dot, dotIndex) => {
            dot.addEventListener('click', () => {
                updateTeamCarousel(dotIndex);
                startAutoplay();
            });
        });

        teamCarousel.addEventListener('mouseenter', stopAutoplay);
        teamCarousel.addEventListener('mouseleave', startAutoplay);
        teamCarousel.addEventListener('focusin', stopAutoplay);
        teamCarousel.addEventListener('focusout', startAutoplay);

        updateTeamCarousel(0);
        startAutoplay();
    };

    document.querySelectorAll('[data-team-carousel]').forEach(initTeamCarousel);

    // --- High-Resolution GSAP Animations ---
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        // Smooth fade up for section titles
        gsap.utils.toArray('.section-title').forEach(title => {
            gsap.fromTo(title, 
                { opacity: 0, y: 50 },
                {
                    opacity: 1, 
                    y: 0,
                    duration: 1.2,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: title,
                        start: "top 85%",
                        toggleActions: "play none none reverse"
                    }
                }
            );
        });

        // Parallax image scaling and fade for service modules
        gsap.utils.toArray('.bento-card').forEach(module => {
            const photo = module.querySelector('.bento-img-wrap img');
            const content = module.querySelector('.bento-content');

            // Image Parallax zoom effect
            if (photo) {
                gsap.fromTo(photo,
                    { scale: 1.2, filter: "blur(5px)" },
                    {
                        scale: 1,
                        filter: "blur(0px)",
                        duration: 1.8,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: module,
                            start: "top 80%",
                            toggleActions: "play none none reverse"
                        }
                    }
                );
            }

            // Content staggered slide up
            if (content) {
                gsap.fromTo(content.children,
                    { opacity: 0, y: 30 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 1,
                        stagger: 0.1,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: module,
                            start: "top 75%",
                            toggleActions: "play none none reverse"
                        }
                    }
                );
            }
        });

        // Staggered reveal for service grid cards
        const serviceGrid = document.querySelector('.services-grid');
        if (serviceGrid) {
            gsap.fromTo('.service-card',
                { opacity: 0, y: 80 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 1,
                    stagger: 0.15,
                    ease: "back.out(1.2)",
                    scrollTrigger: {
                        trigger: serviceGrid,
                        start: "top 80%",
                        toggleActions: "play none none reverse"
                    }
                }
            );
        }

        // Hero Parallax
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            gsap.fromTo(heroContent.children,
                { opacity: 0, y: 40 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 1.2,
                    stagger: 0.1,
                    ease: "power3.out",
                    delay: 0.2
                }
            );
        }
    }
});
