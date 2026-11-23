// Arm during aim so the interval containing the fire input is included.
export function measureSalvo(win, scenario) {
  const hud = win.document.querySelector('#hud');
  const fire = win.document.querySelector('#fire');
  const flight = [],
    impact = [];
  let last, previous, feedback, ageAtLaunch;
  const onFire = () => {
    ageAtLaunch = win.__craterwake.elapsed;
  };
  fire.addEventListener('click', onFire, { capture: true, once: true });
  return new Promise((resolve, reject) => {
    let frame;
    const timeout = win.setTimeout(() => {
      win.cancelAnimationFrame(frame);
      fire.removeEventListener('click', onFire, true);
      reject(Error('Salvo timed out in ' + hud.dataset.phase));
    }, 15000);
    function sample(stamp) {
      const phase = hud.dataset.phase;
      if (last !== undefined) {
        if (phase === 'impact' || previous === 'impact')
          impact.push(stamp - last);
        else if (phase === 'shell-cam') flight.push(stamp - last);
      }
      if (phase === 'impact' && previous !== 'impact')
        feedback = win.document.querySelector('#feedback').textContent;
      if (previous === 'impact' && phase !== 'impact') {
        win.clearTimeout(timeout);
        if (!(ageAtLaunch < 1))
          return reject(Error('Missed the first second of aim'));
        const state = win.__craterwake;
        const chain = scenario === 'chain';
        if (
          !flight.length ||
          !impact.length ||
          !feedback.includes(chain ? 'Spring crate ×2' : 'Turret hit') ||
          state.hp[0] !== 100 ||
          state.hp[1] !== (chain ? 99 : 82) ||
          state.checksum() !== (chain ? '5c000090' : '7ad1eb4e')
        )
          return reject(Error('Unexpected seed-824 shot outcome'));
        return resolve({ flight, impact });
      }
      last = stamp;
      previous = phase;
      frame = win.requestAnimationFrame(sample);
    }
    frame = win.requestAnimationFrame(sample);
  });
}

export function summarize(samples) {
  const sorted = samples.slice().sort((a, b) => a - b);
  const q = (fraction) => sorted[Math.ceil(sorted.length * fraction) - 1];
  return {
    frames: sorted.length,
    p50: q(0.5),
    p95: q(0.95),
    max: q(1),
    over: sorted.filter((ms) => ms > 33.5).length,
  };
}
