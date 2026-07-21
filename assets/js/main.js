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
    const statusMessage = document.querySelector('[data-contact-status]');
    const submittedAtField = contactForm.querySelector('[data-submitted-at-client]');
    const honeypotField = contactForm.querySelector('[data-honeypot]');
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const fields = {
      fullName: document.getElementById('fullName'),
      emailAddress: document.getElementById('emailAddress'),
      enquiryType: document.getElementById('enquiryType'),
      message: document.getElementById('message'),
    };

    const errorNodes = {
      fullName: contactForm.querySelector('[data-error-for="fullName"]'),
      emailAddress: contactForm.querySelector('[data-error-for="emailAddress"]'),
      enquiryType: contactForm.querySelector('[data-error-for="enquiryType"]'),
      message: contactForm.querySelector('[data-error-for="message"]'),
    };

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (submittedAtField && !submittedAtField.value) {
      submittedAtField.value = String(Date.now());
    }

    const clearValidation = (name) => {
      const field = fields[name];
      const errorNode = errorNodes[name];
      if (field) {
        field.setAttribute('aria-invalid', 'false');
      }
      if (errorNode) {
        errorNode.hidden = true;
        errorNode.textContent = '';
      }
      if (field) {
        field.closest('.contact-field')?.classList.remove('is-invalid');
      }
    };

    const setValidation = (name, message) => {
      const field = fields[name];
      const errorNode = errorNodes[name];
      if (field) {
        field.setAttribute('aria-invalid', 'true');
      }
      if (errorNode) {
        errorNode.textContent = message;
        errorNode.hidden = false;
      }
      if (field) {
        field.closest('.contact-field')?.classList.add('is-invalid');
      }
    };

    const validateField = (name) => {
      const field = fields[name];
      if (!field) {
        return true;
      }

      const value = field.value.trim();
      clearValidation(name);

      if (name === 'fullName' && !value) {
        setValidation(name, 'Please enter your full name.');
        return false;
      }

      if (name === 'emailAddress') {
        if (!value) {
          setValidation(name, 'Please enter your email address.');
          return false;
        }
        if (!emailPattern.test(value)) {
          setValidation(name, 'Please enter a valid email address.');
          return false;
        }
      }

      if (name === 'enquiryType' && !value) {
        setValidation(name, 'Please select an enquiry type.');
        return false;
      }

      if (name === 'message' && value.length < 10) {
        setValidation(name, 'Please provide a little more detail.');
        return false;
      }

      return true;
    };

    Object.entries(fields).forEach(([name, field]) => {
      if (!field) {
        return;
      }

      field.addEventListener('blur', () => validateField(name));
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') {
          validateField(name);
        }
      });
    });

    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();

      if (submitButton && submitButton.disabled) {
        return;
      }

      const isValid = Object.keys(fields).every((name) => validateField(name));
      if (!isValid) {
        if (statusMessage) {
          statusMessage.hidden = false;
          statusMessage.textContent = 'Please check the highlighted fields and try again.';
        }
        return;
      }

      const formData = new FormData(contactForm);
      const submittedAtClient = submittedAtField?.value ? Number(submittedAtField.value) : 0;
      const submittedAt = new Date().toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      if (honeypotField && String(honeypotField.value || '').trim()) {
        if (statusMessage) {
          statusMessage.hidden = false;
          statusMessage.textContent = 'Submission could not be processed.';
        }
        return;
      }

      const payload = {
        fullName: String(formData.get('Full Name') || ''),
        emailAddress: String(formData.get('Email') || ''),
        telephoneNumber: String(formData.get('Telephone') || ''),
        organisation: String(formData.get('Organisation') || ''),
        enquiryType: String(formData.get('Enquiry Type') || ''),
        message: String(formData.get('Message') || ''),
        submittedAtClient,
        submittedAt,
      };

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute('aria-busy', 'true');
        submitButton.dataset.originalLabel = submitButton.textContent || '';
        submitButton.textContent = 'Sending...';
      }

      if (statusMessage) {
        statusMessage.hidden = false;
        statusMessage.textContent = 'Sending your enquiry...';
      }

      fetch(contactForm.action || '/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.error || 'Unable to send your enquiry.');
          }

          contactForm.reset();
          if (submittedAtField) {
            submittedAtField.value = String(Date.now());
          }
          if (statusMessage) {
            statusMessage.hidden = false;
            statusMessage.textContent = data.message || "Thank you. Your enquiry has been sent successfully.";
          }
          Object.keys(fields).forEach((name) => clearValidation(name));
        })
        .catch((error) => {
          if (statusMessage) {
            statusMessage.hidden = false;
            statusMessage.textContent = error.message || 'Something went wrong. Please try again.';
          }
        })
        .finally(() => {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.removeAttribute('aria-busy');
            submitButton.textContent = submitButton.dataset.originalLabel || 'Send Enquiry';
            delete submitButton.dataset.originalLabel;
          }
        });
    });
  }
});
