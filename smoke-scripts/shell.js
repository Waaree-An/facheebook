async function () {
  const root = document.getElementById('root');
  const btns = Array.from(document.querySelectorAll('button')).map(function (b) {
    return (b.innerText || b.getAttribute('aria-label') || '').trim();
  });
  let lsOk = false;
  let lsMsg = '';
  try {
    localStorage.setItem('__probe__', '1');
    localStorage.removeItem('__probe__');
    lsOk = true;
    lsMsg = 'localStorage writable';
  } catch (e) {
    lsMsg = 'localStorage error: ' + e.message;
  }
  return {
    rootChildren: root ? root.children.length : 0,
    buttonCount: btns.length,
    buttons: btns.filter(Boolean).slice(0, 60),
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 400),
    lsOk: lsOk,
    lsMsg: lsMsg,
  };
}
