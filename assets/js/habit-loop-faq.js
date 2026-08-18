document.addEventListener('DOMContentLoaded', () => {
  const content = document.querySelector('.hb-content');
  const sourceSection = content?.querySelector('#sources');
  if (!content || !sourceSection || content.querySelector('#faq')) {
    return;
  }

  const section = document.createElement('section');
  section.className = 'hb-section hb-faq';
  section.id = 'faq';
  section.innerHTML = `
    <div class="hb-section-head"><div class="hb-kicker">FAQs</div><h2>Habit Loop questions answered</h2></div>
    <details><summary>What are the three parts of a habit loop?</summary><div><p>The common model describes a cue, a routine and a reward or outcome. Real habits are more complex and may have several cues and functions.</p></div></details>
    <details><summary>Can every habit be changed?</summary><div><p>Many behaviours can change, but the process depends on health, safety, resources, support and the function the behaviour serves.</p></div></details>
    <details><summary>Why do I keep returning to an old habit?</summary><div><p>Old routines may still be strongly associated with relief or reward, especially during stress. A lapse is information, not proof of failure.</p></div></details>
    <details><summary>Is habit change just willpower?</summary><div><p>No. Environment, sleep, emotion, accessibility, social support and task design often determine what is realistically repeatable.</p></div></details>
    <details><summary>How long does it take to build a habit?</summary><div><p>There is no universal number of days. Difficulty, context, repetition and the person all affect the timeline.</p></div></details>`;
  content.insertBefore(section, sourceSection);
});
