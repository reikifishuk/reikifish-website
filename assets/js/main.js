document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const imageFrames = document.querySelectorAll('[data-media-shell]');
  imageFrames.forEach((frame) => {
    const image = frame.querySelector('img');
    if (!image) {
      return;
    }

    const fallbackSrc = image.dataset.fallbackSrc;

    const markLoaded = () => {
      frame.classList.remove('is-missing');
      image.classList.add('is-loaded');
      image.style.display = '';
    };

    const markMissing = () => {
      frame.classList.add('is-missing');
      image.classList.remove('is-loaded');
      image.style.display = 'none';
    };

    image.addEventListener('load', markLoaded, { once: true });
    image.addEventListener('error', () => {
      if (fallbackSrc && image.getAttribute('src') !== fallbackSrc && !image.dataset.fallbackUsed) {
        image.dataset.fallbackUsed = 'true';
        image.src = fallbackSrc;
        return;
      }

      markMissing();
    });

    if (image.complete && image.naturalWidth > 0) {
      markLoaded();
    } else if (image.complete && image.naturalWidth === 0) {
      if (fallbackSrc && image.getAttribute('src') !== fallbackSrc) {
        image.dataset.fallbackUsed = 'true';
        image.src = fallbackSrc;
      } else {
        markMissing();
      }
    }
  });

  const parallaxItems = document.querySelectorAll('.parallax');
  const handleScroll = () => {
    const scrolled = window.scrollY;
    parallaxItems.forEach((item) => {
      const depth = Number(item.dataset.depth || 0.08);
      item.style.transform = `translate3d(0, ${scrolled * depth}px, 0)`;
    });
  };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    parallaxItems.forEach((item) => {
      item.style.transform = 'none';
    });
  } else {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  const contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    const successMessage = document.querySelector('[data-contact-success]');
    const submittedAtField = contactForm.querySelector('[data-submitted-at]');

    contactForm.addEventListener('submit', (event) => {
      if (!contactForm.checkValidity()) {
        return;
      }

      event.preventDefault();

      const formData = new FormData(contactForm);
      const submittedAt = new Date().toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      if (submittedAtField) {
        submittedAtField.value = submittedAt;
      }

      const lines = [
        ['Full Name', formData.get('Full Name')],
        ['Email', formData.get('Email')],
        ['Telephone', formData.get('Telephone') || ''],
        ['Organisation', formData.get('Organisation') || ''],
        ['Enquiry Type', formData.get('Enquiry Type')],
        ['Message', formData.get('Message')],
        ['Date & Time submitted', submittedAt],
      ];

      const body = lines
        .map(([label, value]) => `${label}: ${value ?? ''}`)
        .join('\n\n');

      const mailtoUrl = `mailto:andyprouk@yahoo.com?subject=${encodeURIComponent('Website enquiry from Andy Fish website')}&body=${encodeURIComponent(body)}`;

      if (successMessage) {
        successMessage.hidden = false;
      }

      window.location.href = mailtoUrl;
      contactForm.reset();
    });
  }
});
