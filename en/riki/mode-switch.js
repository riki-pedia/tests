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

    // Prefill the textarea with only headings and paragraphs from .text
    const articleDiv = document.querySelector('.text');
    const textarea = document.querySelector('#edit-article-form textarea[name="content"]');
    if (articleDiv && textarea) {
      // Select all headings and paragraphs, in order
      const nodes = articleDiv.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
      textarea.value = Array.from(nodes)
        .map(node => {
          const tag = node.tagName.toLowerCase();
          if (tag.startsWith('h')) {
            const level = tag.replace('h', '');
            // Use innerHTML to preserve inline tags
            return `${'#'.repeat(Number(level))} ${node.innerHTML.trim()}`;
          }
          // For paragraphs, also use innerHTML
          return node.innerHTML.trim();
        })
        .filter(Boolean)
        .join('\n\n');
    }

      // Attach the show/hide handler for the edit form link
      const showLink = document.getElementById('show-edit-form-link');
      const formContainer = document.getElementById('edit-form-container');
      if (showLink && formContainer) {
        showLink.addEventListener('click', function(e) {
          e.preventDefault();
          formContainer.style.display = 'block';
          showLink.style.display = 'none';
          setTimeout(() => {
            formContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
        });
      }

    // Attach form handler after nav is loaded
    const form = document.getElementById('edit-article-form');
    if (form) {
      form.onsubmit = async function(e) {
        e.preventDefault();
        const resultDiv = document.getElementById('edit-form-result');
        resultDiv.textContent = "Submitting...";
        const plainText = form.content.value;

        // Parse to JSON blocks
        const blocks = plainText.split(/\n{2,}/).map(block => {
          const trimmed = block.trim();
          if (/^#{1,6}\s/.test(trimmed)) {
            const level = trimmed.match(/^#+/)[0].length;
            return { type: `h${level}`, text: trimmed.replace(/^#+\s*/, '') };
          }
          return { type: 'p', text: trimmed };
        }).filter(b => b.text);

        try {
          const response = await fetch('https://api.rikipedia.workers.dev/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: form.filename.value,
              content: blocks,
              user: form.user.value,
              explanation: form.explanation.value
            })
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
      });