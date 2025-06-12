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
  
  window.addEventListener('DOMContentLoaded', () => {
    const articleDiv = document.querySelector('.text');
    const textarea = document.querySelector('#edit-article-form textarea[name="content"]');
    if (articleDiv && textarea) {
      textarea.value = stripHtml(articleDiv.innerHTML);
    }
  
    document.getElementById('show-edit-form').onclick = function() {
      document.getElementById('edit-form-container').style.display = 'block';
      this.style.display = 'none';
    };
  
    document.getElementById('edit-article-form').onsubmit = async function(e) {
      e.preventDefault();
      const form = e.target;
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
        user: form.user.value
      };
  
      let prUrl = "";
      try {
        const response = await fetch('https://api.rikipedia.workers.dev/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const res = await response.json();
        if (res.success) {
          prUrl = res.pr_url;
          resultDiv.innerHTML = `✅ Suggestion submitted! <a href="${res.pr_url}" target="_blank">View Pull Request</a>`;
        } else {
          resultDiv.textContent = "❌ Error: " + (res.error || "Unknown error.");
        }
      } catch (err) {
        resultDiv.textContent = "❌ Network error.";
      }
  
      // 3. notify via formspree
      if (prUrl) {
        fetch("https://formspree.io/f/mdkzgpey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            _subject: "New Rikipedia PR Suggestion",
            message: `User: ${form.user.value || "anonymous"}\nIP: ${userIp}\nFile: ${form.filename.value}\nPR: ${prUrl}`
          })
        });
      }
    };
  });