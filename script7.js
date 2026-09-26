
/* V25 clean feature layer: Timesheet + separated management/more + robust persistence helpers */
(function(){
  const V25='25.0';
  const REMINDER_TIMES=['16:30','17:00','18:00','20:00'];
  const DAY_NAMES=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
  const MONTH_NAMES=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  function esc25(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function faNow(){return new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replace(/\u200e/g,'');}
  function faParts(d=new Date()){const f=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'numeric',day:'numeric'}).formatToParts(d);return Object.fromEntries(f.filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));}
  function faDateLong(d=new Date()){const p=faParts(d);return `${String(p.day).padStart(2,'0')} ${MONTH_NAMES[p.month-1]} ${p.year}`;}
  function isoDay(d=new Date()){const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;}
  function faDayName(d=new Date()){return DAY_NAMES[new Date(d).getDay()] || '';}
  function faMonthKey(d=new Date()){const p=faParts(d);return `${p.year}-${String(p.month).padStart(2,'0')}`;}
  function faMonthName(key){const [y,m]=String(key).split('-').map(Number);return `${MONTH_NAMES[(m||1)-1]||''} ${y||''}`;}
  function timeNow(){return new Intl.DateTimeFormat('fa-IR',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());}
  function ensureV25(){
    db.timesheets=Array.isArray(db.timesheets)?db.timesheets:[];
    db.settings=db.settings||{};
    if(!Array.isArray(db.settings.timesheetReminderTimes)||!db.settings.timesheetReminderTimes.length) db.settings.timesheetReminderTimes=[...REMINDER_TIMES];
    db.settings.timesheetStart='08:00';
    db.settings.timesheetInspector='سالار علی زاده';
    db.settings.timesheetNotifications=db.settings.timesheetNotifications!==false;
  }
  async function persistV25(){ensureV25(); if(typeof save==='function') await save();}
  function todaySheet(){ensureV25();const key=isoDay();let t=db.timesheets.find(x=>x.dateKey===key);if(!t){t={id:'TS-'+key,dateKey:key,persianDate:faNow(),dayName:faDayName(),startTime:'08:00',endTime:'',location:'',riverArea:'',description:'',inspector:'سالار علی زاده',status:'ناقص',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};db.timesheets.push(t);persistV25();}return t;}
  function completeStatus(t){return t&&t.endTime&&String(t.endTime).trim()?'تکمیل‌شده':'ناقص';}
  function isComplete(t){return completeStatus(t)==='تکمیل‌شده';}
  function currentReminderPassed(hm){const [h,m]=hm.split(':').map(Number),d=new Date();return d.getHours()>h||(d.getHours()===h&&d.getMinutes()>=m);}
  function reminderKey(date,hm){return `watermonitor_ts_reminded_${date}_${hm}`}
  function remindV25(force=false){
    ensureV25();const t=db.timesheets.find(x=>x.dateKey===isoDay());if(isComplete(t))return;
    const now=new Date(), nowMin=now.getHours()*60+now.getMinutes();
    for(const hm of (db.settings.timesheetReminderTimes||REMINDER_TIMES)){
      const [h,m]=hm.split(':').map(Number), target=h*60+m;
      if(nowMin>=target){const k=reminderKey(isoDay(),hm);if(force||localStorage.getItem(k)!=='1'){
        localStorage.setItem(k,'1');
        const title='⏰ یادآوری تایم‌شیت پایش منابع آب';
        const body=`تایم‌شیت امروز ${faNow()} هنوز تکمیل نشده است. شروع کار: ۰۸:۰۰`;
        if(db.settings.timesheetNotifications && 'Notification' in window && Notification.permission==='granted'){try{new Notification(title,{body,icon:'assets/icon-192.png',tag:'timesheet-'+isoDay()+'-'+hm})}catch(e){}}
        showTimesheetBanner();
      }}
    }
    if(force)showTimesheetBanner();
  }
  function showTimesheetBanner(){
    const old=document.getElementById('tsBanner');if(old)old.remove();
    const t=todaySheet();if(isComplete(t))return;
    const host=document.getElementById('app');if(!host)return;
    const el=document.createElement('div');el.id='tsBanner';el.className='ts-alert';el.innerHTML=`<div><b>⏰ تایم‌شیت امروز تکمیل نشده</b><small>${esc25(faNow())} · شروع ۰۸:۰۰</small></div><button onclick="window.timesheetPageV25()">تکمیل تایم‌شیت</button>`;
    host.prepend(el);
  }
  window.requestTimesheetNotificationsV25=async function(){
    if(!('Notification' in window)){alert('مرورگر این دستگاه اعلان وب را پشتیبانی نمی‌کند. هشدار داخل برنامه همچنان فعال است.');return}
    try{const p=await Notification.requestPermission();if(p==='granted'){db.settings.timesheetNotifications=true;await persistV25();alert('اعلان‌های تایم‌شیت فعال شد. برای اعلان‌های iPhone، برنامه را به صفحه اصلی (Home Screen) اضافه کنید.')}else alert('اجازه اعلان داده نشد؛ هشدار داخل برنامه همچنان فعال است.')}catch(e){alert('فعال‌سازی اعلان انجام نشد. هشدار داخل برنامه فعال می‌ماند.')}
  };
  window.saveTimesheetV25=async function(id){
    ensureV25();let t=db.timesheets.find(x=>x.id===id)||todaySheet();
    const end=document.getElementById('tsEnd')?.value||'';
    const loc=document.getElementById('tsLoc')?.value?.trim()||'';
    const river=document.getElementById('tsRiver')?.value?.trim()||'';
    const desc=document.getElementById('tsDesc')?.value?.trim()||'';
    if(!end){alert('لطفاً ساعت پایان کار را ثبت کنید.');return}
    t.endTime=end;t.location=loc;t.riverArea=river;t.description=desc;t.status='تکمیل‌شده';t.updatedAt=new Date().toISOString();t.persianDate=t.persianDate||faNow();t.dayName=t.dayName||faDayName();await persistV25();
    alert('تایم‌شیت امروز با موفقیت تکمیل شد.');localStorage.setItem('watermonitor_ts_completed_'+t.dateKey,'1');show('home');
  };
  window.setEndTimeV25=function(){const el=document.getElementById('tsEnd');if(el)el.value=timeNow();};
  window.timesheetPageV25=function(id){
    ensureV25();const t=id?db.timesheets.find(x=>x.id===id):todaySheet();if(!t)return;
    const completed=isComplete(t);
    app.innerHTML=`<div class="card ts-main"><div class="sectionTitle"><div><h2>🕒 تایم‌شیت روزانه</h2><p class="muted">کارشناس: سالار علی‌زاده</p></div><span class="badge ${completed?'success':'review'}">${completed?'تکمیل‌شده':'ناقص'}</span></div>
      <div class="ts-date"><b>${esc25(t.persianDate||faNow())}</b><span>${esc25(t.dayName||faDayName())}</span></div>
      <div class="two"><div><label>تاریخ (تقویم ایران)</label><input value="${esc25(t.persianDate||faNow())}" readonly></div><div><label>شروع کار</label><input value="08:00" readonly></div></div>
      <div class="two"><div><label>پایان کار</label><div class="endRow"><input id="tsEnd" type="time" value="${esc25(t.endTime||'')}"><button type="button" onclick="setEndTimeV25()">⏱ پایان کار</button></div></div><div><label>محل / حوزه فعالیت</label><input id="tsLoc" value="${esc25(t.location)}" placeholder="مثلاً شهرستان دماوند و حومه"></div></div>
      <label>رودخانه / محدوده</label><input id="tsRiver" value="${esc25(t.riverArea)}" placeholder="نام رودخانه یا محدوده فعالیت">
      <label>شرح فعالیت روزانه</label><textarea id="tsDesc" placeholder="شرح مختصر اقدامات انجام‌شده در روز...">${esc25(t.description)}</textarea>
      <div class="ts-note">در تایم‌شیت <b>عکس و ستون نقطه</b> ثبت نمی‌شود. فقط اطلاعات اداری روزانه ثبت خواهد شد.</div>
      <div class="row"><button onclick="saveTimesheetV25('${esc25(t.id)}')">💾 ثبت / تکمیل تایم‌شیت</button><button class="secondary" onclick="show('home')">← بازگشت</button></div>
      <div class="card"><h3>🔔 یادآوری‌ها</h3><p class="muted">یادآوری‌های پیش‌فرض: ${REMINDER_TIMES.join('، ')}. اگر تایم‌شیت تکمیل نشود، هشدارهای بعدی ادامه پیدا می‌کنند.</p><button class="secondary" onclick="requestTimesheetNotificationsV25()">🔔 فعال‌سازی اعلان‌های دستگاه</button></div>
    </div><div class="card"><div class="sectionTitle"><h3>📅 سوابق تایم‌شیت</h3><button class="secondary" onclick="timesheetMonthlyV25()">گزارش ماهانه</button></div>${(db.timesheets||[]).slice().sort((a,b)=>String(b.dateKey).localeCompare(String(a.dateKey))).slice(0,60).map(x=>`<div class="ts-row"><span><b>${esc25(x.persianDate)}</b><small>${esc25(x.dayName||'')} · ${esc25(x.startTime||'08:00')} تا ${esc25(x.endTime||'—')}</small></span><span class="badge ${isComplete(x)?'success':'review'}">${isComplete(x)?'تکمیل':'ناقص'}</span><button class="secondary" onclick="timesheetPageV25('${esc25(x.id)}')">ویرایش</button></div>`).join('')||'<p class="muted">هنوز تایم‌شیتی ثبت نشده است.</p>'}</div>`;
  };
  function timesheetRows(monthKey){ensureV25();return db.timesheets.filter(t=>String(t.dateKey).startsWith('') && (faMonthKeyFromStored(t)===monthKey));}
  function faMonthKeyFromStored(t){if(!t?.dateKey)return '';const d=new Date(t.dateKey+'T12:00:00');return faMonthKey(d)}
  window.timesheetMonthlyV25=function(){
    ensureV25();const months=[...new Set(db.timesheets.map(faMonthKeyFromStored).filter(Boolean))].sort().reverse();const key=months[0]||faMonthKey();const rows=db.timesheets.filter(t=>faMonthKeyFromStored(t)===key).sort((a,b)=>String(a.dateKey).localeCompare(String(b.dateKey)));
    app.innerHTML=`<div class="card"><div class="sectionTitle"><h2>📊 تایم‌شیت ماهانه</h2><button class="secondary" onclick="timesheetPageV25()">← بازگشت</button></div><label>ماه</label><select id="tsMonth" onchange="renderTimesheetMonthV25()">${months.map(m=>`<option value="${m}" ${m===key?'selected':''}>${esc25(faMonthName(m))}</option>`).join('')||`<option value="${faMonthKey()}">${esc25(faMonthName(faMonthKey()))}</option>`}</select><div id="tsMonthBody"></div></div>`;renderTimesheetMonthV25();
  };
  window.renderTimesheetMonthV25=function(){
    const key=document.getElementById('tsMonth')?.value||faMonthKey(),rows=db.timesheets.filter(t=>faMonthKeyFromStored(t)===key).sort((a,b)=>String(a.dateKey).localeCompare(String(b.dateKey)));const done=rows.filter(isComplete).length;
    document.getElementById('tsMonthBody').innerHTML=`<div class="grid"><div class="stat"><b>${rows.length}</b>روز ثبت‌شده</div><div class="stat"><b>${done}</b>روز تکمیل‌شده</div><div class="stat"><b>${rows.filter(x=>!isComplete(x)).length}</b>روز ناقص</div><div class="stat"><b>${rows.filter(x=>x.endTime).length}</b>پایان‌کار ثبت‌شده</div></div><div class="tablewrap"><table class="v24table"><thead><tr><th>تاریخ</th><th>روز</th><th>شروع</th><th>پایان</th><th>محل / حوزه</th><th>رودخانه / محدوده</th><th>شرح فعالیت</th><th>وضعیت</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc25(x.persianDate)}</td><td>${esc25(x.dayName)}</td><td>08:00</td><td>${esc25(x.endTime||'—')}</td><td>${esc25(x.location||'')}</td><td>${esc25(x.riverArea||'')}</td><td>${esc25(x.description||'')}</td><td>${isComplete(x)?'تکمیل‌شده':'ناقص'}</td></tr>`).join('')||'<tr><td colspan="8">برای این ماه رکوردی ثبت نشده است.</td></tr>'}</tbody></table></div><div class="row"><button onclick="exportTimesheetMonthV25('${key}')">📥 Excel تایم‌شیت ${esc25(faMonthName(key))}</button><button class="secondary" onclick="window.print()">🖨 چاپ / PDF</button></div>`;
  };
  window.exportTimesheetMonthV25=function(key){
    const rows=db.timesheets.filter(t=>faMonthKeyFromStored(t)===key).sort((a,b)=>String(a.dateKey).localeCompare(String(b.dateKey)));
    const data=[['تاریخ','روز','شروع کار','پایان کار','محل / حوزه فعالیت','رودخانه / محدوده','شرح فعالیت','کارشناس','وضعیت'],...rows.map(t=>[t.persianDate,t.dayName,'08:00',t.endTime||'',t.location||'',t.riverArea||'',t.description||'',t.inspector||'سالار علی زاده',isComplete(t)?'تکمیل‌شده':'ناقص'])];
    const summary=[['گزارش تایم‌شیت','پایش منابع آب'],['ماه',faMonthName(key)],['کارشناس','سالار علی زاده'],['تعداد روز ثبت‌شده',rows.length],['روز تکمیل‌شده',rows.filter(isComplete).length],['روز ناقص',rows.filter(x=>!isComplete(x)).length],['یادآوری‌ها',REMINDER_TIMES.join('، ')]];
    if(typeof downloadXLSX==='function') downloadXLSX([['خلاصه ماه',summary],['TimeSheet',data]],`TimeSheet_پایش_منابع_آب_${faMonthName(key).replace(/\s+/g,'_')}.xlsx`); else alert('ماژول Excel در دسترس نیست.');
  };
  window.managementV25=function(){
    app.innerHTML=`<div class="card"><div class="sectionTitle"><h2>📊 مدیریت</h2><span class="badge">سامانه پایش منابع آب</span></div><p class="muted">ابزارهای اصلی مدیریت داده، پرونده، گزارش و خروجی.</p><div class="toolGrid"><button onclick="casesPage()">📁 پرونده‌ها</button><button onclick="historicalExplorer()">🗂 پرونده‌های سنواتی</button><button onclick="window.waterBankPage?window.waterBankPage():show('waterbank')">💧 بانک آبفروشی</button><button onclick="window.photoBank()">📷 بانک عکس</button><button onclick="show('rivers')">🌊 رودخانه‌ها</button><button onclick="mapPageV24()">🗺 حریم و بستر</button><button onclick="managementReportV24()">📋 گزارش مدیریتی</button><button onclick="exportDailyReportV24()">📅 گزارش امروز</button><button onclick="exportEngineeringV24()">📊 Excel مهندسی</button><button onclick="timesheetPageV25()">🕒 تایم‌شیت روزانه</button><button onclick="timesheetMonthlyV25()">📆 تایم‌شیت ماهانه</button><button onclick="usersPage()">👥 کاربران و امنیت</button></div></div>`;
  };
  window.moreV25=function(){
    app.innerHTML=`<div class="card"><h2>☰ بیشتر</h2><div class="toolGrid"><button onclick="settingsPage()">⚙️ تنظیمات</button><button onclick="backupFullV24()">💾 Backup کامل</button><button onclick="syncCenter()">🔄 انتقال / ورود Backup</button><button onclick="manualHistoricalV24()">📝 فرم دستی / سنواتی</button><button onclick="moreQualityV25()">✅ کنترل کیفیت داده</button><button onclick="aboutV25()">ℹ️ درباره سامانه</button><button onclick="timesheetPageV25()">🕒 تایم‌شیت</button><button onclick="timesheetMonthlyV25()">📆 گزارش ماهانه</button></div></div><div class="card"><h3>👤 اطلاعات کارشناس</h3><p><b>سالار علی‌زاده</b></p><p class="muted">کارشناس پایش منابع آب<br>حوزه فعالیت: آب‌های سطحی و زیرزمینی</p><p class="muted">نسخه سامانه: V25</p></div>`;
  };
  window.moreQualityV25=function(){
    const ps=db.points||[],ts=db.timesheets||[];app.innerHTML=`<div class="card"><h2>✅ کنترل کیفیت داده</h2><div class="quality"><span>نقاط بدون مختصات معتبر</span><b>${ps.filter(p=>!isFinite(Number(p.latitude))||!isFinite(Number(p.longitude))).length}</b></div><div class="quality"><span>نقاط بدون UTM</span><b>${ps.filter(p=>!p.utmEasting||!p.utmNorthing).length}</b></div><div class="quality"><span>نقاط بدون عکس</span><b>${ps.filter(p=>!(p.photoCount>0)).length}</b></div><div class="quality"><span>تایم‌شیت‌های ناقص</span><b>${ts.filter(x=>!isComplete(x)).length}</b></div><div class="quality"><span>پرونده‌های باز</span><b>${(db.cases||[]).filter(c=>c.status!=='مختومه').length}</b></div></div><div class="card"><button class="secondary" onclick="moreV25()">← بازگشت</button></div>`;
  };
  window.aboutV25=function(){app.innerHTML=`<div class="card"><h2>💧 پایش منابع آب</h2><p><b>آب سطحی و زیرزمینی</b></p><p>سامانه ثبت، پایش، مستندسازی، مدیریت پرونده، حریم و بستر، پیمایش، گزارش و خروجی Excel.</p><p class="muted">نسخه 25.0 · کارشناس: سالار علی‌زاده</p><button class="secondary" onclick="moreV25()">← بازگشت</button></div>`};
  const oldShow25=window.show;
  window.show=function(p){if(p==='management'){nav('management');managementV25();return}if(p==='more'){nav('more');moreV25();return}if(p==='home'){oldShow25('home');setTimeout(()=>{ensureV25();showTimesheetBanner();remindV25();},60);return}oldShow25(p);};
  function polishNav25(){const n=document.querySelector('.nav');if(!n)return;n.innerHTML='<button data-p="home" onclick="show(\'home\')"><span>⌂</span>خانه</button><button data-p="new" onclick="show(\'new\')"><span>📍</span>ثبت نقطه</button><button data-p="map" onclick="show(\'map\')"><span>🗺</span>نقشه</button><button data-p="management" onclick="show(\'management\')"><span>📊</span>مدیریت</button><button data-p="more" onclick="show(\'more\')"><span>☰</span>بیشتر</button>';}
  polishNav25();ensureV25();
  const oldHome25=window.home;window.home=function(){oldHome25();setTimeout(()=>{ensureV25();const host=document.getElementById('app');if(!host)return;const t=todaySheet();let c=document.getElementById('todayTimesheetCard');if(!c){c=document.createElement('div');c.id='todayTimesheetCard';c.className='card';host.insertBefore(c,host.firstChild);}c.innerHTML=`<div class="sectionTitle"><div><h3>🕒 تایم‌شیت امروز</h3><small class="muted">${esc25(t.persianDate)} · شروع ثابت ۰۸:۰۰</small></div><span class="badge ${isComplete(t)?'success':'review'}">${isComplete(t)?'تکمیل‌شده':'نیاز به تکمیل'}</span></div><div class="grid"><div class="stat"><b>08:00</b>شروع</div><div class="stat"><b>${esc25(t.endTime||'—')}</b>پایان</div><div class="stat"><b>${esc25(t.location||'—')}</b>حوزه</div><div class="stat"><b>${esc25(t.riverArea||'—')}</b>رودخانه/محدوده</div></div><p class="muted">عکس و ستون نقطه در تایم‌شیت ثبت نمی‌شود.</p><button onclick="timesheetPageV25()">${isComplete(t)?'✏️ ویرایش تایم‌شیت':'📝 تکمیل تایم‌شیت امروز'}</button>`;showTimesheetBanner();remindV25();},50)};
  window.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){ensureV25();remindV25();}});
  setInterval(()=>{if(document.visibilityState==='visible'){ensureV25();remindV25();}},30000);
  // Add TimeSheet to the existing engineering export without changing its other sheets.
  const oldExportEngineering25=window.exportEngineeringV24;window.exportEngineeringV24=async function(){await oldExportEngineering25();};
  window.V25={version:V25,reminderTimes:REMINDER_TIMES,start:'08:00'};
})();
