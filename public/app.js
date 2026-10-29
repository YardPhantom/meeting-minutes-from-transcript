// Heuristic meeting-minutes parser. No network, no API key.
const SAMPLE = `Sarah: Okay let's get started. Agenda today: Q3 launch timeline, budget review, and hiring.
Mike: First item, the launch. We're behind on QA by about a week.
Sarah: Let's push the launch to October 14th. Everyone okay? Agreed.
Mike: Decided then, launch moves to Oct 14.
Priya: I'll update the public roadmap by Friday.
Sarah: Next topic: budget. We're 8% over on cloud spend.
Mike: Action item: Mike to audit unused instances this week.
Priya: We agreed to cap staging environments at three.
Sarah: Moving on to hiring. We need a second frontend engineer.
Priya: Can you post the job description, Sarah?
Sarah: Yes, I will post it by Monday.
Mike: Let's follow up next Tuesday on all of this.`;
const AGENDA = /\b(agenda|first item|next topic|moving on to|next up|item \d|topic)\b/i;
const DECISION = /\b(decided|we agreed|agreed|decision|let's go with|we will go with|approved|let's push|final call)\b/i;
const ACTION = /\b(action item|i'll|i will|will (?:send|post|update|draft|review|audit|follow)|to (?:audit|send|post|update|draft|review)|todo|by (?:monday|tuesday|wednesday|thursday|friday|eod|tomorrow|next week)|follow up|can you)\b/i;
function parse(text) {
  const out = { agenda: [], decisions: [], actions: [], speakers: new Set() };
  let last = null;
  for (const raw of text.split(/\n+/)) {
    const m = raw.match(/^\s*([A-Z][\w .'-]{0,30}?):\s*(.+)$/);
    const who = m ? m[1].trim() : null, line = (m ? m[2] : raw).trim();
    if (!line) continue; if (who) out.speakers.add(who);
    for (const s of line.split(/(?<=[.!?])\s+/)) {
      if (AGENDA.test(s)) {
        const after = s.replace(/^.*?(agenda( today)?|first item|next topic|moving on to|next up|topic)[:,]?\s*/i, '');
        after.split(/,\s*(?:and\s+)?|\band\b/).map(x => x.replace(/[.,]$/, '').trim()).filter(x => x.length > 2).forEach(x => out.agenda.push(x));
      }
      if (DECISION.test(s)) out.decisions.push({ who, text: s });
      if (ACTION.test(s)) {
        let owner = who; const t = s.match(/^(\w+) to\b/); if (t) owner = t[1];
        const ask = s.match(/can you .*?,\s*(\w+)\?/i); if (ask) owner = ask[1];
        const due = (s.match(/\b(?:by|on|next)\s+(monday|tuesday|wednesday|thursday|friday|eod|tomorrow|next week|this week|\w+ \d{1,2})/i) || s.match(/\b(this week)\b/i) || [])[0] || '';
        out.actions.push({ owner: owner || '?', text: s, due });
      }
    }
    last = who;
  }
  out.agenda = [...new Set(out.agenda)];
  return out;
}
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function render(r) {
  const li = (a, f) => a.length ? '<ul>' + a.map(x => '<li>' + f(x) + '</li>').join('') + '</ul>' : '<em>None detected</em>';
  document.getElementById('out').innerHTML =
    `<div class="card"><h2>Attendees (${r.speakers.size})</h2>${esc([...r.speakers].join(', ') || '—')}</div>` +
    `<div class="card"><h2>Agenda</h2>${li(r.agenda, esc)}</div>` +
    `<div class="card"><h2>Decisions</h2>${li(r.decisions, d => esc(d.text) + (d.who ? ` <span class="tag low">${esc(d.who)}</span>` : ''))}</div>` +
    `<div class="card"><h2>Action items</h2>${li(r.actions, a => `<span class="tag med">${esc(a.owner)}</span>${esc(a.text)}${a.due ? ` <span class="tag high">${esc(a.due)}</span>` : ''}`)}</div>`;
  window._md = `# Meeting minutes\n\n**Attendees:** ${[...r.speakers].join(', ')}\n\n## Agenda\n${r.agenda.map(x => '- ' + x).join('\n')}\n\n## Decisions\n${r.decisions.map(x => '- ' + x.text).join('\n')}\n\n## Action items\n${r.actions.map(x => `- [ ] **${x.owner}**: ${x.text}${x.due ? ' _(due ' + x.due + ')_' : ''}`).join('\n')}\n`;
}
const ta = document.getElementById('in');
document.getElementById('go').onclick = () => render(parse(ta.value));
document.getElementById('sample').onclick = () => { ta.value = SAMPLE; render(parse(SAMPLE)); };
if (location.search.includes('demo')) document.getElementById('sample').click();
