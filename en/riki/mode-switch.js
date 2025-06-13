function stripHtml(html) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
// wait for nav to load
    fetch('./article-nav.html')
      .then(response => response.text())
      .then(data => {
        document.getElementById('navPh').innerHTML = data;

    // Attach form handler after nav is loaded
    setTimeout(() => {
      const form = document.getElementById('edit-article-form');
      if (form) {
        form.onsubmit = async function(e) {
          e.preventDefault();
        };
      }
    }, 100);

  document.addEventListener('DOMContentLoaded', function() {
  // Wait for nav to be loaded if it's injected dynamically
  setTimeout(function() {
    const showLink = document.getElementById('show-edit-form-link');
    const formContainer = document.getElementById('edit-form-container');
    if (showLink && formContainer) {
      showLink.addEventListener('click', function(e) {
        e.preventDefault();
        formContainer.style.display = 'block';
        showLink.style.display = 'none';
        // Wait for the form to be visible before scrolling
        setTimeout(() => {
          formContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        });
       }
     }, 100); // Adjust delay if needed for nav injection
   });

        setTimeout(() => {
          // Theme logic...
          const stylesheet = document.getElementById('theme-stylesheet');
          const logoImg = document.getElementById('logo-img');
          const toggleLink = document.getElementById('theme-toggle-link');

          function setTheme(mode) {
            if (!stylesheet) return;
            if (mode === 'dark') {
              stylesheet.href = 'https://docs.riki-pedia.org/darkmode/dark.css';
              if (logoImg) logoImg.src = 'https://docs.riki-pedia.org/Rikipedia%20Logo%20Dark-1.png';
              if (toggleLink) toggleLink.textContent = 'Switch to Light Mode';
            } else {
              stylesheet.href = 'https://docs.riki-pedia.org/stylesheet.css';
              if (logoImg) logoImg.src = 'https://docs.riki-pedia.org/rikipedia%20logo.webp';
              if (toggleLink) toggleLink.textContent = 'Switch to Dark Mode';
            }
            localStorage.setItem('theme', mode);
          }

          let theme = localStorage.getItem('theme');
          if (!theme) {
            theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          }
          setTheme(theme);

          if (toggleLink) {
            toggleLink.addEventListener('click', function(e) {
              e.preventDefault();
              theme = (theme === 'dark') ? 'light' : 'dark';
              setTheme(theme);
            });
          }
        }, 0); // 0ms delay to ensure DOM update

        // Prefill the textarea with the article text after nav is loaded
        const articleDiv = document.querySelector('.text');
        const textarea = document.querySelector('#edit-article-form textarea[name="content"]');
        if (articleDiv && textarea) {
          textarea.value = stripHtml(articleDiv.innerHTML);
        }
      });