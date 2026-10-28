/* alio-about.js — About, Privacy Policy, Terms of Use and Community Guidelines pages.
   Loaded automatically by index.html the first time someone opens one of these pages (with the Alio loading screen).
   Keep this file in the same folder as index.html. */
const LEGAL_UPDATED='24 October 2026';
const LEGAL_PAGES=[
  {id:'about',label:'About',icon:'ℹ️'},
  {id:'privacy',label:'Privacy Policy',icon:'🔒'},
  {id:'terms',label:'Terms of Use',icon:'📜'},
  {id:'guidelines',label:'Community Guidelines',icon:'🛡️'}
];
function legalMail(){ return "<a href='mailto:"+EMAIL+"'>"+EMAIL+"</a>"; }
function legalTabsHTML(active){
  return "<div class='legal-tabs'>"+LEGAL_PAGES.map(function(p){
    return "<button class='btn "+(p.id===active?'btn-primary':'btn-ghost')+" legal-tab' onclick=\"go('"+p.id+"')\">"+p.icon+" "+p.label+"</button>";
  }).join('')+"</div>";
}
function legalFooterLinks(){
  return "<span class='legal-footer-links'>"
    +"<a onclick=\"go('about')\">About</a> · <a onclick=\"go('privacy')\">Privacy Policy</a> · <a onclick=\"go('terms')\">Terms of Use</a> · <a onclick=\"go('guidelines')\">Community Guidelines</a>"
    +"</span>";
}
function legalJump(id){
  var el=document.getElementById('lg-'+id);
  if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
}
/* Shared layout for Privacy / Terms / Guidelines */
function legalShell(active,title,intro,glance,sections){
  var toc=sections.map(function(s,i){
    return "<button class='legal-toc-item' onclick=\"legalJump('"+s.id+"')\"><span>"+(i+1)+".</span> "+s.title+"</button>";
  }).join('');
  var body=sections.map(function(s,i){
    return "<div class='about-card legal-sec' id='lg-"+s.id+"'><h3>"+(i+1)+". "+s.title+"</h3>"+s.body+"</div>";
  }).join('');
  appEl.innerHTML=
    "<section class='about-hero'><div class='section-label'>"+LEGAL_PAGES.filter(function(p){return p.id===active;})[0].icon+" Legal</div>"
    +"<h2 class='section-title'>"+title+"</h2>"
    +"<p class='legal-meta'>Last updated: "+LEGAL_UPDATED+"</p>"
    +legalTabsHTML(active)+"</section>"
    +"<div class='about-block'>"
    +"<div class='about-card'><p>"+intro+"</p></div>"
    +(glance?"<div class='about-card legal-glance'><h3>At a glance</h3>"+glance+"</div>":"")
    +"<div class='about-card'><h3>Contents</h3><div class='legal-toc'>"+toc+"</div></div>"
    +body
    +"<div class='about-card'><h3>Questions?</h3><p>Email "+legalMail()+" and we will get back to you. Alio is a one-person project, so replies can take a little time.</p>"
    +"<div class='about-links-row'><button class='btn btn-secondary' onclick=\"go('home')\">← Back to Home</button></div></div>"
    +"</div>";
}

