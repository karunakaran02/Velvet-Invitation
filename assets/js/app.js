(function () {
  "use strict";

  const config = window.INVITATION_CONFIG;
  if (!config) {
    console.error("Configuration not loaded! Check config.js.");
    return;
  }

  let isMusicPlaying = false;
  let hasOpened = false;
  let userDismissedMusic = false;

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

  const introVideo = $("#introVideo");
  const bgAudio = $("#bgAudio");
  const openSealBtn = $("#openSealBtn");
  const scrollContainer = $("#invitationScroll");
  const toastEl = $("#appToast");
  const toastMsg = $("#toastMsg");
  const lightboxModal = $("#lightboxModal");
  const lightboxImg = $("#lightboxImg");
  const lightboxClose = $("#lightboxClose");


  if (bgAudio && config.media && config.media.music) {
    if (bgAudio.getAttribute("src") !== config.media.music) {
      bgAudio.src = config.media.music;
    }
    const sourceEl = bgAudio.querySelector("source");
    if (sourceEl && sourceEl.getAttribute("src") !== config.media.music) {
      sourceEl.setAttribute("src", config.media.music);
      sourceEl.src = config.media.music;
    }
    bgAudio.load();
  }

  function playAudio() {
    if (!bgAudio || userDismissedMusic) return Promise.resolve(false);

    // Warm up Web Audio API context if present
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!window._weddingAudioCtx) window._weddingAudioCtx = new AudioCtx();
        if (window._weddingAudioCtx.state === "suspended") {
          window._weddingAudioCtx.resume();
        }
      }
    } catch (e) {}

    bgAudio.muted = false;
    const playPromise = bgAudio.play();

    if (playPromise !== undefined) {
      return playPromise
        .then(() => {
          if (!bgAudio.paused && !bgAudio.muted) {
            isMusicPlaying = true;
            hasOpened = true;
            updateMusicButton();
            removeUnlockListeners();
          }
          return true;
        })
        .catch((err) => {
          isMusicPlaying = false;
          updateMusicButton();
          return false;
        });
    }

    return Promise.resolve(false);
  }

  if (introVideo) {
    introVideo.play().catch(() => undefined);
  }

  const unlockEvents = [
    "scroll",
    "wheel",
    "touchmove",
    "touchstart",
    "touchend",
    "pointerdown",
    "pointermove",
    "mousedown",
    "click",
    "keydown",
    "focus",
    "mouseenter",
  ];

  function onUserGesture(e) {
    if (userDismissedMusic || isMusicPlaying) return;
    playAudio();
  }

  function attachUnlockListeners() {
    const targets = [
      window,
      document,
      document.documentElement,
      document.body,
      scrollContainer,
      $("#appViewport"),
      $("#hero"),
    ].filter(Boolean);

    targets.forEach((target) => {
      unlockEvents.forEach((evt) => {
        target.addEventListener(evt, onUserGesture, { capture: true, passive: true });
      });
    });

    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", onUserGesture, { capture: true, passive: true });
    }
  }

  function removeUnlockListeners() {
    const targets = [
      window,
      document,
      document.documentElement,
      document.body,
      scrollContainer,
      $("#appViewport"),
      $("#hero"),
    ].filter(Boolean);

    targets.forEach((target) => {
      unlockEvents.forEach((evt) => {
        target.removeEventListener(evt, onUserGesture, { capture: true });
      });
    });

    if (scrollContainer) {
      scrollContainer.removeEventListener("scroll", onUserGesture, { capture: true });
    }
  }

  attachUnlockListeners();

  openSealBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!bgAudio) return;

    if (bgAudio.paused || bgAudio.muted) {
      userDismissedMusic = false;
      bgAudio.muted = false;
      playAudio();
    } else {
      bgAudio.pause();
      userDismissedMusic = true;
      isMusicPlaying = false;
      updateMusicButton();
    }
  });

  function triggerInitialAutoplay() {
    if (config.media?.musicAutoPlay && !userDismissedMusic && bgAudio && (bgAudio.paused || bgAudio.muted)) {
      playAudio();
    }
  }

  triggerInitialAutoplay();

  ["load", "pageshow", "focus"].forEach((evt) => {
    window.addEventListener(evt, triggerInitialAutoplay);
  });

  document.addEventListener("DOMContentLoaded", triggerInitialAutoplay);
  bgAudio?.addEventListener("canplay", triggerInitialAutoplay, { once: true });
  bgAudio?.addEventListener("canplaythrough", triggerInitialAutoplay, { once: true });

  [100, 300, 700, 1500].forEach((delay) => {
    setTimeout(() => {
      if (!isMusicPlaying && !userDismissedMusic && bgAudio && bgAudio.paused) {
        triggerInitialAutoplay();
      }
    }, delay);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && config.media?.musicAutoPlay && !userDismissedMusic && bgAudio?.paused) {
      triggerInitialAutoplay();
    }
  });


  function updateMusicButton() {
    const sealLabel = openSealBtn?.querySelector(".royal-seal-label");
    if (sealLabel) {
      if (isMusicPlaying) {
        sealLabel.textContent = "PAUSE MUSIC";
        openSealBtn.classList.add("is-playing");
      } else {
        sealLabel.textContent = "ROYAL CELEBRATION";
        openSealBtn.classList.remove("is-playing");
      }
    }
  }

  bgAudio?.addEventListener("play", () => {
    isMusicPlaying = !bgAudio.muted;
    hasOpened = true;
    updateMusicButton();
    if (!bgAudio.muted) {
      removeUnlockListeners();
    }
  });

  bgAudio?.addEventListener("pause", () => {
    isMusicPlaying = false;
    updateMusicButton();
  });


  function initScrollNavigation() {
    // Wedsmint .scroll-cue anchor links
    $$(".scroll-cue").forEach((cue) => {
      cue.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onUserGesture(e);

        const targetId = cue.getAttribute("href");
        const targetEl = $(targetId);
        if (targetEl && scrollContainer) {
          const topPos = targetEl.offsetTop - 20;
          scrollContainer.scrollTo({ top: topPos, behavior: "smooth" });
        }
      });
    });

    let isDraggingScroll = false;
    let dragStartY = 0;
    let dragScrollTop = 0;

    scrollContainer?.addEventListener("mousedown", (e) => {
      if (e.button !== 0 || e.target.closest("button, a, input, [role='button'], .couple-slide")) return;
      isDraggingScroll = true;
      dragStartY = e.clientY;
      dragScrollTop = scrollContainer.scrollTop;
      onUserGesture(e);
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDraggingScroll || !scrollContainer) return;
      const dy = e.clientY - dragStartY;
      if (Math.abs(dy) > 4) {
        scrollContainer.scrollTop = dragScrollTop - dy;
      }
    });

    window.addEventListener("mouseup", () => {
      isDraggingScroll = false;
    });
  }


  let toastTimer = null;
  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMsg.textContent = message;
    toastEl.classList.add("show");
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("show");
    }, 2800);
  }


  function openLightbox(src) {
    lightboxImg.src = src;
    lightboxModal.classList.add("is-open");
  }

  function closeLightbox() {
    lightboxModal.classList.remove("is-open");
  }

  lightboxClose?.addEventListener("click", closeLightbox);
  lightboxModal?.addEventListener("click", (e) => {
    if (e.target === lightboxModal) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });


  function initQrCodes() {
    const venueQrContainer = $("#venueQrCode");
    if (venueQrContainer && window.QRCode) {
      venueQrContainer.innerHTML = "";
      new QRCode(venueQrContainer, {
        text: config.venue.googleMapsUrl,
        width: 150,
        height: 150,
        colorDark: "#220306",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H,
      });
    }

    const desktopQrContainer = $("#desktopQrCodeFrame");
    if (desktopQrContainer && window.QRCode) {
      desktopQrContainer.innerHTML = "";
      const currentUrl = window.location.href.split("#")[0];
      new QRCode(desktopQrContainer, {
        text: currentUrl,
        width: 112,
        height: 112,
        colorDark: "#150204",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M,
      });
    }
  }


  $("#copyAddressBtn")?.addEventListener("click", () => {
    const fullAddress = `${config.venue.nameTamil} (${config.venue.nameEnglish}), ${config.venue.addressTamil} (${config.venue.addressEnglish})`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullAddress).then(() => {
        showToast("✓ மண்டப முகவரி நகலெடுக்கப்பட்டது (Address Copied!)");
      }).catch(() => {
        showToast(fullAddress);
      });
    } else {
      showToast(fullAddress);
    }
  });

  $("#whatsappRsvpBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    const cleanPhone = config.rsvp.whatsappNumber.replace(/[^0-9]/g, "");
    const encodedMsg = encodeURIComponent(config.rsvp.whatsappMessage);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    window.open(waUrl, "_blank");
  });


  function initCountdown() {
    const targetDate = new Date(config.wedding.isoDate).getTime();

    const daysEl = $("#countDays");
    const hoursEl = $("#countHours");
    const minutesEl = $("#countMinutes");
    const secondsEl = $("#countSeconds");

    function update() {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        if (daysEl) daysEl.textContent = "00";
        if (hoursEl) hoursEl.textContent = "00";
        if (minutesEl) minutesEl.textContent = "00";
        if (secondsEl) secondsEl.textContent = "00";
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (daysEl) daysEl.textContent = String(days).padStart(2, "0");
      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, "0");
      if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, "0");
      if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, "0");
    }

    update();
    setInterval(update, 1000);
  }


  function initParticles() {
    const appViewport = $("#appViewport");
    const canvas = $("#petalCanvas");
    if (!canvas || !appViewport) return;
    const ctx = canvas.getContext("2d");

    let width = (canvas.width = appViewport.clientWidth);
    let height = (canvas.height = appViewport.clientHeight);

    window.addEventListener("resize", () => {
      width = canvas.width = appViewport.clientWidth;
      height = canvas.height = appViewport.clientHeight;
    });

    const particles = [];
    const count = 16;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2.2 + 1.2,
        speedY: Math.random() * 0.6 + 0.3,
        speedX: Math.random() * 0.4 - 0.2,
        opacity: Math.random() * 0.5 + 0.25,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.03 + 0.01,
      });
    }

    function render() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y += p.speedY;
        p.wobble += p.wobbleSpeed;
        p.x += Math.sin(p.wobble) * 0.4 + p.speedX;

        if (p.y > height + 10) {
          p.y = -10;
          p.x = Math.random() * width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 163, 95, ${p.opacity})`;
        ctx.shadowColor = "rgba(201, 163, 95, 0.6)";
        ctx.shadowBlur = 6;
        ctx.fill();
      });

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }


  function initCoupleData() {
    if (!config.couple) return;

    const { groom, bride, fontStyle, tamilFontStyle } = config.couple;

    const coupleContainer = $(".couple-names");
    if (coupleContainer) {
      coupleContainer.classList.remove(
        "font-style-calligraphy",
        "font-style-royal-serif",
        "font-style-modern"
      );
      coupleContainer.classList.add(`font-style-${fontStyle || "calligraphy"}`);

      coupleContainer.classList.remove(
        "tamil-style-arima",
        "tamil-style-kavivanar",
        "tamil-style-modern",
        "tamil-style-serif"
      );
      coupleContainer.classList.add(`tamil-style-${tamilFontStyle || "arima"}`);
    }

    if (groom) {
      const groomTamil = $(".groom-name");
      if (groomTamil && groom.nameTamil) groomTamil.textContent = groom.nameTamil;

      const groomEng = groomTamil?.parentElement?.querySelector(".name-sub");
      if (groomEng && groom.nameEnglish) groomEng.textContent = groom.nameEnglish;
    }

    if (bride) {
      const brideTamil = $(".bride-name");
      if (brideTamil && bride.nameTamil) brideTamil.textContent = bride.nameTamil;

      const brideEng = brideTamil?.parentElement?.querySelector(".name-sub");
      if (brideEng && bride.nameEnglish) brideEng.textContent = bride.nameEnglish;
    }
  }


  let coupleSliderInitialized = false;

  function initCoupleSlider() {
    if (coupleSliderInitialized) return;
    const track = $("#coupleSliderTrack");
    if (!track) return;

    coupleSliderInitialized = true;
    const gallery = $("#couplePhotoGallery") || track;
    const slides = $$(".couple-slide", track);
    const dots = $$(".story-dot");
    const prevBtn = $("#coupleSliderPrev");
    const nextBtn = $("#coupleSliderNext");
    const totalSlides = slides.length || 2;
    let currentSlide = 0;
    let isSwiping = false;

    if (totalSlides > 0) {
      track.style.width = `${totalSlides * 100}%`;
      slides.forEach((s) => {
        s.style.width = `${100 / totalSlides}%`;
      });
    }

    const photoList = config.media?.couplePhotos;
    if (Array.isArray(photoList) && photoList.length > 0) {
      photoList.forEach((src, idx) => {
        const slideImg = $(`#couplePhoto${idx + 1}`);
        if (slideImg && src) {
          slideImg.src = src;
        }
      });
    }

    function updateSlider(idx) {
      currentSlide = (idx + totalSlides) % totalSlides;
      const offsetPercent = -(currentSlide * (100 / totalSlides));
      track.style.transform = `translateX(${offsetPercent}%)`;

      slides.forEach((s, i) => s.classList.toggle("is-active", i === currentSlide));
      dots.forEach((d, i) => d.classList.toggle("is-active", i === currentSlide));
    }

    let autoScrollTimer = null;
    const isAutoplayEnabled = config.media?.carouselAutoplay !== false;
    const autoplayInterval = Number(config.media?.carouselInterval) || 3800;

    function startAutoScroll() {
      if (!isAutoplayEnabled || autoScrollTimer || totalSlides <= 1) return;
      autoScrollTimer = setInterval(() => {
        updateSlider(currentSlide + 1);
      }, autoplayInterval);
    }

    function stopAutoScroll() {
      if (autoScrollTimer) {
        clearInterval(autoScrollTimer);
        autoScrollTimer = null;
      }
    }

    function restartAutoScroll() {
      stopAutoScroll();
      startAutoScroll();
    }

    slides.forEach((slide) => {
      slide.addEventListener("click", () => {
        if (!isSwiping) {
          updateSlider(currentSlide + 1);
          restartAutoScroll();
        }
      });
    });

    prevBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      updateSlider(currentSlide - 1);
      restartAutoScroll();
    });

    nextBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      updateSlider(currentSlide + 1);
      restartAutoScroll();
    });

    dots.forEach((dot) => {
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        const targetIdx = parseInt(dot.getAttribute("data-index") || "0", 10);
        updateSlider(targetIdx);
        restartAutoScroll();
      });
    });

    gallery.addEventListener("mouseenter", stopAutoScroll);
    gallery.addEventListener("mouseleave", startAutoScroll);

    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    track.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
      isSwiping = false;
      stopAutoScroll();
    }, { passive: true });

    track.addEventListener("touchmove", (e) => {
      const diffX = Math.abs(e.changedTouches[0].clientX - touchStartX);
      const diffY = Math.abs(e.changedTouches[0].clientY - touchStartY);
      if (diffX > 10 && diffX > diffY) {
        isSwiping = true;
      }
    }, { passive: true });

    track.addEventListener("touchend", (e) => {
      touchEndX = e.changedTouches[0].clientX;
      touchEndY = e.changedTouches[0].clientY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX < 0) {
          updateSlider(currentSlide + 1);
        } else {
          updateSlider(currentSlide - 1);
        }
      }
      setTimeout(() => {
        isSwiping = false;
        restartAutoScroll();
      }, 80);
    }, { passive: true });

    slides.forEach((slide) => {
      slide.addEventListener("dblclick", () => {
        const img = slide.querySelector("img");
        if (img?.src) {
          stopAutoScroll();
          openLightbox(img.src);
        }
      });
    });

    const section2 = $("#section2");
    if ("IntersectionObserver" in window && section2) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              startAutoScroll();
            } else {
              stopAutoScroll();
            }
          });
        },
        { threshold: 0.2 }
      );
      observer.observe(section2);
    } else {
      startAutoScroll();
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopAutoScroll();
      } else {
        startAutoScroll();
      }
    });
  }


  $("#toggleFullscreenBtn")?.addEventListener("click", () => {
    const appViewport = $("#appViewport");
    appViewport.classList.toggle("fullscreen-mode");
    const isFull = appViewport.classList.contains("fullscreen-mode");
    $("#fullscreenBtnLabel").textContent = isFull ? "Phone View" : "Fullscreen";
  });

  $("#desktopQrClose")?.addEventListener("click", () => {
    const card = $("#desktopQrCard");
    if (card) {
      card.style.opacity = "0";
      card.style.transform = "translateY(12px)";
      setTimeout(() => card.remove(), 300);
    }
  });


  window.addEventListener("DOMContentLoaded", () => {
    initCoupleData();
    initCoupleSlider();
    initQrCodes();
    initCountdown();
    initParticles();
    initScrollNavigation();

    if (config.media?.musicAutoPlay && !userDismissedMusic && bgAudio && bgAudio.paused) {
      playAudio();
    }
  });

})();
