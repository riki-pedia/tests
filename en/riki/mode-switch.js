// this is really a catch all script, but im too lazy to rename it
// it handles the theme switcher, the edit form, and the nav bar
function stripHtml(html) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
    function wrapHtml(text) {
    const paragraphs = text.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, ' ')}</p>`);
    return `<div class="text">\n${paragraphs.join('\n')}\n</div>`;
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
          const resultDiv = document.getElementById('edit-form-result');
          resultDiv.textContent = "Submitting...";
          const plainText = form.content.value;
          const htmlContent = wrapHtml(plainText);

          // 1. Get user's IP address
          let userIp = "unknown";
          try {
            const ipRes = await fetch("https://api.ipify.org?format=json");
            const ipData = await ipRes.json();
            userIp = ipData.ip;
          } catch (err) {
            // ignore, fallback to "unknown"
          }

          // 2. Send edit suggestion to your API
          const data = {
            filename: form.filename.value,
            content: htmlContent,
            user: form.user.value,
            explanation: form.explanation.value,
          };

          try {
            const response = await fetch('https://api.rikipedia.workers.dev/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            const res = await response.json();
            if (res.success) {
              resultDiv.innerHTML = `✅ Suggestion submitted! <a href="${res.pr_url}" target="_blank">View Pull Request</a>`;
            } else {
              resultDiv.textContent = "❌ Error: " + (res.error || "Unknown error.");
            }
          } catch (err) {
            resultDiv.textContent = "❌ Network error.";
          }
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