// wait for nav to load
    fetch('https://riki-pedia.org/en/nav.html')
      .then(response => response.text())
      .then(data => {
        document.getElementById('navPh').innerHTML = data;

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