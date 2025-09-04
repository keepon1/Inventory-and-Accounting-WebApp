
export default function enableKeyboardScrollFix() {
  const scrollIntoViewOnFocus = (e) => {
    const el = e.target;

    setTimeout(() => {
      const scrollTarget = findScrollableParent(el);
      if (scrollTarget) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  };


  const reactSelectObserver = new MutationObserver(() => {
    const reactSelectInput = document.querySelector('.ivi_select__input input');
    if (reactSelectInput && !reactSelectInput.hasScrollFix) {
      reactSelectInput.addEventListener('focus', scrollIntoViewOnFocus);
      reactSelectInput.hasScrollFix = true;
    }
  });

  reactSelectObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    input.addEventListener('focus', scrollIntoViewOnFocus);
  });


  function findScrollableParent(el) {
    while (el && el !== document.body) {
      const style = window.getComputedStyle(el);
      const overflowY = style.getPropertyValue("overflow-y");
      const isScrollable = (overflowY === "auto" || overflowY === "scroll");

      if (isScrollable && el.scrollHeight > el.clientHeight) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  return () => {
    inputs.forEach(input => {
      input.removeEventListener('focus', scrollIntoViewOnFocus);
    });
    reactSelectObserver.disconnect();
  };
}
