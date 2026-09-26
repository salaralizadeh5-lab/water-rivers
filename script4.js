
/* V21 field fixes: reliable point save/edit, photo persistence/export, daily report */
(function(){
  const V21='21.0';
  const esc21=x=>typeof esc19==='function'?esc19(x):String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const today21=()=>new Date().toLocaleDateString('fa-IR');
  function pointPhotos21(pointId){return getAll('photos').then(a=>a.filter(x=>x.pointId===pointId));}
  function fileExt21(p){const n=String(p.name||'photo.jpg');const m=n.match(/\.([a-z0-9]+)$/i);return (m?m[1]:'jpg').toLowerCase();}
  function dataBytes21(u){const s=String(u||'');const i=s.indexOf(',');const b=atob(i>=0?s.slice(i+1):s);const a=new Uint8Array(b.length);for(let j=0;j<b.length;j++)a[j]=b.charCodeAt(j);return a}
  function xlsxBytes21(sheets){
    const files=[];
    let ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    sheets.forEach((s,i)=>ct+=`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);ct+='</Types>';
    files.push({name:'[Content_Types].xml',data:ct});
    files.push({name:'_rels/.rels',data:'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'});
    let wb='<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
    sheets.forEach((s,i)=>wb+=`<sheet name="${xml(s[0]).slice(0,31)}" sheetId="${i+1}" r:id="rId${i+1}"/>`);wb+='</sheets></workbook>';files.push({name:'xl/workbook.xml',data:wb});
    let rel='<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rStyle" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
    sheets.forEach((s,i)=>rel+=`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`);rel+='</Relationships>';
    files.push({name:'xl/_rels/workbook.xml.rels',data:rel});
    files.push({name:'xl/styles.xml',data:'<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="11"/><name val="Noto Sans Arabic UI"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="DCEFF5"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0"/></cellXfs></styleSheet>'});
    sheets.forEach((s,i)=>files.push({name:`xl/worksheets/sheet${i+1}.xml`,data:sheetXMLPro(s[1])}));
    return zipStore(files);
  }
  function dl21(data,name,type){download(data,name,type);}

  window.editPoint=function(id){
    const p=db.points.find(x=>String(x.pointId)===String(id));
    if(!p){alert('نقطه مورد نظر پیدا نشد.');return;}
    window.newPoint(String(id));
  };

  window.savePointForm=async function(editId){
    try{
      const riverEl=document.getElementById('river'), typeEl=document.getElementById('type');
      if(!riverEl||!typeEl){alert('فرم ثبت نقطه کامل بارگذاری نشده است.');return;}
      const r=db.rivers.find(x=>x.id===riverEl.value);
      if(!r||!r.active){alert('ابتدا یک رودخانه فعال انتخاب کنید.');return;}
      const latEl=document.getElementById('lat'),lonEl=document.getElementById('lon'),eastEl=document.getElementById('east'),northEl=document.getElementById('north'),zoneEl=document.getElementById('zone'),hemiEl=document.getElementById('hemi');
      let la=parseFloat(latEl?.value),lo=parseFloat(lonEl?.value);
      const e=parseFloat(eastEl?.value),n=parseFloat(northEl?.value),z=parseInt(zoneEl?.value)||39,h=(hemiEl?.value||'N').toUpperCase();
      if((!isFinite(la)||!isFinite(lo))&&isFinite(e)&&isFinite(n)&&typeof utmToLatLon==='function'){const c=utmToLatLon(e,n,z,h);la=c.lat;lo=c.lon;latEl.value=la.toFixed(9);lonEl.value=lo.toFixed(9);}
      if(!isFinite(la)||!isFinite(lo)){alert('مختصات معتبر نیست. GPS بگیرید یا مختصات دستی وارد کنید.');return;}
      const u=utm(la,lo), p=editId?db.points.find(x=>String(x.pointId)===String(editId)):null;
      const now=new Date(), id=p?p.pointId:`${r.id}-P-${String(db.points.filter(x=>x.riverId===r.id).length+1).padStart(4,'0')}`;
      const get=id=>document.getElementById(id);
      const t=keyV20(typeEl.value);
      const obj={...(p||{}),pointId:id,riverId:r.id,riverName:r.name,date:p?.date||now.toLocaleDateString('fa-IR'),time:p?.time||now.toLocaleTimeString('fa-IR'),latitude:la,longitude:lo,utmZone:Number(zoneEl?.value)||u.zone,utmHemisphere:h||(la<0?'S':'N'),utmEasting:Number(eastEl?.value)||u.e,utmNorthing:Number(northEl?.value)||u.n,altitude:parseFloat(get('alt')?.value)||null,accuracy:parseFloat(get('acc')?.value)||null,pointType:t,bedStatus:get('bed')?.value||'',bufferStatus:get('buffer')?.value||'',waterwayStatus:get('water')?.value||'',violationType:get('violation')?.value||'',description:get('desc')?.value||'',action:get('action')?.value||'',riskLevel:get('risk')?.value||'C',caseNumber:get('caseNo')?.value||'',warningNumber:get('warningNo')?.value||'',followUpStatus:get('follow')?.value||'',nextVisit:get('next')?.value||'',inspector:get('insp')?.value||'سالار علی زاده',specialData:typeof collectSpecial==='function'?collectSpecial(t,p?.specialData||{}):(p?.specialData||{}),photoCount:p?.photoCount||0,updatedAt:now.toISOString(),createdAt:p?.createdAt||now.toISOString(),gpsSource:window.gps?.source||p?.gpsSource||'manual'};
      if(p) Object.assign(p,obj); else db.points.push(obj);
      const files=typeof collectPhotoFilesV20==='function'?await collectPhotoFilesV20():[];
      let added=0;
      for(const f of files){
        let data;try{data=await watermarkedUTM(f,{zone:obj.utmZone,hemisphere:obj.utmHemisphere,e:obj.utmEasting,n:obj.utmNorthing,date:obj.date,time:obj.time},id)}catch(err){data=await fileData(f)}
        const pid='PHOTO-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
        const ph={id:pid,pointId:id,riverId:r.id,name:f.name,type:'image/jpeg',originalType:f.type,data,createdAt:now.toISOString(),latitude:la,longitude:lo,utmZone:obj.utmZone,utmHemisphere:obj.utmHemisphere,utmEasting:obj.utmEasting,utmNorthing:obj.utmNorthing,gpsSource:window.gps?.source||'point_capture',date:obj.date,time:obj.time,watermarked:true,watermarkType:'UTM'};
        await put('photos',ph); db.photos=db.photos||[]; const old=db.photos.findIndex(x=>x.id===pid); if(old>=0)db.photos[old]=ph;else db.photos.push(ph); added++;
      }
      obj.photoCount=(p?.photoCount||0)+added;
      await save();
      alert(added?`نقطه ${id} و ${added} عکس با موفقیت ذخیره شد.`:`نقطه ${id} با موفقیت ذخیره شد.`);
      show('home');
    }catch(err){console.error('V21 savePointForm',err);alert('ثبت نقطه انجام نشد.\nجزئیات خطا: '+(err?.message||err));}
  };

  window.photoBank=async function(){
    const ps=(await getAll('photos')).slice().reverse();
    app.innerHTML=`<div class="card"><div class="sectionTitle"><h2>📷 بانک عکس پایش</h2><span class="badge">${ps.length} عکس</span></div><p class="muted">تمام عکس‌های ثبت‌شده در سامانه، با مختصات UTM و مشخصات نقطه.</p><div class="row"><button onclick="exportPhotoBankV21()">📦 خروجی عکس‌ها + Excel</button><button class="secondary" onclick="show('new')">📷 ثبت عکس جدید</button></div></div><div class="photoBankGrid">${ps.map(p=>`<div class="photoItem"><img src="${p.data}" loading="lazy"><b>${esc21(p.name||p.id)}</b><div class="mini">${esc21(p.pointId||'')} · ${esc21(p.date||'')}</div><div class="mini coord">UTM ${esc21((p.utmZone||'')+(p.utmHemisphere||''))} / ${Number(p.utmEasting||0).toFixed(2)} / ${Number(p.utmNorthing||0).toFixed(2)}</div><a download="${esc21(p.name||p.id)}" href="${p.data}">⬇️ دریافت عکس</a></div>`).join('')||'<div class="card muted">هنوز عکسی ثبت نشده است.</div>'}</div>`;
  };

  window.exportPhotoBankV21=async function(){
    try{
      const ps=await getAll('photos');
      if(!ps.length){alert('بانک عکس خالی است.');return;}
      const rows=[['Photo ID','Point ID','River ID','Filename','Date','Time','Latitude','Longitude','UTM Zone','Hemisphere','Easting','Northing','GPS Source','Watermarked','Photo File']];
      const files=[];
      ps.forEach((p,i)=>{const ext=fileExt21(p);const safe=`photos/${String(i+1).padStart(4,'0')}_${String(p.pointId||'point').replace(/[^\w\-آ-ی]+/g,'_')}.${ext}`;rows.push([p.id,p.pointId,p.riverId,p.name,p.date,p.time,p.latitude,p.longitude,p.utmZone,p.utmHemisphere,p.utmEasting,p.utmNorthing,p.gpsSource,p.watermarked?'بله':'خیر',safe]);files.push({name:safe,data:dataBytes21(p.data)});});
      const xlsx=xlsxBytes21([['بانک عکس',rows]]);files.unshift({name:'بانک_عکس_پایش_منابع_آب.xlsx',data:xlsx});
      files.push({name:'README.txt',data:'پایش منابع آب - بانک عکس\nفایل Excel شامل مشخصات همه عکس‌هاست و پوشه photos شامل خود عکس‌های ثبت‌شده است.\n'});
      dl21(zipStore(files),'بانک_عکس_پایش_منابع_آب_V21.zip','application/zip');
    }catch(e){console.error(e);alert('خروجی بانک عکس ساخته نشد: '+(e?.message||e));}
  };

  window.exportDailyReportV20=async function(){
    try{
      const today=today21(),ps=db.points.filter(p=>String(p.date||'')===today),allPhotos=await getAll('photos'),photos=allPhotos.filter(x=>x.date===today||ps.some(p=>p.pointId===x.pointId)),cases=(db.cases||[]).filter(c=>String(c.date||'')===today||ps.some(p=>p.pointId===c.pointId));
      const sheets=[];
      sheets.push(['خلاصه روز',[['گزارش پایش روزانه','پایش منابع آب'],['کارشناس','سالار علی زاده'],['تاریخ',today],['تعداد نقاط',ps.length],['تعداد عکس',photos.length],['تعداد پرونده جدید/مرتبط',cases.length],['تعداد فرم‌های تخصصی',new Set(ps.map(p=>keyV20(p.pointType))).size]]]);
      if(window.FORM_DEFS){Object.keys(window.FORM_DEFS).forEach(t=>{const rows=ps.filter(p=>keyV20(p.pointType)===t);if(rows.length)sheets.push([window.FORM_DEFS[t].sheet,window.specializedRowsGlobal(t,rows)])});}
      sheets.push(['نقاط پایش',[window.baseColsGlobal(),...ps.map(p=>window.baseRowGlobal(p))]]);
      sheets.push(['عکس‌ها',[['Photo ID','Point ID','River ID','Filename','Date','Time','UTM Zone','Hemisphere','Easting','Northing','Latitude','Longitude','Watermarked'],...photos.map(x=>[x.id,x.pointId,x.riverId,x.name||'',x.date||'',x.time||'',x.utmZone||'',x.utmHemisphere||'',x.utmEasting||'',x.utmNorthing||'',x.latitude||'',x.longitude||'',x.watermarked?'بله':'خیر'])]]);
      sheets.push(['پرونده‌ها',[['Case ID','Case Number','River','Point ID','Status','Last Action','Latitude','Longitude','UTM Zone','Easting','Northing'],...cases.map(c=>[c.id,c.number||'',c.riverName||'',c.pointId||'',c.status||'',c.lastAction||'',c.latitude||'',c.longitude||'',c.utmZone||'',c.utmEasting||'',c.utmNorthing||''])]]);
      downloadXLSX(sheets,`گزارش_پایش_روزانه_${today.replace(/[\/:*?"<>|]/g,'-')}.xlsx`);
    }catch(e){console.error('daily report',e);alert('گزارش امروز ساخته نشد: '+(e?.message||e));}
  };

  const oldNewPoint=window.newPoint;
  window.newPoint=function(editId){try{oldNewPoint(editId);setTimeout(()=>{const p=editId&&db.points.find(x=>String(x.pointId)===String(editId));const i=document.getElementById('insp');if(i&&!i.value)i.value='سالار علی زاده';},50)}catch(e){console.error(e);alert('فرم ثبت نقطه باز نشد: '+(e?.message||e));}};
  window.V21={version:V21,inspector:'سالار علی زاده'};
})();
