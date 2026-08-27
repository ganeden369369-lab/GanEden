// Generates 12 artboards (6 screens × en/he) for the Gan Eden mockup canvas.
import { writeFileSync } from 'node:fs';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Frank+Ruhl+Libre:wght@400;500&family=Heebo:wght@300;400;500;600&display=swap');
html,body{margin:0;overflow:hidden}body{background:#FFF7F4;font-family:'Heebo',system-ui,sans-serif;color:#2B1E1B;-webkit-font-smoothing:antialiased}
a{color:#8E5E4E}a:hover{color:#B98577}
.screen{width:390px;height:844px;box-sizing:border-box;position:relative;overflow:hidden;background:#FFF7F4;display:flex;flex-direction:column;padding:72px 28px 40px}
.display{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;letter-spacing:-0.01em}
[dir=rtl] .display{font-family:'Frank Ruhl Libre',Georgia,serif;letter-spacing:0}
.muted{color:#8A7470}
.accent{color:#8E5E4E}
.hair{height:1px;background:#EFCFC9}
.btn{height:56px;border-radius:999px;background:#8E5E4E;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600}
.btn.ghost{background:transparent;color:#8E5E4E;border:1px solid #EFCFC9}
.field{height:54px;border-bottom:1px solid #EFCFC9;display:flex;align-items:center;font-size:16px;color:#8A7470}
.gradtext{background:linear-gradient(135deg,#8E5E4E 0%,#B98577 55%,#E3B4B0 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.tabbar{position:absolute;left:0;right:0;bottom:0;height:84px;padding:12px 24px 28px;box-sizing:border-box;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid #EFCFC9;background:#FFF7F4}
.tab{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;color:#8A7470}
.tab.on{color:#8E5E4E}
`;

const ico = {
  check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8E5E4E" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>`,
  chevron: (rtl) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8E5E4E" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="transform:scaleX(${rtl ? -1 : 1})"><path d="M9 6l6 6-6 6"></path></svg>`,
  share: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8E5E4E" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13"></path><path d="M7 8l5-5 5 5"></path><path d="M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5"></path></svg>`,
  send: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l16-8-6 16-3-6-7-2z"></path></svg>`,
  home: (on) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${on ? '#8E5E4E' : '#8A7470'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4c2 3 2 7 0 10-2-3-2-7 0-10z"></path><path d="M5 12c3-1 6 0 7 2-3 1-6 0-7-2z"></path><path d="M19 12c-3-1-6 0-7 2 3 1 6 0 7-2z"></path><path d="M6 17c4 2 8 2 12 0"></path></svg>`,
  chat: (on) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${on ? '#8E5E4E' : '#8A7470'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4V6z"></path></svg>`,
  spark: (on) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${on ? '#8E5E4E' : '#8A7470'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"></path><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z"></path></svg>`,
  me: (on) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${on ? '#8E5E4E' : '#8A7470'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 21c1-4 4-6 8-6s7 2 8 6"></path></svg>`,
};

const T = {
  en: {
    dir: 'ltr',
    tagline: 'Back to your inner Garden of Eden',
    email: 'Your email',
    sendCode: 'Send me a code',
    aboutTitle: 'Let’s begin with you',
    aboutHint: 'Your numbers are born from your full name and your birthday',
    nameLabel: 'Full name, as on your ID',
    nameValue: 'Maya Cohen',
    bdayLabel: 'Date of birth',
    bday: [['21', 'Day'], ['March', 'Month'], ['1992', 'Year']],
    goalsTitle: 'What are you here for?',
    goalsSub: 'Choose everything that speaks to you',
    goals: ['Finding my partner', 'Improving my relationship', 'Growing as a woman', 'Healing from the past', 'Understanding my numbers', 'Confidence & self-worth'],
    cont: 'Continue',
    calc: 'Reading your numbers…',
    calcName: 'Maya',
    revealTitle: 'Your numbers, Maya',
    lifePath: 'Life Path',
    lifeMeaning: 'The Free Spirit — curious, adaptable, magnetic. Your path is freedom with commitment.',
    small: [['Expression', 2], ['Soul Urge', 6], ['Personality', 5], ['Birthday', 6]],
    enter: 'Enter your garden',
    greet: 'Good morning, Maya',
    pday: 'Personal day 4',
    quote: 'You were never too much. You were waiting for someone who could hold all of you.',
    quoteMeta: 'Maya · 27.8',
    share: 'Share',
    ask: 'Ask Eden',
    askSub: 'About Dan, about you, about today',
    tabs: ['Home', 'Eden', 'Numbers', 'Me'],
    chatName: 'Eden',
    chatSub: 'A new guy · today',
    m1: 'Tell me about him. What was the first thing you noticed — not about him, about how you felt?',
    u1: 'Calm. Like I didn’t need to perform. Which honestly scared me a little.',
    m2: 'That’s the part to sit with. Last month with Dan you described the opposite — always on. Your 5 wants freedom, but your 6 soul wants to be held. This one held you. Let’s look at his numbers before we go further — what’s his birthday?',
    composer: 'Write to Eden…',
  },
  he: {
    dir: 'rtl',
    tagline: 'בחזרה לגן העדן הפנימי שלך',
    email: 'האימייל שלך',
    sendCode: 'שלחו לי קוד',
    aboutTitle: 'נתחיל ממך',
    aboutHint: 'המספרים שלך נולדים מהשם המלא ומתאריך הלידה שלך',
    nameLabel: 'שם מלא, כמו בתעודת הזהות',
    nameValue: 'מאיה כהן',
    bdayLabel: 'תאריך לידה',
    bday: [['21', 'יום'], ['מרץ', 'חודש'], ['1992', 'שנה']],
    goalsTitle: 'בשביל מה הגעת?',
    goalsSub: 'בחרי כל מה שמדבר אלייך',
    goals: ['למצוא את בן הזוג שלי', 'לשפר את הזוגיות שלי', 'לצמוח כאישה', 'להחלים מהעבר', 'להבין את המספרים שלי', 'ביטחון וערך עצמי'],
    cont: 'המשך',
    calc: 'קוראת את המספרים שלך…',
    calcName: 'מאיה',
    revealTitle: 'המספרים שלך, מאיה',
    lifePath: 'נתיב החיים',
    lifeMeaning: 'הרוח החופשית — סקרנית, גמישה, מגנטית. הדרך שלך היא חופש עם מחויבות.',
    small: [['ביטוי', 2], ['נשמה', 6], ['אישיות', 5], ['יום לידה', 6]],
    enter: 'להיכנס לגן',
    greet: 'בוקר טוב, מאיה',
    pday: 'יום אישי 4',
    quote: 'מעולם לא היית יותר מדי. חיכית למישהו שיוכל להכיל את כולך.',
    quoteMeta: 'מאיה · 27.8',
    share: 'שיתוף',
    ask: 'לשאול את עדן',
    askSub: 'על דן, עלייך, על היום',
    tabs: ['בית', 'עדן', 'מספרים', 'אני'],
    chatName: 'עדן',
    chatSub: 'בחור חדש · היום',
    m1: 'ספרי לי עליו. מה הדבר הראשון ששמת לב אליו — לא עליו, על איך שאת הרגשת?',
    u1: 'רוגע. כאילו לא הייתי צריכה להופיע. וזה, בכנות, קצת הפחיד אותי.',
    m2: 'זה בדיוק המקום להישאר בו רגע. לפני חודש עם דן תיארת את ההפך — כל הזמן דרוכה. ה־5 שלך רוצה חופש, אבל הנשמה שלך, ה־6, רוצה להיות מוחזקת. הוא החזיק אותך. בואי נסתכל על המספרים שלו לפני שנמשיך — מתי יום ההולדת שלו?',
    composer: 'כתבי לעדן…',
  },
};

const wrap = (t, body) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>${CSS}</style>
</helmet>
<div class="screen" dir="${t.dir}">
${body}
</div>
</x-dc>
</body>
</html>
`;

const tabbar = (t, on) => `<div class="tabbar">
  <div class="tab ${on === 0 ? 'on' : ''}">${ico.home(on === 0)}<span>${t.tabs[0]}</span></div>
  <div class="tab ${on === 1 ? 'on' : ''}">${ico.chat(on === 1)}<span>${t.tabs[1]}</span></div>
  <div class="tab ${on === 2 ? 'on' : ''}">${ico.spark(on === 2)}<span>${t.tabs[2]}</span></div>
  <div class="tab ${on === 3 ? 'on' : ''}">${ico.me(on === 3)}<span>${t.tabs[3]}</span></div>
</div>`;

const progress = (n) =>
  `<div style="display:flex;gap:6px;margin-bottom:36px">${[1, 2, 3, 4].map((i) => `<div class="hair" style="flex:1${i <= n ? ';background:#8E5E4E' : ''}"></div>`).join('')}</div>`;

const screens = {
  SignIn: (t) => `
<div style="display:flex;flex-direction:column;align-items:center;gap:0;margin-top:96px">
  <img src="lotus.png" alt="" style="width:120px;height:75px;object-fit:contain">
  <div class="display" style="font-size:38px;line-height:1.12;text-align:center;color:#8E5E4E;margin-top:28px;text-wrap:pretty">${t.tagline}</div>
</div>
<div style="flex:1"></div>
<div style="display:flex;flex-direction:column;gap:20px">
  <div style="height:54px;border-bottom:1px solid #EFCFC9;display:flex;align-items:center;font-size:16px;color:#8A7470">${t.email}</div>
  <div class="btn">${t.sendCode}</div>
</div>`,

  About: (t) => `
${progress(2)}
<div class="display" style="font-size:32px;line-height:1.15;color:#8E5E4E">${t.aboutTitle}</div>
<div class="muted" style="font-size:15px;margin-top:8px;margin-bottom:40px">${t.aboutHint}</div>
<div class="muted" style="font-size:11px;letter-spacing:.14em;text-transform:uppercase">${t.nameLabel}</div>
<div class="display" style="height:56px;border-bottom:1px solid #8E5E4E;display:flex;align-items:center;font-size:24px;color:#2B1E1B">${t.nameValue}<span style="display:inline-block;width:1px;height:26px;background:#8E5E4E;margin-inline-start:3px"></span></div>
<div class="muted" style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin-top:36px">${t.bdayLabel}</div>
<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:6px">
  ${t.bday.map(([v, label]) => `<div style="display:flex;flex-direction:column;gap:6px"><div class="display" style="font-size:24px;color:#2B1E1B;height:56px;display:flex;align-items:center;border-bottom:1px solid #EFCFC9">${v}</div><div class="muted" style="font-size:12px">${label}</div></div>`).join('\n  ')}
</div>
<div style="flex:1"></div>
<div class="btn">${t.cont}</div>`,

  Goals: (t) => `
${progress(4)}
<div class="display" style="font-size:32px;line-height:1.15;color:#8E5E4E">${t.goalsTitle}</div>
<div class="muted" style="font-size:15px;margin-top:8px;margin-bottom:28px">${t.goalsSub}</div>
<div style="display:flex;flex-direction:column;gap:0">
  ${t.goals.map((g, i) => {
    const on = i === 0 || i === 2;
    return `<div style="display:flex;align-items:center;justify-content:space-between;height:58px;border-bottom:1px solid #EFCFC9;padding:0 4px;${on ? 'color:#8E5E4E;font-weight:500' : ''}"><span style="font-size:16px">${g}</span>${on ? ico.check : '<span style="width:18px;height:18px;border-radius:9px;border:1px solid #EFCFC9;display:block"></span>'}</div>`;
  }).join('\n  ')}
</div>
<div style="flex:1"></div>
<div class="btn">${t.cont}</div>`,

  Calculating: (t) => `
<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0">
  <div style="position:relative;width:200px;height:200px;display:flex;align-items:center;justify-content:center">
    <div style="position:absolute;inset:0;border-radius:50%;border:1px solid #EFCFC9"></div>
    <div style="position:absolute;inset:26px;border-radius:50%;border:1px solid #E3B4B0"></div>
    <div style="position:absolute;inset:52px;border-radius:50%;border:1px solid #B98577;opacity:.6"></div>
    <img src="lotus.png" alt="" style="width:88px;height:55px;object-fit:contain">
  </div>
  <div class="display" style="font-size:26px;color:#8E5E4E;margin-top:40px">${t.calc}</div>
  <div class="muted" style="font-size:14px;margin-top:8px;letter-spacing:.08em">${t.calcName}</div>
</div>`,

  Reveal: (t) => `
<div class="display" style="font-size:30px;line-height:1.15;color:#8E5E4E">${t.revealTitle}</div>
<div style="display:flex;flex-direction:column;align-items:center;margin-top:36px">
  <div class="display gradtext" style="font-size:168px;line-height:1">5</div>
  <div class="muted" style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;margin-top:4px">${t.lifePath}</div>
  <div style="font-size:16px;line-height:1.55;text-align:center;color:#3E2A25;margin-top:18px;text-wrap:pretty">${t.lifeMeaning}</div>
</div>
<div class="hair" style="margin:32px 0 24px"></div>
<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">
  ${t.small.map(([l, n]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px"><div class="display" style="font-size:40px;line-height:1;color:#8E5E4E">${n}</div><div class="muted" style="font-size:11px;text-align:center">${l}</div></div>`).join('\n  ')}
</div>
<div style="flex:1"></div>
<div class="btn">${t.enter}</div>`,

  Home: (t) => `
<div class="display" style="font-size:30px;line-height:1.15;color:#8E5E4E">${t.greet}</div>
<div class="muted" style="font-size:14px;margin-top:6px">${t.pday}</div>
<div style="margin-top:32px;border-radius:24px;background:linear-gradient(180deg,#FFFFFF 0%,#F6E3DF 100%);box-shadow:0 10px 30px rgba(142,94,78,.08);padding:36px 28px 24px;display:flex;flex-direction:column;align-items:center;gap:0">
  <img src="lotus.png" alt="" style="width:56px;height:35px;object-fit:contain;opacity:.9">
  <div class="display" style="font-size:26px;line-height:1.3;text-align:center;color:#8E5E4E;margin-top:24px;text-wrap:pretty">${t.quote}</div>
  <div class="muted" style="font-size:12px;letter-spacing:.06em;margin-top:24px">${t.quoteMeta}</div>
  <div class="btn ghost" style="height:44px;width:140px;margin-top:24px;gap:8px;font-size:14px;font-weight:500">${ico.share}<span>${t.share}</span></div>
</div>
<div style="display:flex;align-items:center;gap:14px;margin-top:28px;padding:16px 0;border-top:1px solid #EFCFC9;border-bottom:1px solid #EFCFC9">
  <img src="eden-avatar.jpg" alt="" style="width:44px;height:44px;border-radius:22px;object-fit:cover">
  <div style="flex:1;display:flex;flex-direction:column;gap:2px"><div style="font-size:16px;font-weight:500;color:#2B1E1B">${t.ask}</div><div class="muted" style="font-size:13px">${t.askSub}</div></div>
  ${ico.chevron(t.dir === 'rtl')}
</div>
${tabbar(t, 0)}`,

  Chat: (t) => `
<div style="display:flex;align-items:center;gap:12px;margin:-24px -4px 0;padding-bottom:16px;border-bottom:1px solid #EFCFC9">
  <img src="eden-avatar.jpg" alt="" style="width:40px;height:40px;border-radius:20px;object-fit:cover">
  <div style="display:flex;flex-direction:column;gap:1px"><div class="display" style="font-size:22px;color:#8E5E4E;line-height:1">${t.chatName}</div><div class="muted" style="font-size:12px">${t.chatSub}</div></div>
</div>
<div style="flex:1;display:flex;flex-direction:column;gap:22px;padding-top:28px">
  <div style="font-size:16px;line-height:1.6;color:#2B1E1B;max-width:300px;text-wrap:pretty">${t.m1}</div>
  <div style="align-self:flex-end;max-width:280px;background:#F6E3DF;border-radius:20px;padding:12px 16px;font-size:16px;line-height:1.55;color:#3E2A25;text-wrap:pretty">${t.u1}</div>
  <div style="font-size:16px;line-height:1.6;color:#2B1E1B;max-width:310px;text-wrap:pretty">${t.m2}</div>
</div>
<div style="display:flex;align-items:center;gap:10px;margin-bottom:64px">
  <div style="flex:1;height:52px;border-radius:26px;border:1px solid #EFCFC9;background:#fff;display:flex;align-items:center;padding:0 18px;font-size:15px;color:#8A7470">${t.composer}</div>
  <div style="width:52px;height:52px;border-radius:26px;background:#8E5E4E;display:flex;align-items:center;justify-content:center">${ico.send}</div>
</div>
${tabbar(t, 1)}`,
};

const order = ['SignIn', 'About', 'Goals', 'Calculating', 'Reveal', 'Home', 'Chat'];
const artboards = [];
for (const [li, lang] of [['en', 'en'], ['he', 'he']]) {
  order.forEach((name, i) => {
    const file = lang === 'en' && name === 'Home' ? 'Main.dc.html' : `${name}${lang === 'he' ? 'HE' : ''}.dc.html`;
    writeFileSync(file, wrap(T[lang], screens[name](T[lang])));
    artboards.push({ file, title: `${name === 'SignIn' ? 'Welcome' : name} · ${lang.toUpperCase()}`, x: 60 + i * 480, y: 0, w: 390, h: 844, page: lang });
  });
}
writeFileSync('canvas.json', JSON.stringify({
  pages: [{ id: 'en', name: 'English' }, { id: 'he', name: 'Hebrew (RTL)' }],
  artboards,
  annotations: [{ id: 'direction', x: 60, y: -200, w: 520, page: 'en', text: 'Gan Eden — quiet luxury direction\nCream #FFF7F4 · rose-gold #8E5E4E→#E3B4B0 · display serif (Cormorant / Frank Ruhl Libre) · body Heebo\nPage 1 English, page 2 Hebrew (RTL) — switch from the pages menu. Real status bar / keyboard are not drawn.' }],
  launch: { view: 'canvas', page: 'en' },
}, null, 2));
console.log('wrote', artboards.length, 'artboards');
