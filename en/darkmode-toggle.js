// wait for nav to load
    fetch('https://test.riki-pedia.org/en/nav.html')
      .then(response => response.text())
      .then(data => {
        document.getElementById('navPh').innerHTML = data;

        // Wait for the DOM to update with the new nav
        setTimeout(() => {
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

          // detect saved or system preference
          let theme = localStorage.getItem('theme');
          if (!theme) {
            theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          }
          setTheme(theme);

          // toggle on click
          if (toggleLink) {
            toggleLink.addEventListener('click', function(e) {
              e.preventDefault();
              theme = (theme === 'dark') ? 'light' : 'dark';
              setTheme(theme);
            });
          }
        }, 0); // 0ms delay to ensure DOM update
      });

window.addEventListener('DOMContentLoaded', () => {
  // wait for nav to be loaded into #navPh
  setTimeout(() => {
    // check if we're on an article page (customize this condition as needed)
    if (window.location.pathname.includes('/riki/' || window.location.pathname.includes('.html'))) {
      const nav = document.querySelector('.navbar ul');
      if (nav && !nav.querySelector('.home-article-link')) {
        const li = document.createElement('li');
        li.className = 'home-article-link';
        li.innerHTML = '<a href="https://en.riki-pedia.org/">Home</a>';
        nav.insertBefore(li, nav.firstChild);
      }
    }
  }, 100); // delay to ensure nav is loaded
});