/* Mijn gebedspunten — alle gegevens worden uitsluitend lokaal bewaard. */
(() => {
  'use strict';
  const STORAGE_KEY = 'mijn-gebedspunten-data-v1';
  const CATEGORIES = ['Persoonlijk', 'Familie', 'Gemeente', 'Wereld', 'Dankzegging', 'Overig'];
  const CATEGORY_ICONS = ['♡', '⌂', '♧', '◎', '✧', '◌', '❀', '✦', '☆', '☘'];
  const COLORS = [
    ['#3f3435', '#eab9ac'], ['#30493e', '#b4d9bc'], ['#304452', '#b4d7e9'],
    ['#493c55', '#d4c3f5'], ['#4d4430', '#eed59a'], ['#3e4144', '#d0d5d6']
  ];

  const $ = id => document.getElementById(id);
  let db = loadDatabase();
  let selectedPointId = null;
  let editPointId = null;
  let userChangedTitle = false;
  let userChangedCategory = false;
  let suggestTimer = null;
  let toastTimer = null;
  let openedCategories = new Set();
  let answeredOpen = false;

  function makeId() {
    return (globalThis.crypto && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
  function defaultSettings() {
    return {
      count: 5, theme: 'dark',
      short: {book:'jeremiah',chapter:33,verse:3,end:null,text:'Roep tot Mij, en Ik zal u antwoorden',reference:'Jeremia 33:3',translation:'HSV'},
      long: {book:'psalms',chapter:62,verse:9,end:null,text:'Vertrouw op Hem te allen tijde, volk; stort uw hart uit voor Zijn aangezicht. God is voor ons een toevlucht. Sela',reference:'Psalm 62:9',translation:'HSV'}
    };
  }
  function defaultDatabase() {
    return { version: 1, categories: CATEGORIES.map(name => ({id: makeId(), name})), points: [], settings:defaultSettings() };
  }
  function loadDatabase() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultDatabase();
      const parsed = JSON.parse(raw);
      return validateDatabase(parsed);
    } catch (error) {
      // Laat beschadigde oorspronkelijke opslag ongemoeid (geen automatische overschrijving).
      console.warn('Kan opgeslagen gegevens niet laden:', error);
      setTimeout(() => showToast('Opgeslagen gegevens konden niet worden gelezen. Maak eerst een back-up van je browsergegevens.'), 500);
      return defaultDatabase();
    }
  }
  function validateDatabase(data) {
    if (!data || data.version !== 1 || !Array.isArray(data.categories) || !Array.isArray(data.points)) throw Error('Onbekend back-upformaat.');
    if (data.categories.length < 1 || data.categories.length > 500 || data.points.length > 20000) throw Error('Ongeldige aantallen.');
    const categoryIds = new Set();
    const names = new Set();
    const categories = data.categories.map(cat => {
      if (!cat || typeof cat.id !== 'string' || cat.id.length > 100 || !cat.id || typeof cat.name !== 'string' || !cat.name.trim() || cat.name.length > 40) throw Error('Ongeldige categorie.');
      if (categoryIds.has(cat.id) || names.has(cat.name.trim().toLocaleLowerCase('nl'))) throw Error('Dubbele categorie.');
      categoryIds.add(cat.id); names.add(cat.name.trim().toLocaleLowerCase('nl'));
      return { id: cat.id, name: cat.name.trim() };
    });
    const pointIds = new Set();
    const points = data.points.map(point => {
      if (!point || typeof point.id !== 'string' || !point.id || point.id.length > 100 || pointIds.has(point.id) || !categoryIds.has(point.categoryId)
        || typeof point.title !== 'string' || !point.title.trim() || point.title.length > 100
        || typeof point.body !== 'string' || !point.body.trim() || point.body.length > 4000) throw Error('Ongeldig gebedspunt.');
      pointIds.add(point.id);
      // Oudere opgeslagen punten/back-ups zonder status blijven actieve gebedspunten.
      const status=point.status==='answered'?'answered':'active';
      const answeredAt=status==='answered'&&point.answeredAt?validISO(point.answeredAt):null;
      return {id:point.id,categoryId:point.categoryId,title:point.title.trim(),body:point.body.trim(),createdAt:validISO(point.createdAt),updatedAt:validISO(point.updatedAt),status,answeredAt};
    });
    return {version:1,categories,points,settings:validateSettings(data.settings)};
  }
  function validateSettings(raw) {
    const defaults=defaultSettings();
    if(!raw || typeof raw!=='object')return defaults; // Oude back-ups blijven bruikbaar.
    const count=Number.isInteger(raw.count)&&raw.count>=1&&raw.count<=20?raw.count:defaults.count;
    const theme=['dark','light','system'].includes(raw.theme)?raw.theme:defaults.theme;
    function verseSetting(key) {
      const base=defaults[key];const val=raw[key];
      if(!val||typeof val!=='object')return base;
      const safe=(name,max,def)=>typeof val[name]==='string' && val[name].length<=max ? val[name] : def;
      const num=(name,def)=>Number.isInteger(val[name]) && val[name]>=1 && val[name]<=150 ? val[name] : def;
      const end=val.end===null||val.end===undefined?null:num('end',null);
      return {book:safe('book',50,base.book),chapter:num('chapter',base.chapter),verse:num('verse',base.verse),end,
        text:safe('text',3000,base.text),reference:safe('reference',120,base.reference),
        translation:['SV','HSV','Eigen tekst'].includes(val.translation)?val.translation:base.translation};
    }
    return {count,theme,short:verseSetting('short'),long:verseSetting('long')};
  }
  function validISO(s) { return typeof s === 'string' && !isNaN(Date.parse(s)) ? s : new Date().toISOString(); }
  let storageAvailable = true;
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      storageAvailable = true;
      return true;
    } catch (error) {
      storageAvailable = false;
      showToast('Opslaan op dit apparaat is mislukt. Exporteer een back-up via Instellingen.');
      console.error(error);
      return false;
    }
  }
  function make(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = content;
    return el;
  }
  function showToast(message) {
    const el = $('toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {el.hidden=true;}, 4500);
  }
  function getCategory(id) { return db.categories.find(c => c.id === id); }
  function isAnswered(point) { return point.status === 'answered'; }
  function activePoints() { return db.points.filter(point=>!isAnswered(point)); }
  function answeredPoints() { return db.points.filter(isAnswered); }
  function formatDate(date) { return new Intl.DateTimeFormat('nl-NL',{dateStyle:'long'}).format(new Date(date)); }
  function uniqueCategory(name) { return db.categories.some(c=>c.name.toLocaleLowerCase('nl')===name.trim().toLocaleLowerCase('nl')); }
  function svgChevron() {
    const span = make('span', 'chevron');
    span.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    return span;
  }
  function render() {
    const count = activePoints().length;
    $('summaryCount').textContent = `${count} ${count === 1 ? 'gebedspunt' : 'gebedspunten'} in ${db.categories.length} ${db.categories.length === 1 ? 'categorie' : 'categorieën'}`;
    $('randomButton').disabled = count === 0;
    const list = $('categoryList'); list.replaceChildren();
    db.categories.forEach((category, i) => {
      const points = activePoints().filter(p=>p.categoryId===category.id).sort((a,b)=>a.title.localeCompare(b.title,'nl'));
      const open = openedCategories.has(category.id);
      const card = make('section',`category-card${open?' is-open':''}`);
      const toggle = make('button','category-toggle');
      toggle.type='button'; toggle.setAttribute('aria-expanded',String(open));
      toggle.setAttribute('aria-label',`${category.name}, ${points.length} gebedspunten, ${open?'inklappen':'uitklappen'}`);
      const left=make('span','category-left');
      const emblem=make('span','category-emblem',CATEGORY_ICONS[i%CATEGORY_ICONS.length]);
      const col=COLORS[i%COLORS.length]; emblem.style.setProperty('--cat-bg',col[0]); emblem.style.setProperty('--cat-ink',col[1]);
      left.append(emblem,make('span','category-title',category.name));
      const right=make('span','category-right'); right.append(make('span','category-count',String(points.length)),svgChevron());
      toggle.append(left,right);
      toggle.addEventListener('click',()=>{if(openedCategories.has(category.id))openedCategories.delete(category.id);else openedCategories.add(category.id);render();});
      card.append(toggle);
      if (open) {
        const body=make('div','category-body');
        if (!points.length) body.append(make('p','category-empty','Nog geen gebedspunten in deze categorie.'));
        points.forEach(point=>{
          const row=make('button','point-row');row.type='button';
          row.append(make('span','',point.title));
          const arrow=make('span');arrow.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
          row.append(arrow);row.addEventListener('click',()=>openDetails(point.id));body.append(row);
        });
        card.append(body);
      }
      list.append(card);
    });
    if (count===0) {
      const info=make('div','empty-state');
      info.append(make('strong','','Je lijst is nog leeg'),document.createTextNode('Tik op ‘Toevoegen’ om je eerste gebedspunt op te schrijven.'));
      list.prepend(info);
    }
    renderAnswered();
  }
  function renderAnswered() {
    const points=answeredPoints().sort((a,b)=>new Date(b.answeredAt||b.updatedAt)-new Date(a.answeredAt||a.updatedAt));
    $('answeredCount').textContent=String(points.length);
    $('answeredToggle').setAttribute('aria-expanded',String(answeredOpen));
    $('answeredList').hidden=!answeredOpen;
    const container=$('answeredList');container.replaceChildren();
    if(!answeredOpen)return;
    if(!points.length) {
      container.append(make('p','answered-empty','Hier verschijnen gebeden die je als verhoord markeert.'));
      return;
    }
    // Binnen het archief blijven de oorspronkelijke categorieën zichtbaar.
    for(const category of db.categories){
      const selected=points.filter(p=>p.categoryId===category.id);
      if(!selected.length)continue;
      const group=make('div','answered-group');
      group.append(make('h3','answered-category',category.name));
      selected.forEach(point=>{
        const row=make('button','point-row answered-point');row.type='button';
        row.append(make('span','',point.title));
        const arrow=make('span');arrow.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
        row.append(arrow);row.addEventListener('click',()=>openDetails(point.id));group.append(row);
      });
      container.append(group);
    }
  }
  $('answeredToggle').addEventListener('click',()=>{answeredOpen=!answeredOpen;renderAnswered();});
  function openDialog(id) { const el=$(id);if(!el.open)el.showModal(); }
  function closeDialog(id) { const el=$(id);if(el.open)el.close(); }
  document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>closeDialog(btn.dataset.close)));
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',event=>{
    if(event.target===d)d.close();
  }));

  const categoryRules = [
    {pattern:/\b(opa|oma|vader|moeder|ouders|broer|zus|gezin|familie|neef|nicht|oom|tante|kinderen|kleinkind|partner|echtgenoo?t|vrouw|man)\b/gi, names:['Familie','Gezin']},
    {pattern:/\b(kerk|gemeente|kerkenraad|predikant|dominee|ouderling|diaken|preek|eredienst|catechisatie|vereniging|bijbelstudie|zondagsschool|zending)\b/gi, names:['Gemeente','Kerk']},
    {pattern:/\b(oorlog|vrede|land|landen|overheid|regering|verkiezing|wereld|vluchteling|honger|armoede|ramp|vervolging|isra[eë]l|oekra[iï]ne)\b/gi, names:['Wereld']},
    {pattern:/\b(dank|dankbaar|dankzegging|verhoord|zegen|danken|dankbaarheid)\b/gi, names:['Dankzegging','Dankbaarheid']},
    {pattern:/\b(werk|studie|opleiding|school|sollicitatie|baan|mijn|ik|mezelf|persoonlijk|keuze|wijsheid|beslissing|geloof|geduld|verleiding)\b/gi, names:['Persoonlijk']}
  ];
  const skipStart = /^(ik wil (graag )?(bidden voor|bidden om|danken voor)|graag bidden voor|bid(?:den)? (?:voor|om)|laten we bidden voor|gebed(?:spunt)?(?:je)?(?: voor| om)?|dat |voor |om |of |de |het |een )/i;
  function buildTitle(body) {
    let sentence = body.trim().replace(/\s+/g,' ').split(/[.!?\n]/)[0].trim();
    if (!sentence) return '';
    // Maak van een gebedszin een korte, herkenbare titel; dit is een lokale heuristiek, geen ChatGPT.
    for(let i=0;i<3;i++){const shorter=sentence.replace(skipStart,'').trim();if(shorter===sentence||!shorter)break;sentence=shorter;}
    if(!sentence) sentence=body.trim().replace(/\s+/g,' ');
    let words=sentence.split(' ');
    if(words.length>8)sentence=words.slice(0,8).join(' ')+'…';
    if(sentence.length>68)sentence=sentence.slice(0,65).trimEnd()+'…';
    sentence=sentence.charAt(0).toLocaleUpperCase('nl')+sentence.slice(1);
    return sentence;
  }
  function suggestCategory(body) {
    const lower=body.toLocaleLowerCase('nl');
    const scores=new Map(db.categories.map(c=>[c.id,0]));
    for(const category of db.categories) {
      const name=category.name.toLocaleLowerCase('nl');
      // Door gebruiker gemaakte categorieën tellen automatisch mee in de voorspelling.
      const tokens=name.split(/\s+/).filter(word=>word.length>=4);
      tokens.forEach(token=>{if(lower.includes(token))scores.set(category.id,scores.get(category.id)+4);});
    }
    for(const rule of categoryRules){
      const occurrences=(lower.match(rule.pattern)||[]).length;
      if(!occurrences)continue;
      const cat=db.categories.find(c=>rule.names.some(n=>n.toLocaleLowerCase('nl')===c.name.toLocaleLowerCase('nl')));
      if(cat)scores.set(cat.id,(scores.get(cat.id)||0)+occurrences*3);
    }
    const ranked=[...scores].sort((a,b)=>b[1]-a[1]);
    if(ranked.length && ranked[0][1]>0)return ranked[0][0];
    return db.categories.find(c=>c.name.toLocaleLowerCase('nl')==='overig')?.id || db.categories[0].id;
  }
  function fillCategoryOptions(preferredId) {
    const select=$('categorySelect');select.replaceChildren();
    db.categories.forEach(category=>{const option=make('option','',category.name);option.value=category.id;select.append(option);});
    if(preferredId && getCategory(preferredId))select.value=preferredId;
  }
  function provideSuggestions(force=false) {
    const body=$('pointBody').value.trim();
    if(!body)return;
    if(force || !userChangedTitle){$('pointTitle').value=buildTitle(body);}
    if(force || !userChangedCategory){$('categorySelect').value=suggestCategory(body);}
    if(force){userChangedTitle=false;userChangedCategory=false;showToast('Voorstellen bijgewerkt. Je kunt ze aanpassen.');}
  }
  function openPointEditor(id=null) {
    editPointId=id;
    const point=id?db.points.find(p=>p.id===id):null;
    if(id&&!point){showToast('Dit gebedspunt is niet meer beschikbaar.');return;}
    $('pointDialogTitle').textContent=point?'Gebedspunt bewerken':'Nieuw gebedspunt';
    $('savePointButton').textContent=point?'Wijzigingen bewaren':'Gebedspunt bewaren';
    $('pointBody').value=point?.body||'';
    $('pointTitle').value=point?.title||'';
    $('pointFormError').hidden=true;
    $('inlineCategory').hidden=true;
    $('inlineCategoryName').value='';
    fillCategoryOptions(point?.categoryId);
    userChangedTitle=Boolean(point);userChangedCategory=Boolean(point);
    if(!point){$('categorySelect').value=db.categories.find(c=>c.name==='Overig')?.id||db.categories[0].id;}
    openDialog('pointDialog');
    setTimeout(()=>$('pointBody').focus(),70);
  }
  $('addPointButton').addEventListener('click',()=>openPointEditor());
  $('pointBody').addEventListener('input',()=>{
    clearTimeout(suggestTimer);
    suggestTimer=setTimeout(()=>provideSuggestions(false),270);
  });
  $('pointTitle').addEventListener('input',()=>{userChangedTitle=true;});
  $('categorySelect').addEventListener('change',()=>{userChangedCategory=true;});
  $('suggestButton').addEventListener('click',()=>provideSuggestions(true));
  $('showInlineCategory').addEventListener('click',()=>{$('inlineCategory').hidden=!$('inlineCategory').hidden;if(!$('inlineCategory').hidden)$('inlineCategoryName').focus();});
  $('createInlineCategory').addEventListener('click',()=>{
    const id=createCategory($('inlineCategoryName').value);
    if(id){fillCategoryOptions(id);userChangedCategory=true;$('inlineCategory').hidden=true;$('inlineCategoryName').value='';}
  });
  $('inlineCategoryName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('createInlineCategory').click();}});
  $('pointForm').addEventListener('submit',e=>{
    e.preventDefault();
    clearTimeout(suggestTimer);
    const body=$('pointBody').value.trim();
    if(!userChangedTitle || !userChangedCategory)provideSuggestions(false);
    const title=$('pointTitle').value.trim();const categoryId=$('categorySelect').value;
    const error=$('pointFormError');
    if(!body || !title || !getCategory(categoryId)){error.textContent='Vul de beschrijving, titel en categorie in.';error.hidden=false;return;}
    if(body.length>4000 || title.length>100){error.textContent='De ingevoerde tekst is te lang.';error.hidden=false;return;}
    const now=new Date().toISOString();
    if(editPointId){
      const point=db.points.find(p=>p.id===editPointId);
      if(point)Object.assign(point,{body,title,categoryId,updatedAt:now});
    }else db.points.push({id:makeId(),title,body,categoryId,createdAt:now,updatedAt:now,status:'active',answeredAt:null});
    openedCategories.add(categoryId);
    persist();closeDialog('pointDialog');render();showToast(editPointId?'Gebedspunt bijgewerkt.':'Gebedspunt toegevoegd.');
  });
  function openDetails(id) {
    const point=db.points.find(p=>p.id===id);if(!point)return;
    selectedPointId=id;
    $('detailTitle').textContent=point.title;
    $('detailCategory').textContent=getCategory(point.categoryId)?.name||'';
    $('detailBody').textContent=point.body;
    $('detailDate').textContent=`Toegevoegd op ${formatDate(point.createdAt)}`;
    const answered=isAnswered(point);
    $('answeredDate').hidden=!answered;
    $('answeredDate').textContent=answered?`Als verhoord gemarkeerd op ${formatDate(point.answeredAt||point.updatedAt)}`:'';
    const answerButton=$('answerPointButton');
    answerButton.textContent=answered?'↶ Terugzetten':'✓ Verhoord';
    answerButton.setAttribute('aria-label',answered?'Terugzetten naar actieve gebedspunten':'Markeren als verhoord gebed');
    openDialog('detailDialog');
  }
  $('editPointButton').addEventListener('click',()=>{const id=selectedPointId;closeDialog('detailDialog');openPointEditor(id);});
  $('answerPointButton').addEventListener('click',()=>{
    const point=db.points.find(p=>p.id===selectedPointId);if(!point)return;
    const wasAnswered=isAnswered(point);
    point.status=wasAnswered?'active':'answered';
    point.answeredAt=wasAnswered?null:new Date().toISOString();
    point.updatedAt=new Date().toISOString();
    if(wasAnswered)openedCategories.add(point.categoryId);
    else answeredOpen=true;
    persist();closeDialog('detailDialog');render();
    showToast(wasAnswered?'Gebedspunt teruggezet naar de actieve lijst.':'Gebed verplaatst naar Verhoorde gebeden.');
  });
  $('deletePointButton').addEventListener('click',()=>{
    const point=db.points.find(p=>p.id===selectedPointId);if(!point)return;
    if(!confirm(`Weet je zeker dat je ‘${point.title}’ wilt verwijderen?`))return;
    db.points=db.points.filter(p=>p.id!==point.id);
    persist();closeDialog('detailDialog');render();showToast('Gebedspunt verwijderd.');
  });
  function renderRandom() {
    const pool=activePoints();
    // Fisher-Yates: uniforme steekproef zonder duplicaten binnen één selectie.
    for(let i=pool.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];
    }
    const chosen=pool.slice(0,db.settings.count);
    $('randomTitle').textContent=`${chosen.length} ${chosen.length===1?'gebedspunt':'gebedspunten'}`;
    $('randomHint').textContent=pool.length<db.settings.count?`Je hebt minder dan ${db.settings.count} gebedspunten. Daarom zie je ze allemaal.`:`Dit zijn ${db.settings.count} willekeurige punten uit al je categorieën. Tik op een titel om de beschrijving te lezen.`;
    const list=$('randomList');list.replaceChildren();
    chosen.forEach((point,i)=>{
      const details=make('details','random-item');
      const summary=make('summary');
      const number=make('span','number-pill',String(i+1));
      const text=make('span','random-item-title',point.title);
      const cat=make('span','random-item-cat',getCategory(point.categoryId)?.name||'');
      text.append(cat);summary.append(number,text,svgChevron());
      details.append(summary,make('div','random-detail',point.body));list.append(details);
    });
  }
  $('randomButton').addEventListener('click',()=>{if(!db.points.length)return;renderRandom();openDialog('randomDialog');});
  $('rerollButton').addEventListener('click',renderRandom);

  function createCategory(inputName) {
    const name=String(inputName).trim().replace(/\s+/g,' ');
    if(!name || name.length>40){showToast('Vul een categorienaam in van maximaal 40 tekens.');return null;}
    if(uniqueCategory(name)){showToast('Deze categorie bestaat al.');return null;}
    const id=makeId();db.categories.push({id,name});openedCategories.add(id);persist();render();renderSettingsCategories();return id;
  }
  $('addCategoryButton').addEventListener('click',()=>{openDialog('settingsDialog');$('newCategoryName').focus();});
  $('openSettings').addEventListener('click',()=>{renderSettingsCategories();openDialog('settingsDialog');});
  function renderSettingsCategories() {
    const list=$('settingsCategoryList');list.replaceChildren();
    db.categories.forEach(cat=>{
      const row=make('div','settings-category-row');
      const name=make('span','settings-category-name',cat.name);
      const rename=make('button','settings-icon-btn','Hernoem');rename.type='button';rename.setAttribute('aria-label',`Categorie ${cat.name} hernoemen`);
      rename.addEventListener('click',()=>{
        const next=prompt('Nieuwe naam voor deze categorie:',cat.name);
        if(next===null)return;
        const cleaned=next.trim().replace(/\s+/g,' ');
        if(!cleaned || cleaned.length>40){showToast('De naam moet 1 tot 40 tekens bevatten.');return;}
        if(db.categories.some(c=>c.id!==cat.id&&c.name.toLocaleLowerCase('nl')===cleaned.toLocaleLowerCase('nl'))){showToast('Deze categorie bestaat al.');return;}
        cat.name=cleaned;persist();render();renderSettingsCategories();showToast('Categorie hernoemd.');
      });
      const remove=make('button','settings-icon-btn danger','×');remove.type='button';remove.title=`Verwijder ${cat.name}`;remove.setAttribute('aria-label',`Categorie ${cat.name} verwijderen`);
      remove.addEventListener('click',()=>{
        const points=db.points.filter(p=>p.categoryId===cat.id);
        if(db.categories.length===1){showToast('Er moet minimaal één categorie blijven.');return;}
        if(points.length){
          const other=db.categories.find(c=>c.id!==cat.id&&c.name.toLocaleLowerCase('nl')==='overig')||db.categories.find(c=>c.id!==cat.id);
          if(!confirm(`Categorie ‘${cat.name}’ verwijderen? ${points.length} ${points.length===1?'gebedspunt wordt':'gebedspunten worden'} verplaatst naar ‘${other.name}’.`))return;
          points.forEach(p=>{p.categoryId=other.id;p.updatedAt=new Date().toISOString();});
        }else if(!confirm(`Lege categorie ‘${cat.name}’ verwijderen?`))return;
        db.categories=db.categories.filter(c=>c.id!==cat.id);openedCategories.delete(cat.id);
        persist();render();renderSettingsCategories();showToast('Categorie verwijderd.');
      });
      row.append(name,rename,remove);list.append(row);
    });
  }
  $('settingsCreateCategory').addEventListener('click',()=>{
    const id=createCategory($('newCategoryName').value);
    if(id){$('newCategoryName').value='';showToast('Categorie toegevoegd.');}
  });
  $('newCategoryName').addEventListener('keydown',e=>{if(e.key==='Enter'){$('settingsCreateCategory').click();}});
  function exportBackup() {
    const backup={app:'mijn-gebedspunten',exportedAt:new Date().toISOString(),...db};
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=make('a');link.href=url;link.download=`gebedspunten-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    showToast('Back-upbestand aangemaakt. Bewaar het op een veilige plek.');
  }
  $('exportButton').addEventListener('click',exportBackup);
  $('importButton').addEventListener('click',()=>$('importFile').click());
  $('importFile').addEventListener('change',async e=>{
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    if(file.size>5*1024*1024){showToast('Dit bestand is te groot (maximaal 5 MB).');return;}
    try{
      const parsed=JSON.parse(await file.text());
      if(parsed.app && parsed.app!=='mijn-gebedspunten')throw Error('Dit is geen back-up van Mijn gebedspunten.');
      const imported=validateDatabase(parsed);
      if(!confirm(`Back-up met ${imported.points.length} gebedspunten (waarvan ${imported.points.filter(isAnswered).length} verhoord) en ${imported.categories.length} categorieën importeren? Dit VERVANGT al je huidige gegevens. Maak zo nodig eerst een export.`))return;
      // Sla de import eerst op: als lokale opslag faalt, blijven huidige gegevens behouden.
      localStorage.setItem(STORAGE_KEY,JSON.stringify(imported));
      db=imported;openedCategories=new Set();render();renderSettingsCategories();renderPreferences();closeDialog('settingsDialog');showToast('Back-up succesvol geïmporteerd.');
    }catch(error){console.warn('Import mislukt',error);showToast(`Importeren mislukt: ${error.message||'ongeldig bestand'}`);}
  });
  // Instellingen zijn onderdeel van dezelfde lokale back-up als de gebedspunten.
  // De 66 Bijbelboeken, met hoofdstukaantallen en de slugs van Free.Bible.
  const BOOKS = [
    ['Genesis','genesis',50],['Exodus','exodus',40],['Leviticus','leviticus',27],['Numeri','numbers',36],['Deuteronomium','deuteronomy',34],
    ['Jozua','joshua',24],['Richteren','judges',21],['Ruth','ruth',4],['1 Samuël','1-samuel',31],['2 Samuël','2-samuel',24],
    ['1 Koningen','1-kings',22],['2 Koningen','2-kings',25],['1 Kronieken','1-chronicles',29],['2 Kronieken','2-chronicles',36],
    ['Ezra','ezra',10],['Nehemia','nehemiah',13],['Esther','esther',10],['Job','job',42],['Psalmen','psalms',150],
    ['Spreuken','proverbs',31],['Prediker','ecclesiastes',12],['Hooglied','song-of-solomon',8],['Jesaja','isaiah',66],
    ['Jeremia','jeremiah',52],['Klaagliederen','lamentations',5],['Ezechiël','ezekiel',48],['Daniël','daniel',12],
    ['Hosea','hosea',14],['Joël','joel',3],['Amos','amos',9],['Obadja','obadiah',1],['Jona','jonah',4],
    ['Micha','micah',7],['Nahum','nahum',3],['Habakuk','habakkuk',3],['Zefanja','zephaniah',3],['Haggaï','haggai',2],
    ['Zacharia','zechariah',14],['Maleachi','malachi',4],['Mattheüs','matthew',28],['Markus','mark',16],
    ['Lukas','luke',24],['Johannes','john',21],['Handelingen','acts',28],['Romeinen','romans',16],
    ['1 Korinthe','1-corinthians',16],['2 Korinthe','2-corinthians',13],['Galaten','galatians',6],['Efeze','ephesians',6],
    ['Filippenzen','philippians',4],['Kolossenzen','colossians',4],['1 Thessalonicenzen','1-thessalonians',5],
    ['2 Thessalonicenzen','2-thessalonians',3],['1 Timotheüs','1-timothy',6],['2 Timotheüs','2-timothy',4],
    ['Titus','titus',3],['Filemon','philemon',1],['Hebreeën','hebrews',13],['Jakobus','james',5],
    ['1 Petrus','1-peter',5],['2 Petrus','2-peter',3],['1 Johannes','1-john',5],['2 Johannes','2-john',1],
    ['3 Johannes','3-john',1],['Judas','jude',1],['Openbaring','revelation',22]
  ];
  const requestIds={short:0,long:0};
  const fetchTimers={short:null,long:null};
  const fetchControllers={short:null,long:null};
  function displayBook(id) {return BOOKS.find(b=>b[1]===id)?.[0]||'';}
  function updateHome() {
    for(const slot of ['short','long']){
      const data=db.settings[slot];
      $(`homeScripture${slot==='short'?'Short':'Long'}`).textContent=data.text;
      $(`homeScripture${slot==='short'?'Short':'Long'}Ref`).textContent=`${data.reference} · ${data.translation}`;
    }
    const n=db.settings.count;
    $('selectionTitle').textContent=`${n===5?'Vijf':String(n)} ${n===1?'punt':'punten'} voor vandaag`;
    $('selectionInfo').textContent=`Laat ${n===1?'één willekeurig gebedspunt':`${n} willekeurige gebedspunten`} kiezen uit je verzameling.`;
    $('randomButtonText').textContent=`Kies ${n} willekeurige ${n===1?'punt':'punten'}`;
  }
  const mediaTheme=window.matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    const resolved=db.settings.theme==='system'?(mediaTheme.matches?'dark':'light'):db.settings.theme;
    document.documentElement.dataset.theme=resolved;
    document.documentElement.style.colorScheme=resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',resolved==='light'?'#f7f8f4':'#111b1d');
  }
  mediaTheme.addEventListener?.('change',()=>{if(db.settings.theme==='system')applyTheme();});
  function savePreference() {persist();updateHome();applyTheme();}
  function showScriptureStatus(slot,text,kind='') {
    const node=$(`${slot}FetchStatus`);node.textContent=text;node.dataset.kind=kind;
  }
  function invalidateRequest(slot) {
    requestIds[slot]++;
    clearTimeout(fetchTimers[slot]);
    fetchControllers[slot]?.abort();fetchControllers[slot]=null;
  }
  function updateScriptureFromForm(slot) {
    const data=db.settings[slot];
    data.book=$(`${slot}Book`).value;
    data.chapter=Number($(`${slot}Chapter`).value)||1;
    data.verse=Number($(`${slot}Verse`).value)||1;
    data.end=$(`${slot}VerseEnd`).value?Number($(`${slot}VerseEnd`).value):null;
    data.text=$(`${slot}Text`).value.slice(0,3000);
    data.reference=$(`${slot}Reference`).value.slice(0,120);
    data.translation=$(`${slot}Translation`).value;
    savePreference();
  }
  async function fetchScripture(slot,id) {
    if(id!==requestIds[slot])return;
    const book=$(`${slot}Book`).value, bookInfo=BOOKS.find(b=>b[1]===book);
    const chap=Number($(`${slot}Chapter`).value),verse=Number($(`${slot}Verse`).value);
    const endRaw=$(`${slot}VerseEnd`).value.trim();const end=endRaw?Number(endRaw):verse;
    if(!bookInfo||!Number.isInteger(chap)||chap<1||chap>bookInfo[2]||!Number.isInteger(verse)||verse<1||verse>176||!Number.isInteger(end)||end<verse||end>176||end-verse>19){
      showScriptureStatus(slot,'Controleer bijbelboek, hoofdstuk en vers (maximaal 20 verzen).','error');return;
    }
    const controller=new AbortController();fetchControllers[slot]=controller;
    showScriptureStatus(slot,'Bijbeltekst ophalen uit de Statenvertaling (SV)…');
    const url=`https://free.bible/bible/dutch/${book}/${chap}.json`;
    try {
      const res=await fetch(url,{signal:controller.signal,cache:'default',credentials:'omit'});
      if(!res.ok)throw Error(`De Bijbelserver antwoordde met ${res.status}.`);
      const data=await res.json();
      if(!Array.isArray(data.verses)||data.book!==book||Number(data.chapter)!==chap)throw Error('Onverwachte reactie van de Bijbelserver.');
      const selected=[];
      for(let n=verse;n<=end;n++){
        const row=data.verses.find(r=>Number(r.v)<=n && Number(r.ve||r.v)>=n);
        if(!row||typeof row.t!=='string'||!row.t.trim())throw Error(`Vers ${n} is niet beschikbaar in deze vertaling.`);
        if(!selected.includes(row))selected.push(row);
      }
      const text=selected.map(r=>r.t.trim()).join(' ').replace(/[ \t]+/g,' ').trim();
      if(!text||text.length>3000)throw Error('Deze passage is te lang voor het tekstvak.');
      if(id!==requestIds[slot])return;
      const reference=`${bookInfo[0]} ${chap}:${verse}${end!==verse?'-'+end:''}`;
      $(`${slot}Text`).value=text;
      $(`${slot}Reference`).value=reference;
      $(`${slot}Translation`).value='SV';
      updateScriptureFromForm(slot);
      showScriptureStatus(slot,'Tekst geladen en automatisch bewaard (Statenvertaling, SV).','success');
    }catch(err){
      if(id!==requestIds[slot] || err.name==='AbortError')return;
      showScriptureStatus(slot,'Ophalen mislukt. Controleer internet en verwijzing; bestaande tekst blijft bewaard. '+(err.message||''),'error');
    }finally{if(fetchControllers[slot]===controller)fetchControllers[slot]=null;}
  }
  function scheduleScriptureFetch(slot) {
    invalidateRequest(slot);
    const id=requestIds[slot];
    // Pas na de laatste wijziging opvragen, om onnodige verzoeken te voorkomen.
    fetchTimers[slot]=setTimeout(()=>fetchScripture(slot,id),650);
  }
  for(const slot of ['short','long']){
    const select=$(`${slot}Book`);
    for(const [name,id] of BOOKS){const opt=make('option','',name);opt.value=id;select.append(opt);}
    ['Book','Chapter','Verse','VerseEnd'].forEach(field=>{
      const el=$(`${slot}${field}`);
      el.addEventListener(field==='Book'?'change':'input',()=>{
        if(field==='Book'){
          const info=BOOKS.find(b=>b[1]===el.value);
          $(`${slot}Chapter`).max=String(info?.[2]||150);
        }
        scheduleScriptureFetch(slot);
      });
    });
    ['Text','Reference','Translation'].forEach(field=>{
      $(`${slot}${field}`).addEventListener(field==='Translation'?'change':'input',()=>{
        invalidateRequest(slot);updateScriptureFromForm(slot);
        if(field==='Text')showScriptureStatus(slot,'Handmatig gewijzigde tekst bewaard. Controleer of de gekozen vertaling klopt.');
      });
    });
  }
  function renderPreferences() {
    $('settingRandomCount').value=db.settings.count;
    $('settingTheme').value=db.settings.theme;
    for(const slot of ['short','long']){
      invalidateRequest(slot);
      const s=db.settings[slot];
      $(`${slot}Book`).value=BOOKS.some(b=>b[1]===s.book)?s.book:'genesis';
      $(`${slot}Chapter`).value=s.chapter;
      $(`${slot}Chapter`).max=String(BOOKS.find(b=>b[1]===$(`${slot}Book`).value)?.[2]||150);
      $(`${slot}Verse`).value=s.verse;
      $(`${slot}VerseEnd`).value=s.end||'';
      $(`${slot}Text`).value=s.text;
      $(`${slot}Reference`).value=s.reference;
      $(`${slot}Translation`).value=s.translation;
      showScriptureStatus(slot,'Wijzig bijbelboek, hoofdstuk of vers om de Statenvertaling automatisch op te halen.');
    }
    updateHome();applyTheme();
  }
  $('countMinus').addEventListener('click',()=>{
    $('settingRandomCount').value=Math.max(1,db.settings.count-1);$('settingRandomCount').dispatchEvent(new Event('change'));
  });
  $('countPlus').addEventListener('click',()=>{
    $('settingRandomCount').value=Math.min(20,db.settings.count+1);$('settingRandomCount').dispatchEvent(new Event('change'));
  });
  $('settingRandomCount').addEventListener('change',()=>{
    const n=Number($('settingRandomCount').value);
    db.settings.count=Number.isInteger(n)?Math.max(1,Math.min(20,n)):5;
    $('settingRandomCount').value=db.settings.count;savePreference();
  });
  $('settingTheme').addEventListener('change',()=>{db.settings.theme=$('settingTheme').value;savePreference();});
  render();renderSettingsCategories();renderPreferences();
  if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')) {
    window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js',{scope:'./'}).catch(e=>console.info('Offline installatie niet beschikbaar:',e)));
  }
})();