/* ───────────────────────── ABOUT ───────────────────────── */
// Explains the badge system to users. Badge names and descriptions are read live, so
// anything the admin edits in Admin → Badges shows up here automatically.
function aboutBadgesHTML(){
  try{ if(typeof ksStartBadgeTypes==='function') ksStartBadgeTypes(); }catch(e){}
  var rows='';
  try{
    rows=KS_BADGE_TYPE_DEFS.map(function(x){
      var t=ksBadgeType(x.id);
      return '<li style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px"><span style="width:22px;height:22px;flex:none;display:inline-flex;margin-top:1px">'+ksBadgeSVG(t.color,t.tick).replace('<svg','<svg style="width:22px;height:22px"')+'</span><span><strong>'+escapeHTML(t.name)+'</strong> — '+escapeHTML(t.text)+'</span></li>';
    }).join('');
  }catch(e){ rows=''; }
  var blue='<span style="width:22px;height:22px;flex:none;display:inline-flex;margin-top:1px">'+ksOfficialBadgeSVG().replace('<svg','<svg style="width:22px;height:22px"')+'</span>';
  return "<div class='about-card'>"
    +"<h3>Badges</h3>"
    +"<p>Badges are small marks that appear next to a name in the Community, on profiles, on leaderboards and in Messages. They help you recognise who is who. Badges cannot be switched on by users themselves. All badges, including Verified, are given, changed and removed only by the Alio team. The Team, Helper, Contributor and Trusted badges are for people who are part of Alio's work or community in some way, while Verified simply shows that an account has been verified by Alio.</p>"
    +"<ul style='list-style:none;padding-left:0'>"
    +"<li style='display:flex;gap:10px;align-items:flex-start;margin-bottom:8px'>"+blue+"<span><strong>Official Alio</strong> — the special metallic gold badge with a soft glow. It belongs only to the official Alio account, and messages and posts from it are written by the Alio team.</span></li>"
    +rows
    +"</ul>"
    +"<p><strong>About the Verified badge.</strong> The blue Verified badge is an official Alio badge that the Alio team gives to accounts it has verified. Unlike the Team, Helper, Contributor and Trusted badges, it does not make the person part of the Alio team or brand: a verified account is a regular user. It does not mean the account speaks for or is endorsed by Alio or KS Tech, and Alio makes no promise about a verified account or what it posts. How an account can get this badge may change in the future.</p>"
    +"<p><strong>Think you deserve one of Alio's own badges?</strong> If you believe your work or contribution to Alio deserves a certain type of badge, contact the KS Tech team at <a href='mailto:"+EMAIL+"'>"+EMAIL+"</a> and explain why. The team will review your request. A request is not a guarantee, and every decision is made by the team.</p>"
    +"<p><strong>Tap any badge</strong> to see what it means, along with a personal note from the team if one was added.</p>"
    +"<p><strong>If you receive or lose a badge,</strong> the Alio team may send you a short message in <strong>Messages</strong> from the official Alio account to let you know. You can reply in that chat if you have a question.</p>"
    +"</div>";
}
function renderAbout(){
  appEl.innerHTML=`
  <section class='about-hero'>
    <div class='section-label'>ℹ️ About</div>
    <h2 class='section-title'>About Alio</h2>
    ${legalTabsHTML('about')}
  </section>
  <div class='about-block'>

    <div class='about-card'>
      <h3>What Alio is</h3>
      <p>Alio is a free collection of everyday tools in one place, a product of KS Tech. It is made for people who want quick, clean tools that simply work — without ads, pop-ups or being tracked.</p>
      <ul>
        <li><strong>Apps</strong> — calculators, converters, text and date tools, timers and other utilities.</li>
        <li><strong>Games</strong> — simple games you can play in your browser, including Chess (against a bot or a friend online), Hatchlings and Card Quest, whose progress is saved to your account when you are signed in.</li>
        <li><strong>Health Hub</strong> — breathing, heart-rate, hydration and similar helper tools for general wellbeing information.</li>
        <li><strong>Fun</strong> — curiosity tools such as your age on Mars or your weight on other planets.</li>
        <li><strong>Science Solver &amp; Alio Assistant</strong> — optional AI helpers (see below).</li>
        <li><strong>PDF Toolkit</strong> — merge, split, compress and edit PDFs directly in your browser.</li>
        <li><strong>Notes &amp; To-do, QR &amp; Barcode, Device Check, Life Stats and Leaderboard</strong> — extra everyday tools, personal stats and game rankings.</li>
        <li><strong>Also from KS Tech:</strong> SoftBooks, another app made by the same owner.</li>
        <li><strong>Community, Messages &amp; Notifications</strong> — an optional social area that needs a free account. Every Community post carries a flair (a topic label that Alio can suggest for you), chats support emoji reactions, and an in-app Notifications tab keeps you up to date. A small green dot can show when someone is online; you can switch it off in Settings → Privacy &amp; Profile.</li>
      </ul>
    </div>

    <div class='about-card'>
      <h3>Who is behind it</h3>
      <p>Alio is a product of KS Tech, an independent project created, owned and run by <strong class='ks-builder-link' onclick='builderAsk()'>Kiran Sankar</strong> (referred to in our policies as "the Owner", "we" or "us"). It is built and maintained by one person, with the assistance of AI tools along the way.</p>
      <p>Because it is a one-person project, new features arrive in updates, things can occasionally break, and replies to emails can take time. We would rather be upfront about that than pretend to be a large company.</p>
      <div class='about-links-row'>
        <button class='btn btn-primary' onclick="window.open(IG,'_blank')">📸 Official Instagram</button>
        <button class='btn btn-secondary' onclick="window.open('https://whatsapp.com/channel/0029Vb9kG4R4SpkHOizNRB22','_blank')">💬 WhatsApp channel</button>
        <button class='btn btn-secondary' onclick="window.open(IG_PERSONAL,'_blank')">👤 Personal Instagram</button>
        <a class='btn btn-ghost' href='mailto:${EMAIL}'>✉️ Email</a>
      </div>
    </div>

    <div class='about-card'>
      <h3>Do I need an account?</h3>
      <p>It depends on what you want to do:</p>
      <ul>
        <li><strong>No account needed:</strong> calculators and converters, text and date tools, games, health tools, fun tools, the PDF Toolkit, the Science Solver and Alio Assistant, and sending feedback.</li>
        <li><strong>Free account needed:</strong> the Community (posting, replying, reacting), Messages (including emoji reactions), Notifications, usernames, leaderboards and follows, the online status dot, privacy and profile settings, saving your game progress, and saving your settings and preferences to your account so they follow you to other devices.</li>
      </ul>
      <p><strong>How sign-up works:</strong> tap Sign In / Sign Up, then either continue with Google or enter your name, email and a password. Once signed in you can add a profile picture, choose a username, and manage or delete your account from Settings → Account. Signing in again on another device brings your saved settings with you.</p>
    </div>

    ${aboutBadgesHTML()}

    <div class='about-card'>
      <h3>Our principles</h3>
      <ul>
        <li><strong>No ads.</strong> Alio does not show advertising.</li>
        <li><strong>No selling of your data.</strong> We do not sell or rent your personal information to anyone.</li>
        <li><strong>No advertising or third-party tracking.</strong> We do not use advertising cookies, tracking pixels or third-party analytics. Alio only counts <strong>visits</strong> in its own database (no IP address; guests stay anonymous, and if you are signed in the record includes your account ID), so we can see how many people use it and which tools are used most and least. You can turn this off in the Privacy Policy, and it is off automatically if your browser sends a Do Not Track signal.</li>
        <li><strong>Your device first.</strong> Calculators, health tools, games and PDF tools work inside your own browser. What you type into them is not sent to us.</li>
        <li><strong>Accounts only where needed.</strong> You do not need an account to use the tools, games, health and PDF features. You need a free account for the Community, Messages, Notifications, leaderboards and follows, privacy and profile settings, and for saving your settings to your account. Notes &amp; To-do do not need an account: they work without one and stay only in your browser (see "Do I need an account?" below).</li>
        <li><strong>Clear rules.</strong> Our policies are written in plain language and kept up to date. If something changes, we update the date at the top of the page.</li>
      </ul>
    </div>

    <div class='about-card'>
      <h3>How it is built and hosted</h3>
      <p>Alio is a web app that can also be installed on your phone or computer from your browser. The installed app is the same website with the same rules and privacy practices.</p>
      <ul>
        <li><strong>Hosting:</strong> GitHub Pages.</li>
        <li><strong>Accounts and community data:</strong> Google Firebase (Authentication and Cloud Firestore).</li>
        <li><strong>AI features:</strong> Google's Gemini API.</li><li><strong>Leaderboards, follows and privacy:</strong> if you are signed in, your username, game scores and points, saved game progress, follow connections and online status are stored in Cloud Firestore. Leaderboard entries (which show your picture) are public; you can hide yourself, make your profile private or switch off the online dot in Settings → Privacy &amp; Profile.</li>
        <li><strong>Feedback form:</strong> the FormSubmit email relay service.</li>
        <li><strong>Fonts and PDF library:</strong> Google Fonts and Cloudflare's cdnjs.</li>
      </ul>
      <p>The <a onclick="go('privacy')">Privacy Policy</a> explains exactly what each of these receives.</p>
    </div>

    <div class='about-card'>
      <h3>About the AI features</h3>
      <p>The Science Solver and the Alio Assistant button are optional and use a third-party AI service. AI can be wrong, so always double-check important answers. They may occasionally be unavailable. You can switch the assistant button off in Settings.</p>
    </div>

    <div class='about-card'>
      <h3>Getting around</h3>
      <ul>
        <li>Tap the ⚙️ <strong>Settings</strong> icon to change theme, colours, text size and other options, manage your account, or send feedback.</li>
        <li>Use the 🔍 search icon to find any tool, setting or page quickly.</li>
        <li>Found a bug or want a new tool? Use the feedback box in Settings, or email us.</li>
      </ul>
    </div>

    <div class='about-card'>
      <h3>Legal information</h3>
      <p>Everything you need to know about how Alio handles your information and what the rules are:</p>
      <div class='about-links-row'>
        <button class='btn btn-secondary' onclick="go('privacy')">🔒 Privacy Policy</button>
        <button class='btn btn-secondary' onclick="go('terms')">📜 Terms of Use</button>
        <button class='btn btn-secondary' onclick="go('guidelines')">🛡️ Community Guidelines</button>
      </div>
    </div>

    <div class='about-card'>
      <h3>Credits and licences</h3>
      <p>Hatchlings uses free-to-use pixel creature sprites from the "Monsters Creatures Fantasy" pack and painted egg artwork from the "eggz" pack. Both are used under the free licences that came with each pack, and credit goes to their original creators. The painted illustrations signed "quartxio" belong to their artist. Card Quest uses character tiles from Tiny Dungeon by Kenney (kenney.nl, CC0), and its enemies also reuse the creature sprites above. Everything else in these games is drawn in code for Alio.</p>
    </div>

    <div class='about-card'>
      <h3>Contact</h3>
      <p>General questions, feedback, privacy requests, reports and appeals all go to one address: <a href='mailto:${EMAIL}'>${EMAIL}</a>. Please write from the email address linked to your account if your message is about your account.</p>
    </div>

  </div>`;
}

