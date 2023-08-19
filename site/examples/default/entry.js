const render = () => {
  const tt = window['tt'];
  if (tt) {
    setTimeout(() => {
      tt.init();

      document.querySelectorAll('[code-from]').forEach((el) => {
        const code = document.querySelector(el.getAttribute('code-from')).innerHTML.trim();
        if (code) {
          el.innerHTML = code.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
        }
      });
      hljs.highlightAll();
    }, 100);
  }

  return Promise.resolve();
};

((global) => {
  global['examples-default'] = {
    bootstrap: () => {
      return Promise.resolve();
    },
    mount: () => {
      return render();
    },
    unmount: () => {
      return Promise.resolve();
    },
  };
})(window);