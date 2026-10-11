
function GlobalTheme() {
  return (
    <style>{`
      * {
        box-sizing: border-box;
      }

      html,
      body,
      #root {
        width: 100%;
        min-height: 100%;
        margin: 0;
        padding: 0;
      }

      body {
        background: #ffffff;
        color: #171923;
        font-family: "Plus Jakarta Sans", Inter, "Segoe UI", Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      button,
      input,
      select,
      textarea {
        font-family: inherit;
      }

      button {
        cursor: pointer;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      :root {
        --primary: #5b35d5;
        --primary-light: #f1edff;
        --primary-hover: #4927b5;
        --page-bg: #ffffff;
        --section-bg: #f8f9fc;
        --card-bg: #ffffff;
        --text-main: #171923;
        --text-secondary: #697180;
        --text-muted: #969baa;
        --border: #e5e7eb;
      }
    `}</style>
  );
}

export default GlobalTheme;