/* ───────────────────────── PRIVACY POLICY ───────────────────────── */
function renderPrivacy(){
  var glance="<ul>"
    +"<li>Most tools run <strong>entirely in your browser</strong>. What you type into calculators, health tools, games and PDF tools is not sent to us.</li>"
    +"<li>You do <strong>not</strong> need an account for the tools. An account is needed only for the Community, Messages, leaderboards, follows, saved game progress and syncing settings. If you create one, we store your email, name, profile picture and settings, plus anything you choose to post or send.</li>"
    +"<li>We have <strong>no ads, no advertising cookies and no third-party analytics</strong>. We only count <strong>visits</strong> (section 2), which you can switch off, and we <strong>never sell</strong> your data.</li>"
    +"<li>Some features rely on <strong>trusted third parties</strong> (Google Firebase, Google Gemini, GitHub Pages, FormSubmit). This page lists exactly what each one receives.</li>"
    +"<li>If you have an account, a small <strong>green dot</strong> can show other signed-in users that you are online. You can switch it off in Settings → Privacy &amp; Profile.</li>"
    +"<li>Messages are <strong>not end-to-end encrypted</strong>. Do not share passwords, bank details or other highly sensitive information in a chat.</li>"
    +"<li>You can <strong>delete your account</strong> in Settings, or email us to remove anything left over.</li>"
    +"</ul>";
  var S=[];

  S.push({id:'who',title:'Who we are and what this covers',body:
    "<p>Alio, a product of KS Tech, is operated by <strong>Kiran Sankar</strong> (the \"Owner\", \"we\", \"us\"). For the purposes of data-protection laws, we are the controller of the personal information described in this policy.</p>"
    +"<p>This policy applies to the Alio website, the installed (PWA) version of the app, and the features inside it. It does not cover other websites we link to, such as Instagram or the separate services listed under Other Services, which have their own policies.</p>"
    +"<p>Contact for anything privacy-related: "+legalMail()+".</p>"});

  S.push({id:'noaccount',title:'Using Alio without an account',body:
    "<p>You can use most of Alio without signing up. In that case:</p>"
    +"<ul>"
    +"<li><strong>Tools run in your browser.</strong> Calculators, converters, text tools, timers, games, health tools and the PDF Toolkit process what you enter on your own device. Your numbers, text, dates, health entries and PDF files are not uploaded to us. The Cycle Tracker, for example, keeps its data only in your open browser tab and it disappears when you refresh.</li>"
    +"<li><strong>We do not know who you are.</strong> We do not ask for your name or email, and we do not build a profile of you.</li>"
    +"<li><strong>Technical data is handled by our hosts.</strong> Like every website, the servers that deliver Alio to you (see section 7) receive standard technical information such as your IP address, browser type and the time of the request. We do not use it to identify you.</li>"
    +"<li><strong>Feedback.</strong> If you send feedback without an account, only the message you write is sent (see section 7).</li>"
        +"<li><strong>Visit counting.</strong> To see how many people use Alio and where visitors come from (for example a social media post), we save a small record in our own database (Google Firestore), at most one per day for each visitor. It contains: a random visitor ID made up on your device, the date, which sections of the app you opened and how many times, the website you came from (if any), your device type (phone, tablet or computer), your browser name and language, your time zone (a rough sign of your region), and whether you were using the installed app. <strong>If you are not signed in, the record is anonymous</strong> and is not linked to you. <strong>If you are signed in, the record also includes your account ID</strong>, so the Owner can see which account a visit belongs to, and can connect the visits made from your device to your account (including earlier visits from the same device made before you signed in). The Owner can then see the name and email address already on your account, as for any account. The Owner uses these records only to understand how Alio is used (for example which tools are opened most and least, and busy times) and to look after signed-in accounts. The record does <strong>not</strong> contain your IP address, exact location, anything you type into a tool, or anything you write in the Community or Messages. We do not use it for advertising, we do not share it, and we do not use it to follow you on other sites. Only the Owner can see it, and records are deleted after about 90 days (the Owner's dashboard clears older records automatically). The random ID is kept in your browser's local storage so we can tell new visitors from returning ones. You can switch counting off at any time (see below), which also removes the ID from your device, and it is off automatically if your browser sends a Do Not Track signal. Admins are not counted.</li>"
    +"<li><strong>Your choice.</strong> Counting is switched off automatically if your browser sends a Do Not Track or Global Privacy Control signal. You can also switch it off or on yourself with the button below. Switching it off stops the counting and removes the random ID from your device.</li>"
    +"</ul>"
    +(typeof ksStatsUI==='function'?ksStatsUI():"")});

  S.push({id:'collect',title:'Information we collect when you have an account',body:
    "<p>You only need an account for the Community, Messages, leaderboards, follows, saved game progress and syncing your settings. If you create one, the following is stored in Google Cloud Firestore and Firebase Authentication:</p>"
    +"<h4>Account information</h4>"
    +"<ul>"
    +"<li>Your <strong>email address</strong> and <strong>display name</strong>, and an optional <strong>profile picture</strong>.</li>"
    +"<li>If you sign in with Google, we receive your name, email address and profile picture from Google.</li>"
    +"<li>If you sign in with email and password, your password is handled by Firebase Authentication. <strong>We never see or store your password.</strong></li>"
    +"<li>A unique account ID (UID) created by Firebase.</li>"
    +"</ul>"
    +"<h4>Settings</h4>"
    +"<ul><li>Your display preferences (such as theme, colours, text size, layout and assistant-button position) and the last section you visited, so they follow you across devices.</li></ul>"
    +"<h4>Sign-out of other devices</h4>"
    +"<ul><li>If you use <em>Log out of all other devices</em>, the time you did so is saved on your account so your other devices know to sign out.</li></ul>"
    +"<h4>Public profile</h4>"
    +"<ul><li>Your display name, profile picture and optional username are stored in a public profile so Community posts always show your current details. When you choose a profile picture, you can crop, zoom and rotate it on your device first; only the final small picture is saved, never the original photo.</li></ul>"
    +"<h4>Community</h4>"
    +"<ul><li>Posts, replies, reactions, and edits you make, together with the time they were created.</li><li>Every post carries a <strong>flair</strong> (a topic label such as Games or Introduction). You can choose it yourself, or Alio can suggest one from the words in your post. That suggestion is worked out on your own device; your text is not sent anywhere else for it.</li></ul>"
    +"<h4>Game points, leaderboards and follows</h4>"
    +"<ul>"
    +"<li>Your best result in each game and the points it earns, so leaderboards can rank you. Leaderboard entries show your username, display name and picture and are public, unless you choose to hide yourself in Settings → Privacy &amp; Profile.</li>"
    +"<li>Which QUANTUM RUSH characters you have unlocked with coins and which one you picked, so they follow your account. This is not shown on leaderboards.</li>"
    +"<li>Your <strong>progress in Hatchlings and Card Quest</strong> (for example creatures, habitats, decks and unlocks, saved as a small block of game data) and how many coins you have spent in the games. Coins are your game points, and one balance is shared across Quantum Rush, Hatchlings and Card Quest. This is not shown to other users.</li>"
    +"<li>If you play <strong>Chess against a friend</strong>: the game code, both players\' account IDs and display names, the moves, the clock and any draw or rematch request, so the two of you can play. Only the two players can read the game. Your count of wins against the Chess bot is kept on your device and your Chess leaderboard points are stored with your other game points.</li>"
    +"<li>Whether you are online right now: a time stamp refreshed about once a minute while Alio is open on your screen, and removed when you leave or hide the app. If your phone or browser closes Alio before it can be removed, the last time stamp may stay stored until you next open Alio or delete your account, and other people stop seeing the dot after a couple of minutes anyway. Other signed-in users see this as a green dot on your picture unless you switch it off in Settings → Privacy &amp; Profile. If you switch it off, your time stamp is kept in a separate record that only administrators can read, so administrators can still see whether you are online.</li>"
    +"<li>Who you follow, who follows you, and any follow requests (if your profile is private). A private profile shows your posts only to approved followers.</li>"
    +"</ul>"
    +"<h4>Messages</h4>"
    +"<ul>"
    +"<li><strong>Official messages</strong> between you and the Alio team, and whether a chat has been opened or muted.</li>"
    +"<li><strong>User-to-user chats:</strong> the messages, the chat status (request, accepted, declined), block status, read markers, and the emoji reactions people add to messages (one emoji per person per message, visible to the people in that chat).</li>"
    +"<li>When the team sends the same message to many users at once, each person receives it as a normal official message in their own inbox.</li>"
    +"</ul>"
    +"<h4>Notifications</h4>"
    +"<ul><li>Your in-app Notifications tab is built from information already described above: follow requests and new followers, Community posts from people you follow, replies to your posts and comments, official messages sent to your inbox, announcements, and notifications the team sends to all registered users. Team notifications are stored once and can be read by any signed-in user. We do not store which notifications you have read or deleted on our servers; that is kept only on your device.</li></ul>"
    +"<h4>Safety and moderation</h4>"
    +"<ul>"
    +"<li><strong>Reports</strong> you submit: the reason, any details you write, and, if you choose, up to the last 15 messages of the chat you are reporting.</li>"
    +"<li><strong>Warnings, suspensions and bans</strong> applied to an account: account ID, email address, reason, type, dates, and a log of the action taken.</li>"
    +"</ul>"
    +"<h4>PDF Toolkit history</h4>"
    +"<ul><li>When you are signed in and merge PDFs, we store only the <strong>file names and page count</strong> of the merge. Your PDF files themselves are never uploaded.</li></ul>"
    +"<h4>What we do not collect</h4>"
    +"<ul><li>We do not collect your precise location, contacts, phone number, payment details, or government ID, and we do not ask for them.</li></ul>"});

  S.push({id:'device',title:'Information stored on your device',body:
    "<p>Alio saves some things in your browser's local storage so the app feels consistent. This stays on your device unless stated otherwise:</p>"
    +"<ul>"
    +"<li>Display preferences (theme, colours, text size, layout, simple mode and similar options).</li>"
    +"<li>A random visitor ID used for visit counting (see section 2). On its own it is not linked to you, but if you are signed in the Owner can connect it to your account. You can switch it off.</li>"
    +"<li>Your favourite and recently used tools, and recent searches.</li>"
    +"<li>Handwriting Maker drawings and typing history.</li>"
    +"<li>Notes &amp; To-do: your notes, note folders, recycled notes, tasks and view settings are saved only in this browser's local storage. They are not uploaded, not synced to your account or the cloud, and not available on other devices. Clearing site data deletes them; the Backup button exports a file you keep yourself.</li>"
    +"<li>Customisation settings, dismissed announcements, the time you last opened Notifications, which notifications you swiped away or deleted, and sidebar state.</li>"
    +"<li>If you use more than one account, a short list of the accounts saved on this device (each one's name and email, up to six) so you can switch between them. Each saved account's sign-in is kept in your browser's storage by Firebase Authentication.</li>"
    +"<li>An offline copy of the app so the installed version can open quickly (service worker cache).</li>"
    +"</ul>"
    +"<p><strong>Cookies.</strong> Alio does not set advertising or tracking cookies. Visit counting uses local storage, not a cookie (see section 2). Firebase Authentication uses your browser's storage to keep you signed in. If you are signed in, display preferences are also synced to your account.</p>"
    +"<p><strong>Your control.</strong> You can clear this data at any time through your browser's site-data settings. Logging out of an account removes it from the saved accounts list on this device, but does not clear other data stored on the device.</p>"});

  S.push({id:'use',title:'How we use your information and why',body:
    "<p>We use your information only to run Alio:</p>"
    +"<ul>"
    +"<li>to create and secure your account and sync your settings (needed to provide the service you asked for);</li>"
    +"<li>to show your profile, posts and messages to the people they are meant for;</li>"
    +"<li>to keep the community safe: handling reports, issuing warnings, suspending or banning accounts, and preventing repeat abuse (our legitimate interest in running a safe service);</li>"
    +"<li>to reply to your emails, feedback and requests;</li>"
    +"<li>to count visits (anonymous for guests, linked to the account ID when signed in) and understand how many people use Alio and which parts they use (our legitimate interest in improving the service; you can switch this off);</li>"
    +"<li>to protect the security of the service and to meet legal obligations.</li>"
    +"</ul>"
    +"<p>We do <strong>not</strong> use your information for advertising, profiling, or automated decisions with legal effect, and we do not sell it.</p>"
    +"<p>Where the law requires a legal basis (for example under the GDPR), we rely on: <em>contract</em> (providing the account features), <em>legitimate interests</em> (security, moderation, preventing abuse and anonymous usage statistics), <em>consent</em> (optional features such as a profile picture or sending a report with messages), and <em>legal obligation</em>. Where Indian law relies on your consent, we ask for it when you create an account or use an optional feature. You can withdraw consent at any time by removing the content or deleting your account.</p>"});

  S.push({id:'see',title:'Who can see your information',body:
    "<ul>"
    +"<li><strong>Everyone, including people who are not signed in:</strong> your display name, username, profile picture, Community posts, replies and reactions (posts on a private profile are shown only to approved followers), and your leaderboard entries unless you have hidden yourself.</li>"
    +"<li><strong>Other signed-in users:</strong> can find you in Messages only by typing your exact username. There is no public list of users. Other signed-in users can also see a green dot on your picture while you are online, unless you have switched it off.</li>"
    +"<li><strong>People you message:</strong> the messages you send them.</li>"
    +"<li><strong>Alio administrators</strong> (the Owner and any administrators the Owner appoints): your email address, display name, profile picture, account ID and synced settings; official messages; reports and any messages you attach to them; warnings, bans and the moderation log; your PDF merge history (file names and page counts); your online status (even if you switched the green dot off); and your saved game progress. Administrators <strong>cannot browse private user-to-user chats</strong>; they only see messages a participant chooses to include in a report.</li>"
    +"<li><strong>Our service providers</strong> (section 7), only as needed to deliver the service.</li>"
    +"<li><strong>Authorities</strong>, if we are legally required to disclose information, or where needed to protect the safety of users or the site.</li>"
    +"</ul>"
    +"<p>Your email address and settings are never shown to other users.</p>"
    +"<p><strong>Messages are not end-to-end encrypted.</strong> They are stored on Google's servers in readable form and protected in transit (HTTPS) and at rest by Google. Security rules only let the two people in a chat open it, but the Owner, as administrator of the Firebase project, and Google, as the host, may technically be able to access stored data. Never share passwords, card or bank details, ID numbers or other highly sensitive information in a chat.</p>"});

  S.push({id:'third',title:'Third-party services we use',body:
    "<p>Alio relies on the following services. Each receives only what is needed for its job, and each has its own privacy policy.</p>"
    +"<h4>Google Firebase (Authentication and Cloud Firestore)</h4>"
    +"<p>Stores and secures account, community, message and moderation data, and handles sign-in (including optional Google Sign-In). <a href='https://firebase.google.com/support/privacy' target='_blank' rel='noopener'>Firebase privacy information</a></p>"
    +"<h4>GitHub Pages</h4>"
    +"<p>Hosts the website. As the web host, GitHub receives standard request data such as your IP address. <a href='https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement' target='_blank' rel='noopener'>GitHub privacy statement</a></p>"
    +"<h4>Google Gemini API (AI features)</h4>"
    +"<p>When you use the Science Solver or the Alio Assistant, the text you type (and, for the assistant, a short portion of the recent conversation) is sent to Google's Gemini API to generate a reply. We do not attach your name, email or account ID to these requests. Google may process and retain this content under its own terms, so <strong>do not enter personal, confidential or sensitive information</strong> into AI features. <a href='https://policies.google.com/privacy' target='_blank' rel='noopener'>Google Privacy Policy</a></p>"
    +"<h4>FormSubmit (feedback form)</h4>"
    +"<p>When you send feedback from the app, your message is passed through the FormSubmit email-relay service to our inbox. Only the text you write is sent, but FormSubmit, like any service, can see technical data such as your IP address. Do not put sensitive information in feedback.</p>"
    +"<h4>Google Fonts</h4>"
    +"<p>The fonts used by the site are loaded from Google's servers, which receive your IP address when they are fetched.</p>"
    +"<h4>Cloudflare cdnjs</h4>"
    +"<p>The library that powers the PDF Toolkit is loaded from Cloudflare's cdnjs network, which receives your IP address when it is fetched. Your PDF files are not sent there. <a href='https://www.cloudflare.com/privacypolicy/' target='_blank' rel='noopener'>Cloudflare privacy policy</a></p>"
    +"<h4>YouTube</h4>"
    +"<p>If a tutorial video is shown in a help box, it is loaded from YouTube, which may collect data under Google's policy once the video loads.</p>"
    +"<h4>Instagram, WhatsApp and other links</h4>"
    +"<p>Buttons that open Instagram, the KS Tech WhatsApp channel or other websites take you out of Alio. We do not send those services any of your Alio account information. Once you open or join them, their own terms and privacy policies apply to you.</p>"});

  S.push({id:'keep',title:'How long we keep information',body:
    "<ul>"
    +"<li><strong>Account and profile data:</strong> for as long as your account exists.</li>"
    +"<li><strong>Posts, replies and messages:</strong> until you or an administrator deletes them (see section 9 for what happens when an account is deleted).</li>"
    +"<li><strong>Reports and moderation records:</strong> only as long as reasonably needed to handle them and to prevent repeat abuse.</li>"
    +"<li><strong>Ban records</strong> (account ID, email address, reason, dates): while the ban is in force, and afterwards for a reasonable period to stop evasion.</li>"
    +"<li><strong>Visit records:</strong> up to 90 days, then deleted.</li>"
    +"<li><strong>PDF merge history:</strong> until you or an administrator deletes it.</li>"
    +"<li><strong>Online status:</strong> removed when you leave Alio. If that cannot happen, the last time stamp stays until you next open Alio or delete your account.</li>"
    +"<li><strong>Game scores and saved game progress:</strong> for as long as your account exists, unless you ask us to erase them.</li>"
    +"<li><strong>Chess friend matches:</strong> the game code, both players\' account IDs and display names, the moves and the clock are stored in Firestore while the match is open and are removed automatically about a week after it was created.</li>"
    +"<li><strong>Feedback emails:</strong> in the Owner's mailbox until no longer needed.</li>"
    +"<li><strong>Backups:</strong> Google may keep short-lived backup copies of deleted data for a limited time before they are permanently removed.</li>"
    +"</ul>"});

  S.push({id:'delete',title:'Deleting your account and your choices',body:
    "<p>You are in control of your information:</p>"
    +"<ul>"
    +"<li><strong>Edit:</strong> change your name, picture and username from Settings → Account.</li>"
    +"<li><strong>Delete posts and messages:</strong> you can delete your own Community posts and replies. In user-to-user chats you can delete any message just for yourself, or delete your own messages for everyone, at any time.</li>"
    +"<li><strong>Delete your account:</strong> use <em>Delete My Account</em> in Settings → Account.</li>"
    +"</ul>"
    +"<p><strong>What account deletion removes automatically:</strong> your sign-in account, your private profile (email, settings, picture), your public profile, your username and your online status.</p>"
    +"<p><strong>What it does not remove automatically:</strong> Community posts and replies you wrote, official messages, copies of user-to-user chats held by the other person, PDF merge history, game scores and saved game progress, follows, and any warning, report or ban records. To avoid anything staying behind, delete your posts and replies <em>before</em> deleting your account. Or simply email "+legalMail()+" and ask us to erase what remains. We will do so within 30 days, except for records we must keep to enforce a ban or comply with the law.</p>"
    +"<p>Uninstalling the app or clearing your browser data does not delete your account or the data stored with it.</p>"});

  S.push({id:'rights',title:'Your rights',body:
    "<p>Alio is run from India. We follow the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023, and we also honour comparable rights under laws such as the EU/UK GDPR and the California CCPA where they apply to you. For everyone, where reasonably possible, you can ask:</p>"
    +"<ul>"
    +"<li>to know what we hold about you and get a copy;</li>"
    +"<li>to correct inaccurate information;</li>"
    +"<li>to have your information deleted;</li>"
    +"<li>to restrict or object to certain uses, and to withdraw consent;</li>"
    +"<li>to receive your information in a portable format;</li>"
    +"<li>to raise a grievance with us, or to complain to the Data Protection Board of India or your local data-protection authority.</li>"
    +"</ul>"
    +"<p>To make a request, email "+legalMail()+" from the address linked to your account so we can verify it is you. We do not charge for this. <strong>Grievance contact:</strong> Kiran Sankar, "+legalMail()+". We aim to acknowledge requests and complaints within 7 days and to resolve them within 30 days. We do not sell or share personal information for advertising.</p>"});

  S.push({id:'children',title:"Children and age",body:
    "<p><strong>Anyone can use the tools.</strong> The calculators, games, health tools, fun tools and PDF tools need no account, so there is no age limit for using them, and Alio is meant to be safe for all ages.</p>"
    +"<p><strong>Accounts, Community and Messages.</strong> These let people interact with others, so they are meant for people who are mature enough to use them responsibly. In India a person under 18 is legally a minor. If you are under 18, you may create an account only with the knowledge and permission of a parent or legal guardian, who is responsible for your use of Alio.</p>"
    +"<p>We do not show advertising or build profiles of any user, including children. The visit counts (section 2) hold no IP address and are never used for advertising or profiling. We do not knowingly keep an account created by a minor without a parent's or guardian's permission. A parent or guardian can email "+legalMail()+" at any time to ask for a child's account and data to be corrected or removed, and we will act on it. If we learn that an account was made without the required permission, we may delete it.</p>"});

  S.push({id:'security',title:'Security',body:
    "<p>We take reasonable steps to protect your information: data is sent over HTTPS, Firebase security rules control who can read or change each record, administrator access is restricted, and passwords are handled by Firebase Authentication rather than by us.</p>"
    +"<p>No online service can promise perfect security. Use a strong, unique password, and do not share sensitive information in public posts or chats. If a breach affecting your personal information occurs, we will notify you and the relevant authorities as required by law.</p>"
    +"<p><strong>Sensitive information:</strong> Community posts are public. Messages are not end-to-end encrypted. Health, financial or personal details you type into the tools stay in your browser, but anything you post or send is stored on our servers.</p>"});

  S.push({id:'transfers',title:'International transfers',body:
    "<p>Our service providers, especially Google and GitHub, operate globally. Your information may be processed on servers in countries other than your own, including the United States. These providers apply their own safeguards to protect data wherever it is processed.</p>"});

  S.push({id:'changes',title:'Changes to this policy',body:
    "<p>We may update this policy when features or services change. The \"Last updated\" date at the top shows the latest version. For significant changes, we will post an announcement inside the app. If you keep using Alio after a change, you accept the updated policy, except where the law requires us to ask for your consent again.</p>"});

  legalShell('privacy','Privacy Policy',
    "This policy explains in plain language what information Alio handles, why, who can see it, and the choices you have. We have tried to keep it complete and honest, so it is long. The summary below gives you the key points.",
    glance,S);
}

