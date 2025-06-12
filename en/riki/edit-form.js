document.getElementById('show-edit-form').onclick = function() {
  document.getElementById('edit-form-container').style.display = 'block';
  this.style.display = 'none';
};

document.getElementById('edit-article-form').onsubmit = async function(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    filename: form.filename.value,
    content: form.content.value,
    user: form.user.value
  };
  const resultDiv = document.getElementById('edit-form-result');
  resultDiv.textContent = "Submitting...";
  try {
    const response = await fetch('https://api.rikipedia.workers.dev/api/edit-article', {
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