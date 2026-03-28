import('./modules/bootstrap.js')
  .then(m => { console.log('BOOTSTRAP OK'); })
  .catch(e => { console.error('BOOTSTRAP FAIL:', e.message); });