/* ───────────────────────── TERMS OF USE ───────────────────────── */
function renderTerms(){
  var glance="<ul>"
    +"<li>Alio is <strong>free</strong> and provided <strong>\"as is\"</strong>, with no guarantees.</li>"
    +"<li>Health, science, finance and AI tools are for <strong>general information only</strong>, not professional advice.</li>"
    +"<li>You are responsible for what you post and send, and must follow the <a onclick=\"go('guidelines')\">Community Guidelines</a>.</li>"
    +"<li>Anyone can use the tools. If you are <strong>under 18</strong>, you need a parent or guardian's permission to create an account.</li>"
    +"<li>We can change, pause or remove features, and can suspend accounts that break the rules. This includes switching off individual options (for example editing or deleting posts or messages, or a single game mode) for all users, at any time and without notice.</li>"
    +"</ul>";
  var S=[];

  S.push({id:'agree',title:'Agreement to these terms',body:
    "<p>These Terms of Use (\"Terms\") are a legal agreement between you and Kiran Sankar (the \"Owner\", \"we\", \"us\"), who operates Alio, a product of KS Tech. By using Alio, whether on the website or as an installed app, you agree to these Terms. When you create an account or sign in, you also agree to the <a onclick=\"go('privacy')\">Privacy Policy</a> and the <a onclick=\"go('guidelines')\">Community Guidelines</a>, which form part of these Terms.</p>"
    +"<p>If you do not agree, please do not use Alio.</p>"});

  S.push({id:'eligible',title:'Who can use Alio',body:
    "<p>Alio is made to be suitable for all ages. <strong>Anyone can use the tools</strong> that do not need an account, with no age limit.</p>"
    +"<p><strong>Accounts.</strong> A free account is needed for the Community, Messages, leaderboards, follows, saved game progress and syncing your settings. In India a person under 18 is a minor. If you are under 18, you may create an account only with the knowledge and permission of a parent or legal guardian, who is responsible for your use of Alio. By creating an account you confirm that you meet this condition, that you are able to accept these Terms (or have a parent or guardian's permission to do so), and that you are not banned from Alio.</p>"
    +"<p><strong>When you need to sign up.</strong> You do not need to sign up to use the tools, games, health, fun, science and PDF features. You must sign up to post, reply or react in the Community, to send or receive Messages, to see Notifications, to appear on leaderboards or use follows, to manage your privacy and profile settings, and to save your settings to your account. <strong>Notes &amp; To-do do not need an account</strong>: they are stored only in this browser on this device, so signing up does not back them up or sync them.</p>"});

  S.push({id:'service',title:'The service',body:
    "<p>Alio provides free online tools and an optional community. It is an independent, actively developed project. We may add, change, pause or remove features, the design, or even the name and web address of the service at any time, with or without notice. Administrators can switch individual features off. We do not guarantee that Alio will be available at all times, error-free, or that it will always remain free.</p>"
    +"<p>You are responsible for your own device, browser and internet connection, and for keeping copies of anything important. Data you enter into tools that run in your browser is not saved by us.</p>"});

  S.push({id:'account',title:'Your account',body:
    "<ul>"
    +"<li>An account is needed only for the Community, Messages, leaderboards, follows, saved game progress and syncing your settings. You can sign up with Google or with your email and a password.</li>"
    +"<li>Give accurate information and keep it up to date.</li>"
    +"<li>Keep your password secure. You are responsible for activity on your account.</li>"
    +"<li>Tell us promptly at "+legalMail()+" if you think someone else is using your account.</li>"
    +"<li>You can stay signed in to up to six accounts on one device and switch between them. Only add accounts that belong to you.</li>"
    +"<li>Anyone who uses your device can switch to an account saved on it, so on a shared device use <em>Log out of all accounts</em> when you finish. <em>Log out of all other devices</em> signs your account out elsewhere. It is a convenience and does not replace keeping your password secure.</li>"
    +"<li>You can delete your account at any time in Settings → Account. See the Privacy Policy for what is removed.</li>"
    +"</ul>"});

  S.push({id:'use',title:'Acceptable use',body:
    "<p>You agree not to:</p>"
    +"<ul>"
    +"<li>break any law, or infringe anyone's rights, including copyright and privacy;</li>"
    +"<li>harass, threaten, bully, defraud, impersonate or spam others;</li>"
    +"<li>post or send illegal, hateful, sexually explicit or violent content;</li>"
    +"<li>upload viruses or other harmful code, or try to damage, overload or disrupt Alio;</li>"
    +"<li>probe, hack, scrape or bypass the security of Alio, its database or its rules, or use bots or automated tools to access it;</li>"
    +"<li>get around a warning, suspension, ban, rate limit or feature restriction, including by creating new accounts;</li>"
    +"<li>make false or abusive reports;</li>"
    +"<li>use the AI features to produce harmful or unlawful content;</li>"
    +"<li>copy, resell or present Alio or its tools as your own.</li>"
    +"</ul>"});

  S.push({id:'content',title:'Your content',body:
    "<p>You keep ownership of what you post or send (\"your content\"). By posting it, you give us a non-exclusive, worldwide, royalty-free licence to store, display, and transmit it as needed to run Alio, for as long as it remains on the service. Public content (such as Community posts and your public profile) can be seen by anyone.</p>"
    +"<p>You promise that you have the right to share your content and that it follows these Terms and the Community Guidelines. You are solely responsible for your content. We do not endorse it and are not responsible for it. We may remove content or restrict accounts that break the rules, but we are not obliged to monitor everything.</p>"
    +"<p>If you delete your content, we will remove it from the service, but other people may already have seen, copied or saved it, and short-lived backups may remain for a limited time.</p>"});

  S.push({id:'community',title:'Community, messages and moderation',body:
    "<p>The Community, Messages and reporting features are governed by the <a onclick=\"go('guidelines')\">Community Guidelines</a>. Notifications and messages sent by the team, messages marked \"Official\", and posts from the Alio account (special Alio badge) come from the Alio team, and can be changed or removed only by the team through the admin dashboard. The team may also give an account a badge with an optional short note, and may remove it at any time. The blue Verified badge is an official Alio badge showing that the Alio team has verified an account. It does not make that person part of the Alio team or brand, and it does not mean Alio or KS Tech endorses, vouches for or is responsible for that account. Every Community post must carry a flair (a topic label). Alio may suggest one from your text, but you can change it before posting and you are responsible for choosing a fitting one; posts with a misleading flair may be re-labelled or removed. While you use Alio, a green online dot may show on your picture to other signed-in users, and you can switch it off in Settings → Privacy &amp; Profile. Administrators have an admin dashboard that is separate from their personal accounts. Moderation decisions are made by people at the Owner's discretion and can include removing content, warnings, suspensions and permanent bans.</p>"});

  S.push({id:'points',title:'Game points, leaderboards and following',body:
    "<p>Game points, coins and leaderboards are just for fun. Coins are simply your game points, which you can spend on QUANTUM RUSH characters, in Hatchlings (eggs and habitats) and in Card Quest (heroes); one coin balance is shared across these games. Chess wins against the bot give points; matches against a friend do not. In friend matches you must play fair: do not use illegal moves, tricks or outside help, and do not harass your opponent; we may end a match or remove users who do. Game progress is saved to your account and may be lost or reset if a bug, an update or a cheating clean-up requires it. Coins and progress have no cash value and nothing is promised for ranking highly. Leaderboard entries are public, but you can hide yourself in Settings → Privacy &amp; Profile. You can follow other users and they can follow you; a private profile requires follow requests to be approved. We may remove or reset scores that look faked or obtained by cheating, and may remove follows or accounts used for harassment or spam, as set out in the <a onclick=\"go('guidelines')\">Community Guidelines</a>.</p>"});

  S.push({id:'ai',title:'AI features',body:
    "<p>The Science Solver and Alio Assistant use a third-party AI service. Their answers are generated automatically and <strong>may be inaccurate, incomplete or out of date</strong>. Check anything important with a reliable source or a qualified professional. Do not enter personal, confidential or sensitive information. Availability is not guaranteed, and use of the AI service is also subject to the provider's terms.</p>"});

  S.push({id:'info',title:'Health, science, finance and informational tools',body:
    "<p>All tools on Alio are provided for general information, education and convenience only. In particular:</p>"
    +"<ul>"
    +"<li><strong>Health tools</strong> (such as BMI, heart rate, heart zones, breathing, hydration, eye timer and cycle tracker) do not provide medical advice, diagnosis or treatment. Results are estimates. The Cycle Tracker is not a method of contraception or fertility planning. Talk to a qualified health professional about any health concern, and never ignore professional advice because of something you saw here.</li>"
    +"<li><strong>Financial calculators</strong> (such as EMI and the financial calculator) give estimates only. Your lender's or bank's figures may differ. This is not financial advice.</li>"
    +"<li><strong>Science and AI answers</strong> may contain mistakes.</li>"
    +"<li><strong>Fun tools</strong> (such as Life in Numbers, Age on Mars and What If calculators) are for entertainment and use averages or simplified models.</li>"
    +"</ul>"
    +"<p>In an emergency, contact your local emergency services immediately.</p>"});

  S.push({id:'ip',title:'Intellectual property',body:
    "<p>Alio, including its design, code, name, logo and original content, belongs to the Owner or its licensors and is protected by law. We give you a limited, personal, non-exclusive, non-transferable licence to use Alio for your own non-commercial use, in line with these Terms. Third-party libraries, trademarks and brand names belong to their respective owners.</p>"
    +"<p>If you send us feedback or ideas, we may use them freely without any obligation or payment to you.</p>"});

  S.push({id:'links',title:'Third-party services and links',body:
    "<p>Alio relies on and links to third-party services (for example Google, GitHub, Instagram, WhatsApp and the other platforms listed under Other Services). We do not control them and are not responsible for their content, availability or practices. Separate services offered by the Owner may have their own terms and privacy policies.</p>"});

  S.push({id:'warranty',title:'No warranties',body:
    "<p>Alio is provided <strong>\"as is\"</strong> and <strong>\"as available\"</strong>. To the fullest extent permitted by law, we make no promises, express or implied, about accuracy, reliability, availability, fitness for a particular purpose, or non-infringement.</p>"});

  S.push({id:'liability',title:'Limitation of liability',body:
    "<p>To the fullest extent permitted by law, the Owner is not liable for any indirect, incidental, special or consequential loss, or for loss of data, profits or opportunities, arising from your use of (or inability to use) Alio, from content or messages posted by users, or from decisions you make based on the tools or AI answers. If we are found liable for any reason, our total liability is limited to the amount you paid to use Alio, which is zero, since it is free.</p>"
    +"<p>Nothing in these Terms excludes or limits liability that cannot be excluded by law, including liability for fraud, or for death or personal injury caused by negligence, or any mandatory consumer rights you have under the law of your country.</p>"});

  S.push({id:'ending',title:'Suspension and ending',body:
    "<p>We may suspend, restrict or end your access, with or without notice, if you break these Terms or the Community Guidelines, if we must do so for legal or security reasons, or if we discontinue a feature or the service. You may stop using Alio and delete your account at any time. Sections that by their nature should continue (such as content licence, disclaimers, limitation of liability and governing law) survive the end of your use.</p>"});

  S.push({id:'changes',title:'Changes to these Terms',body:
    "<p>We may update these Terms from time to time. The \"Last updated\" date above shows the latest version. For significant changes we will post an announcement in the app. By continuing to use Alio after changes take effect, you accept the updated Terms. If you do not agree, stop using Alio and delete your account.</p>"});

  S.push({id:'law',title:'Governing law and disputes',body:
    "<p>These Terms are governed by the laws of India, including the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023, without regard to conflict-of-law rules. Subject to any mandatory consumer-protection rules that apply to you, the courts in India have jurisdiction over any dispute arising from your use of Alio. If you have a problem, please email "+legalMail()+" first so we can try to resolve it informally.</p>"});

  S.push({id:'general',title:'General',body:
    "<ul>"
    +"<li><strong>Whole agreement:</strong> these Terms, the Privacy Policy and the Community Guidelines are the complete agreement between you and us about Alio.</li>"
    +"<li><strong>If part is invalid:</strong> the rest stays in force.</li>"
    +"<li><strong>No waiver:</strong> if we do not enforce a rule immediately, we have not given up the right to do so later.</li>"
    +"<li><strong>Transfer:</strong> you may not transfer your account or rights to anyone else. We may transfer ours if the project is handed to another owner.</li>"
    +"<li><strong>No partnership:</strong> using Alio does not make you our employee, agent or partner.</li>"
    +"</ul>"});

  legalShell('terms','Terms of Use',
    "Please read these Terms carefully. They set out the rules for using Alio and what you can and cannot expect from it.",
    glance,S);
}

