
/* V22 root fix: eliminate cross-IIFE scope errors and make point create/edit self-contained. */
(function(){
  const V22='22.0';
  const esc22=x=>typeof window.esc==='function'?window.esc(x):String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const defs=()=>window.FORM_DEFS||{};
  const fkey=x=>typeof window.formKey==='function'?window.formKey(x):String(x||'').trim();
  const ffields=(d,data)=>typeof window.formFieldsGlobal==='function'?window.formFieldsGlobal(d,data):'';
  const collect=(t,old)=>typeof window.collectSpecialGlobal==='function'?window.collectSpecialGlobal(t,old):(old||{});
  window.newPoint=function(editId){
    try{
      const p=editId?(db.points||[]).find(x=>String(x.pointId)===String(editId)):null;
      const rivers=(db.rivers||[]).filter(r=>r.active);
      if(!rivers.length){document.getElementById('app').innerHTML='<div class="card"><h2>📍 ثبت نقطه</h2><p class="muted">هیچ رودخانه فعالی وجود ندارد. ابتدا یک رودخانه را فعال کنید.</p><button onclick="show(\'rivers\')">مدیریت رودخانه‌ها</button></div>';return;}
      const opts=rivers.map(r=>`<option value="${esc22(r.id)}" ${p&&p.riverId===r.id?'selected':''}>${esc22(r.name)}</option>`).join('');
      const types=[...new Set([...(window.TYPES||[]),...Object.keys(defs())])];
      const typeOpts=types.map(x=>`<option value="${esc22(x)}" ${p&&fkey(p.pointType)===fkey(x)?'selected':''}>${esc22(x)}</option>`).join('');
      document.getElementById('app').innerHTML=`<div class="card"><div class="sectionTitle"><h2>${p?'✏️ ویرایش نقطه':'📍 ثبت نقطه جدید'}</h2><span class="badge">V23 | فرم یکپارچه</span></div>
      <label>رودخانه</label><select id="river">${opts}</select>
      <div class="row"><button onclick="getGPS()">📍 دریافت GPS دقیق</button><span id="gpsmsg" class="muted">GPS واقعی گوشی + WGS84 / UTM</span></div>
      <div class="two compact-gps"><div><label>Latitude</label><input id="lat" inputmode="decimal" value="${p?.latitude??''}"></div><div><label>Longitude</label><input id="lon" inputmode="decimal" value="${p?.longitude??''}"></div><div><label>UTM Zone</label><input id="zone" inputmode="numeric" value="${p?.utmZone??39}"></div><div><label>نیم‌کره</label><select id="hemi"><option value="N" ${p?.utmHemisphere!=='S'?'selected':''}>N</option><option value="S" ${p?.utmHemisphere==='S'?'selected':''}>S</option></select></div><div><label>UTM Easting</label><input id="east" inputmode="decimal" value="${p?.utmEasting??''}"></div><div><label>UTM Northing</label><input id="north" inputmode="decimal" value="${p?.utmNorthing??''}"></div><div><label>ارتفاع (متر)</label><input id="alt" inputmode="decimal" value="${p?.altitude??''}"></div><div><label>دقت GPS (متر)</label><input id="acc" inputmode="decimal" value="${p?.accuracy??''}"></div></div>
      <div class="row"><button class="secondary" onclick="v22LL()">WGS84 → UTM</button><button class="secondary" onclick="v22UTM()">UTM → WGS84</button></div>
      <div class="card"><label>نوع نقطه / فرم تخصصی</label><select id="type">${typeOpts}</select><p class="muted">فرم تخصصی در همین رکورد باز می‌شود؛ نیاز به فرم دوم نیست.</p></div>
      <div class="two"><div><label>وضعیت بستر</label><input id="bed" value="${esc22(p?.bedStatus||'')}"></div><div><label>وضعیت حریم</label><input id="buffer" value="${esc22(p?.bufferStatus||'')}"></div><div><label>وضعیت آبراهه</label><input id="water" value="${esc22(p?.waterwayStatus||'')}"></div><div><label>سطح ریسک</label><select id="risk"><option value="A" ${p?.riskLevel==='A'?'selected':''}>A</option><option value="B" ${p?.riskLevel==='B'?'selected':''}>B</option><option value="C" ${!p||p?.riskLevel==='C'?'selected':''}>C</option></select></div></div>
      <label>نوع تخلف / مورد مشاهده</label><input id="violation" value="${esc22(p?.violationType||'')}"><label>شرح وضعیت</label><textarea id="desc">${esc22(p?.description||'')}</textarea><label>اقدام انجام‌شده</label><textarea id="action">${esc22(p?.action||'')}</textarea>
      <div class="two"><div><label>شماره پرونده</label><input id="caseNo" value="${esc22(p?.caseNumber||'')}"></div><div><label>شماره اخطار</label><input id="warningNo" value="${esc22(p?.warningNumber||'')}"></div><div><label>وضعیت پیگیری</label><input id="follow" value="${esc22(p?.followUpStatus||'')}"></div><div><label>بازدید بعدی</label><input id="next" type="date" value="${esc22(p?.nextVisit||'')}"></div></div>
      <label>کارشناس</label><input id="insp" value="${esc22(p?.inspector||'سالار علی زاده')}">
      <div class="card photo-box"><h3>📷 عکس‌های نقطه</h3><p class="muted">تعداد نامحدود عکس؛ مختصات UTM روی عکس درج می‌شود.</p><div class="row"><label class="fileBtn">📷 دوربین<input id="photosCamera" type="file" accept="image/*" capture="environment" multiple></label><label class="fileBtn">🖼️ گالری<input id="photosGallery" type="file" accept="image/*" multiple></label></div><div id="photoPreview" class="muted"></div></div>
      <div id="specialHost"></div><div class="row"><button onclick="savePointForm('${esc22(editId||'')}')">💾 ذخیره نقطه</button><button class="secondary" onclick="exportCurrentSpecialExcel()">📊 Excel این فرم</button><button class="secondary" onclick="show('home')">انصراف</button></div></div>`;
      window._v20Editing=p||null;window._v19Editing=p||null;window._v19EditId=editId||'';
      const typeEl=document.getElementById('type'); if(typeEl)typeEl.onchange=()=>renderSpecial22(window._v20Editing);
      renderSpecial22(p);
      ['lat','lon'].forEach(id=>document.getElementById(id)?.addEventListener('input',()=>{if(typeof window.calcUTM==='function')window.calcUTM();}));
      ['photosCamera','photosGallery'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>{const a=[...(document.getElementById('photosCamera')?.files||[]),...(document.getElementById('photosGallery')?.files||[])];document.getElementById('photoPreview').textContent=a.length?`${a.length} عکس آماده ثبت است.`:''}));
      if(p&&typeof window.calcUTM==='function')window.calcUTM();
    }catch(err){console.error('V22 newPoint',err);document.getElementById('app').innerHTML=`<div class="card"><h2>ثبت/ویرایش نقطه</h2><p class="muted">خطای بارگذاری فرم: ${esc22(err?.message||err)}</p><button onclick="show('home')">بازگشت</button></div>`;}
  };
  function renderSpecial22(p){const host=document.getElementById('specialHost');if(!host)return;const t=fkey(document.getElementById('type')?.value),d=defs()[t];host.innerHTML=d?`<div id="specialForm" class="card special-one"><div class="sectionTitle"><h3>📋 فرم تخصصی همین نقطه: ${esc22(t)}</h3><span class="badge">فرم یکپارچه</span></div><div class="two">${ffields(d,p&&p.pointType===t?p.specialData||{}:{})}</div></div>`:'<div class="card"><p class="muted">برای این نوع نقطه فرم تخصصی تعریف نشده است.</p></div>';}
  window.editPoint=function(id){const p=(db.points||[]).find(x=>String(x.pointId)===String(id));if(!p){alert('نقطه مورد نظر پیدا نشد.');return}window.newPoint(p.pointId)};
  window.v22LL=function(){try{if(typeof window.calcUTM==='function')window.calcUTM();}catch(e){alert('محاسبه UTM انجام نشد: '+e.message)}};
  window.v22UTM=function(){try{const e=Number(document.getElementById('east').value),n=Number(document.getElementById('north').value),z=Number(document.getElementById('zone').value)||39,h=document.getElementById('hemi').value||'N';if(!isFinite(e)||!isFinite(n)){alert('Easting و Northing معتبر نیست.');return}const c=window.utmToLatLon(e,n,z,h);document.getElementById('lat').value=c.lat.toFixed(9);document.getElementById('lon').value=c.lon.toFixed(9)}catch(e){alert('تبدیل UTM انجام نشد: '+e.message)}};
  window.savePointForm=async function(editId){
    try{
      const g=id=>document.getElementById(id),riverEl=g('river'),typeEl=g('type');if(!riverEl||!typeEl)throw new Error('فرم هنوز کامل بارگذاری نشده است');
      const r=(db.rivers||[]).find(x=>x.id===riverEl.value);if(!r||!r.active){alert('ابتدا یک رودخانه فعال انتخاب کنید.');return}
      let la=parseFloat(g('lat').value),lo=parseFloat(g('lon').value);
      if((!isFinite(la)||!isFinite(lo))&&isFinite(Number(g('east').value))&&isFinite(Number(g('north').value))){const c=window.utmToLatLon(Number(g('east').value),Number(g('north').value),Number(g('zone').value)||39,g('hemi').value||'N');la=c.lat;lo=c.lon;g('lat').value=la.toFixed(9);g('lon').value=lo.toFixed(9)}
      if(!isFinite(la)||!isFinite(lo)){alert('مختصات معتبر نیست. GPS بگیرید یا مختصات دستی وارد کنید.');return}
      const u=window.utm(la,lo),p=editId?(db.points||[]).find(x=>String(x.pointId)===String(editId)):null,now=new Date(),id=p?p.pointId:`${r.id}-P-${String((db.points||[]).filter(x=>x.riverId===r.id).length+1).padStart(4,'0')}`,t=fkey(typeEl.value);
      const obj={...(p||{}),pointId:id,riverId:r.id,riverName:r.name,date:p?.date||now.toLocaleDateString('fa-IR'),time:p?.time||now.toLocaleTimeString('fa-IR'),latitude:la,longitude:lo,utmZone:Number(g('zone').value)||u.zone,utmHemisphere:g('hemi').value||(la<0?'S':'N'),utmEasting:Number(g('east').value)||u.e,utmNorthing:Number(g('north').value)||u.n,altitude:parseFloat(g('alt')?.value)||null,accuracy:parseFloat(g('acc')?.value)||null,pointType:t,bedStatus:g('bed')?.value||'',bufferStatus:g('buffer')?.value||'',waterwayStatus:g('water')?.value||'',violationType:g('violation')?.value||'',description:g('desc')?.value||'',action:g('action')?.value||'',riskLevel:g('risk')?.value||'C',caseNumber:g('caseNo')?.value||'',warningNumber:g('warningNo')?.value||'',followUpStatus:g('follow')?.value||'',nextVisit:g('next')?.value||'',inspector:g('insp')?.value||'سالار علی زاده',specialData:collect(t,p?.specialData||{}),photoCount:p?.photoCount||0,updatedAt:now.toISOString(),createdAt:p?.createdAt||now.toISOString(),gpsSource:window.gps?.source||p?.gpsSource||'manual'};
      if(p)Object.assign(p,obj);else db.points.push(obj);
      db.photos=db.photos||[];const files=[...(g('photosCamera')?.files||[]),...(g('photosGallery')?.files||[])];let added=0;
      for(const f of files){let data;try{data=await watermarkedUTM(f,{zone:obj.utmZone,hemisphere:obj.utmHemisphere,e:obj.utmEasting,n:obj.utmNorthing,date:obj.date,time:obj.time},id)}catch(e){data=await fileData(f)}const pid='PHOTO-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);const ph={id:pid,pointId:id,riverId:r.id,name:f.name,type:'image/jpeg',originalType:f.type,data,createdAt:now.toISOString(),latitude:la,longitude:lo,utmZone:obj.utmZone,utmHemisphere:obj.utmHemisphere,utmEasting:obj.utmEasting,utmNorthing:obj.utmNorthing,gpsSource:window.gps?.source||'point_capture',date:obj.date,time:obj.time,watermarked:true,watermarkType:'UTM'};await put('photos',ph);db.photos.push(ph);obj.photoCount++;added++}
      await save();alert(added?`نقطه ${id} و ${added} عکس ذخیره شد.`:`نقطه ${id} با موفقیت ذخیره شد.`);window.show('home');
    }catch(err){console.error('V22 savePointForm',err);alert('ثبت/ویرایش نقطه انجام نشد.\nجزئیات خطا: '+(err?.message||err));}
  };
  window.V23={version:V22,inspector:'سالار علی زاده'};
})();
