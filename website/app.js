fetch("navbar.html")
  .then((response) => response.text())
  .then((data) => {
    document.getElementById("navbar").innerHTML = data;

    const burger = document.getElementById("burger");
    const mobileMenu = document.getElementById("mobileMenu");

    if (burger && mobileMenu) {
      burger.addEventListener("click", () => {
        mobileMenu.classList.toggle("active");
      });

      document.querySelectorAll(".mobile-menu a").forEach((link) => {
        link.addEventListener("click", () => {
          mobileMenu.classList.remove("active");
        });
      });
    }
  });

fetch("footer.html")
  .then((response) => response.text())
  .then((data) => {
    document.getElementById("footer").innerHTML = data;
  });

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        e.target.querySelectorAll &&
          e.target.querySelectorAll(".fade-in").forEach((el, i) => {
            el.style.transitionDelay = i * 0.1 + "s";
            el.classList.add("visible");
          });
      }
    });
  },
  { threshold: 0.15 },
);

document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));

const contactForm = document.getElementById("contactForm");
const formSuccess = document.getElementById("contactFormSuccess");

const fields = {
  name: {
    input: document.getElementById("contactName"),
    error: document.getElementById("contactNameError"),
    validate(value) {
      return value.trim().length >= 2
        ? ""
        : "Моля, въведете име с поне 2 символа.";
    },
  },
  email: {
    input: document.getElementById("contactEmail"),
    error: document.getElementById("contactEmailError"),
    validate(value) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailPattern.test(value.trim())
        ? ""
        : "Моля, въведете валиден имейл адрес.";
    },
  },
  phone: {
    input: document.getElementById("contactPhone"),
    error: document.getElementById("contactPhoneError"),
    validate(value) {
      const phonePattern = /^[+()\d\s-]{7,}$/;
      return phonePattern.test(value.trim())
        ? ""
        : "Моля, въведете валиден телефон.";
    },
  },
  message: {
    input: document.getElementById("contactMessage"),
    error: document.getElementById("contactMessageError"),
    validate(value) {
      return value.trim().length >= 10
        ? ""
        : "Моля, въведете съобщение с поне 10 символа.";
    },
  },
};

function validateField(field) {
  const message = field.validate(field.input.value);
  field.error.textContent = message;
  field.input.classList.toggle("has-error", Boolean(message));
  field.input.setAttribute("aria-invalid", Boolean(message).toString());
  return !message;
}

Object.values(fields).forEach((field) => {
  field.input.addEventListener("input", () => {
    validateField(field);
    formSuccess.classList.remove("is-visible");
  });
});

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const validationResults = Object.values(fields).map(validateField);
  const isValid = validationResults.every(Boolean);
  formSuccess.classList.remove("is-visible");

  if (!isValid) {
    return;
  }

  contactForm.reset();
  Object.values(fields).forEach((field) => {
    field.input.classList.remove("has-error");
    field.input.setAttribute("aria-invalid", "false");
  });
  formSuccess.classList.add("is-visible");
});