/* ───────────────────────── COMMUNITY GUIDELINES ───────────────────────── */
function renderGuidelines(){
  var glance="<ul>"
    +"<li>Be respectful. No harassment, hate, threats, spam, scams or impersonation.</li>"
    +"<li>Posts and profiles are <strong>public</strong>. Messages are <strong>not end-to-end encrypted</strong>.</li>"
    +"<li>You can block anyone and report anything with the 🚩 Report button.</li>"
    +"<li>Breaking the rules can lead to content removal, a warning, a suspension or a permanent ban.</li>"
    +"</ul>";
  var S=[];

  S.push({id:'scope',title:'Purpose and scope',body:
    "<p>The Alio Community is meant to be a friendly place. These guidelines apply to Community posts, replies, profile names and pictures, usernames, leaderboards, follows and Messages (both user-to-user chats and official messages). They are part of the <a onclick=\"go('terms')\">Terms of Use</a>.</p>"
    +"<p><strong>Account required.</strong> You can use Alio's tools without an account, but you must sign up (free) to post or reply in the Community or to use Messages. Under-18s need a parent or guardian's permission for an account, as explained in the Terms of Use.</p>"});

  S.push({id:'rules',title:'What is not allowed',body:
    "<ul>"
    +"<li>Harassment, bullying, threats or hate towards any person or group.</li>"
    +"<li>Spam, scams, phishing, or repeated unwanted messages.</li>"
    +"<li>Impersonating another person, the Alio team, or an administrator.</li>"
    +"<li>Illegal content, and sexually explicit or graphically violent content.</li>"
    +"<li>Sharing other people's private information (for example addresses, phone numbers or private photos) without permission.</li>"
    +"<li>Trying to get around a warning, suspension or ban, including by creating a new account.</li>"
    +"<li>Making knowingly false or abusive reports.</li>"
    +"<li>Cheating the leaderboards (for example by submitting fake scores), or using follows and follow requests to harass or spam people.</li>"
    +"<li>Choosing a misleading flair on purpose to get attention or to spam a topic.</li>"
    +"<li>Using someone's online status to pester, pressure or keep watch on them. Seeing that a person is online does not mean they owe you a reply.</li>"
    +"</ul>"
    +"<p>Please also think before sharing your own personal details. Posts are public, and messages are not end-to-end encrypted. Never share passwords, card or bank details, or ID numbers.</p>"});

  S.push({id:'profiles',title:'Usernames and profiles',body:
    "<p>Usernames are unique, between 3 and 20 characters, and may contain lowercase letters, numbers and underscores. Names that suggest official status, such as \"admin\", \"support\", \"moderator\", \"staff\" or \"official\", are reserved. Your display name, username and picture are public and must follow the rules above. Other users can find you in Messages only by typing your exact username.</p>"});

  S.push({id:'leaderboards',title:'Leaderboards and following',body:
    "<ul>"
    +"<li><strong>Leaderboards are public.</strong> They show your username, display name and picture and your game points. Tapping a picture opens that person's profile. You can hide yourself in Settings → Privacy &amp; Profile.</li>"
    +"<li><strong>Flairs:</strong> every Community post needs a flair. Alio may suggest one for you, but you are responsible for the one you post with.</li>"
    +"<li><strong>Online status:</strong> a green dot on a picture means that person is using Alio right now. Anyone can switch it off in Settings → Privacy &amp; Profile.</li>"
    +"<li><strong>Following:</strong> you can follow other users. If a profile is private, the person must approve your request first, and only approved followers see their posts. Do not send repeated follow requests to someone who has declined.</li>"
    +"<li>Usernames and pictures shown on leaderboards must follow the rules above. Fake or abusive scores can be removed.</li>"
    +"</ul>"});

  S.push({id:'messages',title:'Messages and requests',body:
    "<ul>"
    +"<li><strong>Requests:</strong> the first message you send to someone goes to their Requests tab. You can send up to 3 messages until they respond. If they accept, the chat moves to their main Chats tab. If they decline or block you, you cannot send more.</li>"
    +"<li><strong>Blocking:</strong> you can block anyone at any time. A blocked chat accepts no new messages.</li>"
    +"<li><strong>Editing and deleting:</strong> you can edit your own messages for 30 minutes after sending them (they then show \"edited\"). You can delete a message for yourself, or delete your own message for everyone, at any time. The other person may already have seen or saved it.</li>"
    +"<li><strong>Official messages:</strong> messages marked ✔ Official come from the Alio team and do not show which individual administrator wrote them. You can reply only inside a chat that the team has opened, and the team may mute a chat. In these official chats you can edit your own replies for 30 minutes after sending them, but you cannot delete them. Regular users cannot start a chat with an administrator account. Administrators also have ordinary personal accounts that work like any other user's account, shown with an Admin tag; the admin dashboard is separate from that personal account.</li>"
    +"<li><strong>Official Alio posts and badges:</strong> posts from the Alio account (special Alio badge) can be edited, pinned or deleted only by the team from the admin dashboard, not from the Community post menu. A team badge (Helper, Contributor, Trusted or Team) means the team gave that account the badge, for the reason written in its note if one is shown. The blue Verified badge is an official Alio badge showing that the Alio team has verified an account. It does not make that person part of the Alio team or brand, and does not mean Alio vouches for what they post. None of these badges is the same as Alio's own special badge, and any of them can be changed or removed at any time.</li>"
    +"<li><strong>Reactions and notifications:</strong> you can react to a message with any emoji and tap your reaction again to remove it. Do not use reactions to harass or mock anyone. Notifications from the team (and messages sent to many users at once) are official and cannot be replied to unless the team has opened a chat with you.</li>"
    +"<li><strong>Privacy:</strong> private user-to-user chats cannot be browsed by administrators. See the <a onclick=\"go('privacy')\">Privacy Policy</a> for details.</li>"
    +"</ul>"});

  S.push({id:'reporting',title:'Reporting',body:
    "<p>Use the 🚩 <strong>Report</strong> button in a chat or on a profile. You choose a reason and can add details. When you report from a chat, the last 15 messages are included by default so we can see what happened. You can untick this before sending. Reports go only to the Alio administrators, and the person you report is not told who reported them. Only report in good faith. Messages in a report are copied as you submitted them and are not independently verified.</p>"
    +"<p>Reports are not an emergency service. If someone is in danger, contact your local emergency services.</p>"});

  S.push({id:'moderation',title:'How we moderate',body:
    "<p>Alio is a one-person project. Reports are read by a person, so there is <strong>no guaranteed response time and no guarantee of any particular outcome</strong>. We do not routinely monitor private chats. We can review public content, remove content, and use the tools described below at our discretion. We cannot review everything, we cannot verify who anyone really is, and we are not responsible for what users write.</p>"});

  S.push({id:'enforcement',title:'Warnings, suspensions and bans',body:
    "<p>If rules are broken, we may, with or without earlier warning:</p>"
    +"<ul>"
    +"<li>remove the content;</li>"
    +"<li>send a warning, which is shown in the app until you acknowledge it;</li>"
    +"<li>temporarily suspend the account;</li>"
    +"<li>ban the account permanently.</li>"
    +"</ul>"
    +"<p>While suspended or banned, you cannot post, reply, send messages or change your public profile. A ban applies to the account and to the email address linked to it. To enforce it, we store your account ID, email address, the reason and the dates. Deleting your account or creating a new one does not lift a ban, and trying to avoid one may extend it.</p>"});

  S.push({id:'appeals',title:'Appeals',body:
    "<p>If you think a decision was a mistake, email "+legalMail()+" from the address you signed up with, and explain why. We may review it, but we cannot promise to reverse any decision. Moderation decisions are made by people, can be wrong, and are final at the Owner's discretion.</p>"});

  S.push({id:'safety',title:'Your safety',body:
    "<p>If someone bothers you, block them, report them, and tell us. If you are ever in danger, contact your local emergency services first. Where the law requires, or where it is needed to protect someone's safety, we may share relevant information with the authorities.</p>"});

  S.push({id:'changes',title:'Changes to these guidelines',body:
    "<p>We may update these guidelines as Alio grows. The \"Last updated\" date shows the latest version, and significant changes will be announced in the app.</p>"});

  legalShell('guidelines','Community Guidelines',
    "These guidelines keep the Alio Community and Messages friendly and safe for everyone. Please read them before you post or message.",
    glance,S);
}
