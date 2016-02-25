/**
 * shiftzoom.js 2.64 (09-Feb-2009) (c) by Christian Effenberger 
 * All Rights Reserved. Source: shiftzoom.netzgesta.de
 * Distributed under Netzgestade Software License Agreement.
 * This license permits free of charge use on non-commercial 
 * and private web sites only under special conditions. 
 * Read more at... http://www.netzgesta.de/cvi/LICENSE.txt
 *
 * syntax:
	shiftzoom.defaultFading = true;		//BOOLEAN startup fading
	shiftzoom.defaultButtons = true;	//BOOLEAN left top info & zoom buttons
	shiftzoom.defaultNozoom = false;	//BOOLEAN disable zooming feature
	shiftzoom.defaultZoom = 0;			//INT/FLOAT 0-100 (%) zooming percentage
	shiftzoom.defaultXpos = 50;			//INT/FLOAT 0-100 (%) horizontal position
	shiftzoom.defaultYpos = 50;			//INT/FLOAT 0-100 (%) vertical position
	shiftzoom.defaultOpacity = 90;		//INT 0-100 (%) zoom button opacity
	shiftzoom.defaultMillisec = 40;		//INT 5-100 zoom interval delay
	shiftzoom.defaultIntitle = '';		//STR 'click or press shift key to zoom in'
	shiftzoom.defaultOuttitle = '';		//STR 'click or press alt key to zoom out'
	shiftzoom.defaultInfoblock = '';	//STR '<dl><div align="right">Mouseover <big>Keyboard Support<\/big><\/div><dt>Zoom in:<\/dt><dd>[+] / [PgDn] / [End] <em>(is faster)<\/em> /<br \/> [shift] + <u>left</u> mouse button /<br \/><u>middle</u> / <u>wheel</u> mouse button /<br \/>mouse wheel <u>down</u><small><br \/><br \/><\/small><\/dd><dt>Zoom out:<\/dt><dd>[–] / [PgUp] / [Home] <em>(is faster)<\/em> /<br \/> [alt] + <u>left</u> mouse button /<br \/><u>right</u> mouse button /<br \/>mouse wheel <u>up</u><small><br \/><br \/><\/small><\/dd><dt>Pan / Shift / Move:<\/dt><dd>[left] / [right] / [down] / [up] arrow buttons<br \/>+ [shift] <em>(is faster)</em> and + [alt] <em>(is slower)<\/em><\/dd><\/dl>'
	shiftzoom.defaultCurpath = '';		//STR cursor path (*.cur) IE only
	shiftzoom.defaultLowres = '';		//STR lowres image (dimension should equal elements width and height)
	shiftzoom.defaultShowcoords = false;//BOOLEAN show coordinates
	shiftzoom.defaultPixelcoords = true;//BOOLEAN Pixel instead of Latitude/Longitude coordinates
	shiftzoom.defaultPercentcoords=false;//BOOLEAN Percentage instead of Lat/Lon/Pixel coordinates
	shiftzoom.defaultOverview = true;	//BOOLEAN show overview
	shiftzoom.defaultOvsfact = 25;		//INT 10-50 (%) overview size percentage
	shiftzoom.defaultOvaopac = 75;		//INT 0-100 (%) overview area opacity
	shiftzoom.defaultOvacolor = 'red';	//STR overview area css color 
	shiftzoom.defaultOvbcolor = 'white';//STR overview border css color
	shiftzoom.defaultOvborder = '';		//INT 0-20 (px) or "" overview border width
	shiftzoom.add( image, options );
	shiftzoom.add( image, { fading: value, buttons: value, nozoom: value, zoom: value, xpos: value, ypos: value, overview: value, curpath: value, intitle: value, outtitle: value, millisec: value, ovaopac: value, opacity: value, ovborder: value, ovacolor: value, ovbcolor: value, ovsfact: value } );
	shiftzoom.remove( image );
	shiftzoom.source( image, URI, value ); //BOOLEAN with fading
	shiftzoom.lowsource( image, URI ); 
	shiftzoom.set( image, ['buttons'|'overview'|'showcoords'|'pixelcoords'|'percentcoords'|'zoomin'|'zoomout'|'nozoom'], [true|false] );
INT=shiftzoom.get( image, ['maxzoomx'|'maxzoomy'|'maxwidth'|'maxheight'] );
BOL=shiftzoom.get( image, 'playing' );
OBJ=shiftzoom.get( image, 'currentxyz' );//returns current x=Xpos, y=Ypos and z=Zoom as INT/FLOAT 0-100 (%)
FLT=shiftzoom.version;
STR=shiftzoom.released;
	shiftzoom.zooming( image, value );	//INT 0 - 100 (%) zoom factor (e.g. 33.33)
	shiftzoom.moveto( image, x, y );	//INT x|y from within natural image dimension (e.g. 400,297) or
										//STR Lon|Lat (e.g. '52.04','-23.4405') or
										//STR %|% (e.g. '50%','50%')
	shiftzoom.kenburns( image, x, y, z, e, s, d, callback, arg ); //INT x|y|z 0 - 100 (%) move/zoom factor
										//FLT 0-2|3 e == progression [< 1 == ease-out | 1 == linear | > 1 == ease-in | 3 == ease-in-out] (default: 1) optional (set to false for default value if you want to use callback)
										//INT 10-100 s equals animation steps (default: auto equals max distance/interval delay) optional (set to false for default value if you want to use callback)
										//INT 10-100 d equals interval delay (default: 30) optional (set to false for default value if you want to use callback)
										//STR callback function name (executes on end playing)
										//STR arg callback function argument 
	shiftzoom.play( image, delay, loop, array, callback ); //INT delay between anims (millisec)
										//BOOLEAN endless loop or once
										//OBJ two dimensional Array [[x,y,z,e,s,d], [x,y,z,e,s,d]...] (syntax like kenburns)
										//STR callback function name (executes on stop playing)
	shiftzoom.stop( image ); 			//stop auto playing
 *
**/

var cvi_sztimer, cvi_szactive, cvi_szimage=null, shiftzoom = { _shiftzoom : null, version : 2.64, released : '2009-02-09 14:50:00',
	defaultFading : true, defaultButtons : true, defaultOverview : true, defaultNozoom : false,
	defaultShowcoords : false, defaultPixelcoords : true, defaultPercentcoords : false, defaultLowres : '', defaultMillisec : 40, 
	defaultOpacity : 90, defaultOvsfact : 25, defaultOvaopac : 75, defaultOvacolor : 'red', defaultOvbcolor : 'white',
	defaultIntitle : 'click or press shift key to zoom in', defaultOuttitle : 'click or press alt key to zoom out',
	defaultInfoblock : '<dl><div align="right">Mouseover <big>Keyboard Support<\/big><\/div><dt>Zoom in:<\/dt><dd>[+] / [PgDn] / [End] <em>(is faster)<\/em> /<br \/> [shift] + <u>left</u> mouse button /<br \/><u>middle</u> / <u>wheel</u> mouse button /<br \/>mouse wheel <u>down</u><small><br \/><br \/><\/small><\/dd><dt>Zoom out:<\/dt><dd>[–] / [PgUp] / [Home] <em>(is faster)<\/em> /<br \/> [alt] + <u>left</u> mouse button /<br \/><u>right</u> mouse button /<br \/>mouse wheel <u>up</u><small><br \/><br \/><\/small><\/dd><dt>Pan / Shift / Move:<\/dt><dd>[left] / [right] / [down] / [up] arrow buttons<br \/>+ [shift] <em>(is faster)</em> and + [alt] <em>(is slower)<\/em><\/dd><\/dl>',
	defaultOvborder : '', defaultCurpath : '', defaultZoom : 0, defaultXpos : 50, defaultYpos : 50,
	add : function(img,opts) {
		function roundTo(val,dig) {var num=val; if(val>8191&&val<10485) {val=val-5000; num=Math.round(val*Math.pow(10,dig))/Math.pow(10,dig); num=num+5000;}else {num=Math.round(val*Math.pow(10,dig))/Math.pow(10,dig);} return num;}
		function uniqueID() {var val=Date.parse(new Date())+Math.floor(Math.random()*100000000000); return val.toString(16);}
		function boxShadow() {var bs=false,mbs=false,kbs=false,wbs=false; try {bs=(document.body.style.boxShadow!==undefined);}catch(e) {} try {mbs=(document.body.style.MozBoxShadow!==undefined);}catch(e) {} try {kbs=(document.body.style.KhtmlBoxShadow!==undefined);}catch(e) {} try {wbs=(document.body.style.WebkitBoxShadow!==undefined);}catch(e) {} return (bs||mbs||kbs||wbs?true:false);}
		if(!img.ctrlid) {
			var defopts={"curpath" : shiftzoom.defaultCurpath, "opacity" : shiftzoom.defaultOpacity, "millisec" : shiftzoom.defaultMillisec, "intitle" : shiftzoom.defaultIntitle, "outtitle" : shiftzoom.defaultOuttitle, "infoblock" : shiftzoom.defaultInfoblock, "ovsfact" : shiftzoom.defaultOvsfact, "ovaopac" : shiftzoom.defaultOvaopac, "ovacolor" : shiftzoom.defaultOvacolor, "ovbcolor" : shiftzoom.defaultOvbcolor, "zoom" : shiftzoom.defaultZoom, "xpos" : shiftzoom.defaultXpos, "ypos" : shiftzoom.defaultYpos, "lowres" : shiftzoom.defaultLowres };
			if(opts) {for(var i in defopts){if(!opts[i]){opts[i]=defopts[i];}}}else{opts=defopts;}
			if(document.images&&document.createElement&&document.getElementById&&document.getElementsByTagName) {img.opts=defopts; img.highres=img.src;
				if(img.naturalWidth && img.naturalHeight) {img.xfactor=roundTo(img.naturalWidth/img.width,4); img.yfactor=roundTo(img.naturalHeight/img.height,4); img.maxwidth=img.naturalWidth; img.maxheight=img.naturalHeight;}
				else {var tmp=new Image; tmp.src=img.src; img.xfactor=roundTo(tmp.width/img.width,4); img.yfactor=roundTo(tmp.height/img.height,4); img.maxwidth=tmp.width; img.maxheight=tmp.height; delete tmp;}
				if(img.width>=100&&img.width<img.maxwidth&&img.height>=100&&img.height<img.maxheight){
					img.fading=(typeof opts['fading']==='boolean'?opts['fading']:shiftzoom.defaultFading);
					img.buttons=(typeof opts['buttons']==='boolean'?opts['buttons']:shiftzoom.defaultButtons);
					img.nozoom=(typeof opts['nozoom']==='boolean'?opts['nozoom']:shiftzoom.defaultNozoom);
					img.overview=(typeof opts['overview']==='boolean'?opts['overview']:shiftzoom.defaultOverview);
					img.showcoords=(typeof opts['showcoords']==='boolean'?opts['showcoords']:shiftzoom.defaultShowcoords);
					img.pixelcoords=(typeof opts['pixelcoords']==='boolean'?opts['pixelcoords']:shiftzoom.defaultPixelcoords);
					img.percentcoords=(typeof opts['percentcoords']==='boolean'?opts['percentcoords']:shiftzoom.defaultPercentcoords);
					img.lowres=(typeof opts['lowres']==='string'?opts['lowres']:img.opts['lowres']);
					img.curpath=(typeof opts['curpath']==='string'?opts['curpath']:img.opts['curpath']);
					img.intitle=(typeof opts['intitle']==='string'?opts['intitle']:img.opts['intitle']);
					img.outtitle=(typeof opts['outtitle']==='string'?opts['outtitle']:img.opts['outtitle']);
					img.infoblock=(typeof opts['infoblock']==='string'?opts['infoblock']:img.opts['infoblock']); img.defblock=img.infoblock;
					img.ovacolor=(typeof opts['ovacolor']==='string'?opts['ovacolor']:img.opts['ovacolor']);
					img.ovbcolor=(typeof opts['ovbcolor']==='string'?opts['ovbcolor']:img.opts['ovbcolor']);
					img.ovsfact=(typeof opts['ovsfact']==='number'?parseInt(Math.min(Math.max(10,opts['ovsfact']),50)):img.opts['ovsfact'])/100;
					img.millisec=(typeof opts['millisec']==='number'?parseInt(Math.min(Math.max(5,opts['millisec']),100)):img.opts['millisec']);
					img.ovaopac=(typeof opts['ovaopac']==='number'?parseInt(Math.min(Math.max(0,opts['ovaopac']),100)):img.opts['ovaopac']);
					img.opacity=(typeof opts['opacity']==='number'?parseInt(Math.min(Math.max(0,opts['opacity']),100)):img.opts['opacity']);
					img.ovborder=(typeof opts['ovborder']==='number'?parseInt(Math.min(Math.max(0,opts['ovborder']),20)):Math.min(Math.round(img.width/100),Math.round(img.height/100)));
					img.zoom=(typeof opts['zoom']==='number'?parseFloat(Math.min(Math.max(0,opts['zoom']),100)):img.opts['zoom']);
					img.xpos=(typeof opts['xpos']==='number'?parseFloat(Math.min(Math.max(0,opts['xpos']),100)):img.opts['xpos']);
					img.ypos=(typeof opts['ypos']==='number'?parseFloat(Math.min(Math.max(0,opts['ypos']),100)):img.opts['ypos']);
					img.opts=null; defopts=null; img.bc="1px white solid"; img.dc="1px gray solid"; img.automode=false; img.autoloop=false; img.autowait=0; img.zoomin=false; img.zoomout=false;
					if(img.fading) {if(img.trident) {img.style.filter="alpha(opacity=0)";}else{img.style.opacity=0;}} img.style.visibility='visible';
					var st=img.parentNode.style; st.position=(st.position=='static'||st.position==''?'relative':st.position); st.height=img.height+'px'; st.width=img.width+'px'; 
					st.padding='0px'; st.overflow='hidden'; st.MozUserSelect="none"; st.KhtmlUserSelect="none"; img.parentNode.unselectable="on"; st.border="none";
					st=img.style; st.MozUserSelect="none"; st.KhtmlUserSelect="none"; img.unselectable="on"; st.display="block"; st.position="absolute"; img.left=0; img.top=0; 
					st.left='0px'; st.top='0px'; img.minwidth=img.width; img.minheight=img.height; img.maxleft=img.maxwidth-img.minwidth; img.maxtop=img.maxheight-img.minheight;
					st.width=img.width+'px'; st.height=img.height+'px'; st.msInterpolationMode="bicubic"; st.cursor="crosshair"; img.pointer=st.cursor;
					img.trident=document.all&&!window.opera?1:0; img.webkit=window.atob!=undefined&&!window.updateCommands?1:0; 
					img.gecko=navigator.userAgent.indexOf('Gecko')>-1&&window.updateCommands?1:0; img.presto=window.opera?1:0; img.bshadow=boxShadow();
					img.bmode=(img.trident&&(document.compatMode=='BackCompat'||document.compatMode=='QuirksMode')?true:false); if(img.id!=""){}else {img.id=uniqueID();}
					var over=shiftzoom.E('img'); over.src=''; over.style.display='none'; over.id=img.id+'_isrc'; img.parentNode.appendChild(over); img.isrcid=over.id;
					over=shiftzoom.E('div'); over.id=img.id+'_xyco'; st=over.style; if(img.trident) {st.backgroundColor='black';} st.height='auto'; st.width='auto'; 
					st.display='block'; st.position='absolute'; st.left='0px'; st.bottom='0px'; st.MozUserSelect="none"; st.KhtmlUserSelect="none"; over.unselectable="on"; 
					if(img.fading&&img.showcoords||!img.showcoords) {st.visibility='hidden';} img.parentNode.appendChild(over); img.xycoid=over.id; 
					if(!img.trident) {var view=shiftzoom.E('div'); st=view.style; st.height='100%'; st.width='100%'; st.left='0px'; st.bottom='0px'; st.position='absolute'; st.backgroundColor='black'; st.opacity=0.5; over.appendChild(view);}
					view=shiftzoom.E('div'); view.id=img.id+'_cpos'; view.innerHTML="x:0 y:0"; view.unselectable="on"; st=view.style; st.textAlign='left'; st.verticalAlign='middle'; st.left='0px'; st.bottom='0px';
					st.position='relative'; st.display='block'; st.color='white'; st.fontSize='10px'; st.fontFamily='Arial, Helvetica, sans-serif'; st.fontStyle='normal'; 
					st.fontWeight='bold'; st.whiteSpace='nowrap'; st.padding='2px 4px'; st.textShadow='0px 0px 4px black'; over.appendChild(view); img.cposid=view.id;
					var over=shiftzoom.E('div'); st=over.style; if(img.fading&&img.buttons||!img.buttons) {st.visibility='hidden';} over.id=img.id+'_ctrl'; st.height='16px'; 
					st.width='42px'; st.display="block"; st.position='absolute'; st.lineHeight='1px'; st.fontSize='1px'; st.backgroundColor="#cccccc";
					if(img.trident) {st.filter="alpha(opacity="+img.opacity+")";}else{st.opacity=img.opacity/100;} st.cursor='pointer'; st.left='0px'; st.top='0px'; st.boxShadow="0px 0px 8px black"; 
					st.MozBoxShadow="0px 0px 8px black"; st.KhtmlBoxShadow="0px 0px 8px black"; st.WebkitBoxShadow="0px 0px 8px black"; img.parentNode.appendChild(over); img.ctrlid=over.id;
					var view=shiftzoom.E('div'); st=view.style; st.height='2px'; st.width='2px'; st.position='absolute'; st.lineHeight='1px'; st.fontSize='1px'; st.left='4px'; st.top='3px'; st.backgroundColor="black"; over.appendChild(view);
					view=shiftzoom.E('div'); st=view.style; st.height='6px'; st.width='2px'; st.position='absolute'; st.lineHeight='1px'; st.fontSize='1px'; st.left='4px'; st.top='7px'; st.backgroundColor="black"; over.appendChild(view);
					view=shiftzoom.E('div'); st=view.style; st.height='2px'; st.width='8px'; st.position='absolute'; st.lineHeight='1px'; st.fontSize='1px'; st.left='14px'; st.top='7px'; st.backgroundColor="black"; over.appendChild(view);
					view=shiftzoom.E('div'); st=view.style; st.height='8px'; st.width='2px'; st.position='absolute'; st.lineHeight='1px'; st.fontSize='1px'; st.left='17px'; st.top='4px'; st.backgroundColor="black"; over.appendChild(view);
					view=shiftzoom.E('div'); st=view.style; st.height='2px'; st.width='8px'; st.position='absolute'; st.lineHeight='1px'; st.fontSize='1px'; st.left='30px'; st.top='7px'; st.backgroundColor="black"; over.appendChild(view);
					view=shiftzoom.E('div'); view.id=img.id+'_kbin'; st=view.style; st.height=(img.bmode?16:14)+'px'; st.cursor='help'; st.width=(img.bmode?10:8)+'px'; st.display="block"; 
					st.position='absolute'; st.border=img.bc; st.borderBottom=img.dc; st.borderRight=img.dc; st.left='0px'; st.top='0px'; img.ttipid=img.id+'_ttip';
					if(img.trident) {view.onmouseover=new Function('shiftzoom._showTooltip("'+img.id+'");'); view.onmouseout=new Function('shiftzoom._killTooltip("'+img.id+'");');}
					else {view.setAttribute("onmouseover","shiftzoom._showTooltip('"+img.id+"');"); view.setAttribute("onmouseout","shiftzoom._killTooltip('"+img.id+"');");} 
					over.appendChild(view); img.kbinid=view.id; view=shiftzoom.E('div'); view.id=img.id+'_zoin'; view.title=img.intitle; st=view.style; st.height=(img.bmode?16:14)+'px'; st.width=(img.bmode?16:14)+'px'; 
					st.display="block"; st.position='absolute'; st.border=img.bc; st.borderBottom=img.dc; st.borderRight=img.dc; st.left='10px';st.top='0px';
					if(img.trident) {view.onclick=new Function('shiftzoom._setCursor(this,1,"'+img.id+'");');}else {view.setAttribute("onclick","shiftzoom._setCursor(this,1,'"+img.id+"');");}
					over.appendChild(view); img.zoinid=view.id; view=shiftzoom.E('div'); view.id=img.id+'_zout'; view.title=img.outtitle; st=view.style; st.height=(img.bmode?16:14)+'px'; st.width=(img.bmode?16:14)+'px'; 
					st.display="block"; st.position='absolute'; st.border=img.bc; st.borderBottom=img.dc; st.borderRight=img.dc; st.left='26px'; st.top='0px';
					if(img.trident) {view.onclick=new Function('shiftzoom._setCursor(this,0,"'+img.id+'");');}else {view.setAttribute("onclick","shiftzoom._setCursor(this,0,'"+img.id+"');"); }
					over.appendChild(view); img.zoutid=view.id; over=shiftzoom.E('div'); over.id=img.id+'_info'; st=over.style; st.visibility='hidden'; st.height='16px'; st.width='7em'; st.left=(img.buttons?'42px':'0px'); st.top='0px';
					st.display="block"; st.overflow='hidden'; st.position='absolute'; st.lineHeight='16px'; st.fontSize='10px'; st.fontFamily='Arial, Helvetica, sans-serif'; 
					st.fontStyle='normal'; st.fontWeight='bold'; st.textShadow='0px 0px 4px black'; st.color="#ffffff"; if(img.trident) {st.filter="alpha(opacity=100)";}else{st.opacity=1;}
					st.cursor='default'; img.parentNode.appendChild(over); img.infoid=over.id; view=shiftzoom.E('div'); st=view.style; st.position='absolute'; st.height='16px'; st.width='7em'; st.left='0px'; st.top='0px';
					st.display="block"; st.backgroundColor="#000000"; if(img.trident) {st.filter="alpha(opacity=50)";}else{st.opacity=0.50;} over.appendChild(view); 
					view=shiftzoom.E('div'); view.id=img.id+'_text'; st=view.style; st.position='absolute'; st.height='16px'; st.width='7em'; st.left='0px'; st.top='0px'; st.textAlign='center';
					st.verticalAlign='middle'; st.overflow='hidden'; st.display="block"; st.color="#ffffff"; if(img.trident) {st.filter="alpha(opacity=100)";} 
					over.appendChild(view); img.textid=view.id; view.innerHTML="100 / "+parseInt(img.xfactor*100)+" %"; over=shiftzoom.E('div'); over.id=img.id+'_over'; st=over.style; st.height=(img.height*img.ovsfact)+'px'; st.width=(img.width*img.ovsfact)+'px'; 
					st.display="block"; st.position='absolute'; st.bottom='0px'; st.right='0px'; st.borderLeft=img.ovborder+'px solid '+img.ovbcolor; st.borderTop=img.ovborder+'px solid '+img.ovbcolor;
					if(img.webkit||img.bshadow) {st.borderLeft='0px solid '+img.ovbcolor; st.borderTop='0px solid '+img.ovbcolor; st.boxShadow="0px 0px 8px black";
					st.WebkitBoxShadow="0px 0px 8px black"; st.MozBoxShadow="0px 0px 8px black"; st.KhtmlBoxShadow="0px 0px 8px black";}
					st.MozUserSelect="none"; st.KhtmlUserSelect="none"; st.visibility="hidden"; over.unselectable="on"; img.parentNode.appendChild(over);
					view=shiftzoom.E('img'); view.id=img.id+'_tumb'; view.src=img.src; st=view.style; st.height=(img.height*img.ovsfact)+'px'; st.width=(img.width*img.ovsfact)+'px';
					st.display="block"; st.position='absolute'; st.bottom='0px'; st.right='0px'; over.appendChild(view); img.tumbid=view.id; view.onmousedown=shiftzoom._catchDrag; 
					view=shiftzoom.E('div'); view.id=img.id+'_view'; view.maxleft=0; view.maxtop=0; st=view.style; st.lineHeight='1px'; st.fontSize='1px'; st.display="block"; st.position='absolute'; st.left='0px'; st.top='0px'; 
					st.border='1px solid '+img.ovacolor; st.height=parseInt((img.height*img.ovsfact)-(img.bmode?0:2))+'px'; st.width=parseInt((img.width*img.ovsfact)-(img.bmode?0:2))+'px';
					if(img.trident){st.background="url('"+img.curpath+"nop.gif') transparent"; st.filter="alpha(opacity="+img.ovaopac+")";}else{st.opacity=img.ovaopac/100;}
					over.appendChild(view); img.overid=over.id; img.viewid=view.id; view.onmousedown=shiftzoom._startMove;
					img.oncontextmenu=function() {return false;}; img.onmousedown=shiftzoom._catchKey; img.onmouseover=shiftzoom._catchOver; img.onmouseout=shiftzoom._catchOut;
					if(img.showcoords) {img.onmousemove=(img.pixelcoords?shiftzoom._showCoords:img.percentcoords?shiftzoom._showPercent:shiftzoom._showLatLon);} if(img.zoom>0&&img.fading&&img.overview) {img.overview=false; img.special=true;}
					if(img.zoom>0) {shiftzoom.zooming(img,img.zoom);} if(img.xpos!=50||img.ypos!=50) {shiftzoom.moveto(img,img.xpos+'%',img.ypos+'%');} if(img.fading) {shiftzoom._fadeImage(img.id,0);}
				}else {img.style.visibility='visible';}
			}else {img.style.visibility='visible';}
		} return false;
	},
	remove : function(img) {
		if(img&&typeof(img.ctrlid)==="string") {var ele,obj=img.parentNode; img.onmousedown=null; img.onmousemove=null; 
			document.onmousemove=null; document.onmouseup=null; document.onkeydown=null; document.onkeyup=null; document.onkeypress=null;
			if(img.gecko) {window.removeEventListener('DOMMouseScroll', shiftzoom._catchWheel, false);}else {window.onmousewheel=null;}
			ele=shiftzoom.G(img.overid); if(ele) {obj.removeChild(ele);} ele=shiftzoom.G(img.infoid); if(ele) {obj.removeChild(ele);}
			ele=shiftzoom.G(img.ctrlid); if(ele) {obj.removeChild(ele);} ele=shiftzoom.G(img.xycoid); if(ele) {obj.removeChild(ele);}
			img.width=img.minwidth; img.height=img.minheight; img.left=0; img.top=0; img.style.width=img.minwidth+'px'; img.style.height=img.minheight+'px'; 
			img.style.left='0px'; img.style.top='0px'; img.style.cursor="default"; img.ctrlid=false;
		}return false;
	},
	moveto : function(img,x,y) {
		if(img&&x&&y&&typeof(img.ctrlid)==="string") {
			if(img.width>img.minwidth||img.height>img.minheight) {
				function LFL(v,i,x){var d=parseFloat(v); if(d>x){d=x;}else if(d<i){d=i;} return d;}	
				if(typeof(x)=="string") {if(x.match(/^([+-])?\d*([\.])?\d*$/)) {x=Math.round((LFL(x,-180,180)+180)*(img.maxwidth/360));}else if(x.match(/^\d*([\.])?\d*([%]){1,1}$/)) {x=Math.round(img.maxwidth*(Math.max(0,Math.min(100,parseFloat(x)))/100));}else {x=0;}}
				if(typeof(y)=="string") {if(y.match(/^([+-])?\d*([\.])?\d*$/)) {y=Math.round(((LFL(y,-90,90)*-1)+90)*(img.maxheight/180));}else if(y.match(/^\d*([\.])?\d*([%]){1,1}$/)) {y=Math.round(img.maxheight*(Math.max(0,Math.min(100,parseFloat(y)))/100));}else {y=0;}}
				var h=Math.max(0,Math.min(img.maxleft,(x*(img.width/img.maxwidth))-(img.minwidth/2)));
				var v=Math.max(0,Math.min(img.maxtop,(y*(img.height/img.maxheight))-(img.minheight/2)));
				img.style.left=(h*-1)+'px'; img.style.top=(v*-1)+'px'; img.left=(h*-1); img.top=(v*-1);
				if(img.overview) {var view=shiftzoom.G(img.viewid).style;
					view.left=Math.round((Math.abs(parseInt(img.style.left))/(img.width/img.minwidth))*img.ovsfact)-(img.bmode?2:0)+'px';
					view.top=Math.round((Math.abs(parseInt(img.style.top))/(img.height/img.minheight))*img.ovsfact)-(img.bmode?2:0)+'px';
				}
			}
		}return false;
	},
	zooming : function(img,v) {
		if(img&&typeof(img.ctrlid)==="string") {
			if(typeof(v)==="number") {var mw,mh,mx,my,f; v=Math.max(0,Math.min(100,parseFloat(v))); f=v>0?v/100:0;
				mw=Math.round(f*(img.maxwidth-img.minwidth))+img.minwidth; mh=Math.round(f*(img.maxheight-img.minheight))+img.minheight;
				mx=Math.round((mw/2)-(img.minwidth/2))*-1; my=Math.round((mh/2)-(img.minheight/2))*-1;
				img.style.width=mw+'px'; img.style.height=mh+'px'; img.style.left=mx+'px'; img.style.top=my+'px'; 
				img.width=mw; img.height=mh; img.left=mx; img.top=my; img.maxleft=img.width-img.minwidth; img.maxtop=img.height-img.minheight;
				if(img.width>img.minwidth||img.height>img.minheight) {
					if(img.trident) {img.style.cursor="url('"+img.curpath+"grab.cur'),move";}else {img.style.cursor="move";}
					if(img.overview) {shiftzoom._setOverview(img); shiftzoom.G(img.overid).style.visibility="visible";}
				}else {img.style.cursor="crosshair"; if(img.overview) {shiftzoom.G(img.overid).style.visibility="hidden";}}
			}
		}return false;
	},
	kenburns : function(img,x,y,z,p,s,d,b,a) {
		if(img&&typeof(img.ctrlid)==="string") {
			function GNV(v){if(typeof(v)==="number") {v=Math.max(0,Math.min(100,parseFloat(v)));}else {v=0.5;} return v;}; var io=false; if(typeof(p)==="number") {if(p==3) {io=true;}else if(p==0) {p=1;}else {p=Math.max(0,Math.min(2,parseFloat(p)));}}else {p=1;} if(typeof(s)==="number") {s=Math.max(10,Math.min(100,parseInt(s)));} if(typeof(d)==="number") {d=Math.max(10,Math.min(100,parseInt(d)));}else {d=30;}
			var fz,mz,ix,iy,sw,sh,sx,sy,ew,eh,ex,ey; x=GNV(x); y=GNV(y); z=GNV(z); fz=z*0.01; if(img.lowres&&img.highres) {shiftzoom.source(img,img.lowres,false,true);} img.zoomin=false; img.zoomout=false;
			if(img.width>img.minwidth||img.height>img.minheight) {if(img.trident) {img.style.cursor="url('"+img.curpath+"grab.cur'),move";}else {img.style.cursor="move";}}else {img.style.cursor="crosshair";}
			ix=Math.round(img.maxwidth*(x*0.01)); iy=Math.round(img.maxheight*(y*0.01)); sw=parseInt(img.style.width); sh=parseInt(img.style.height); sx=parseInt(img.style.left); 
			sy=parseInt(img.style.top); ew=z>-1?Math.round(fz*(img.maxwidth-img.minwidth))+img.minwidth:sw; eh=z>-1?Math.round(fz*(img.maxheight-img.minheight))+img.minheight:sh; 
			ex=Math.max(0,Math.min(ew-img.minwidth,(ix*(ew/img.maxwidth))-(img.minwidth/2)))*-1; ey=Math.max(0,Math.min(eh-img.minheight,(iy*(eh/img.maxheight))-(img.minheight/2)))*-1;
			if(typeof(s)!=="number") {mz=Math.abs(Math.abs(ex)-Math.abs(sx)); mz=Math.max(mz,Math.abs(Math.abs(ey)-Math.abs(sy))); mz=Math.max(mz,Math.abs(Math.abs(ew)-Math.abs(sw))); mz=Math.max(mz,Math.abs(Math.abs(eh)-Math.abs(sh))); s=Math.round(mz/d);}
			if(img.timer) {window.clearInterval(img.timer);} var mx,my,mw,mh,q=0,c=0,t=s,k=1/t; img.timer=window.setInterval(function() {
			q=io?((-Math.cos((k*c)*Math.PI)/2)+0.5)||0:Math.pow((k*c),p)||0; 
			mw=Math.ceil(sw+(q*(ew-sw))); mh=Math.ceil(sh+(q*(eh-sh))); mx=Math.ceil(sx+(q*(ex-sx))); my=Math.ceil(sy+(q*(ey-sy)));
			img.style.width=mw+'px'; img.style.height=mh+'px'; img.style.left=mx+'px'; img.style.top=my+'px'; img.width=mw; img.height=mh; img.left=mx; img.top=my; 
			c++; if(c>t) {window.clearInterval(img.timer); img.maxleft=img.width-img.minwidth; img.maxtop=img.height-img.minheight; img.zoomin=false; img.zoomout=false;
				if(img.lowres&&img.highres) {shiftzoom.source(img,img.highres,false,true);} if(img.width>img.minwidth||img.height>img.minheight) {
					if(img.trident) {img.style.cursor="url('"+img.curpath+"grab.cur'),move";}else {img.style.cursor="move";} if(img.overview) {shiftzoom._setOverview(img); shiftzoom.G(img.overid).style.visibility="visible";}
				}else {img.style.cursor="crosshair"; if(img.overview) {shiftzoom.G(img.overid).style.visibility="hidden";}}
				if(img.automode) {window.setTimeout("shiftzoom._next(shiftzoom.G('"+img.id+"'))",img.autowait+1000);}else {if(b&&typeof(b)==="string"&&eval('typeof '+b)=="function") {window.setTimeout("window['"+b+"']('"+(typeof(a)=='number'||typeof(a)=='string'?a:'')+"')",200);}}}
			},d);
		}return false;
	},
	play : function(img,d,l,obj,c) {
		if(img&&typeof(img.ctrlid)==="string") {
			if(!img.automode&&typeof(d)==="number"&&typeof(l)==="boolean"&&typeof(obj)==="object") {
				if(obj.length>=1) {var n=0,mx=3,i; for(i=0; i<obj.length; ++i) {n=Math.max(0,obj[i].length);mx=n<mx?n:mx;} img.callback=c&&typeof(c)==="string"&&eval('typeof '+c)=="function"?c:Null;
					if(mx>=3) {img.step=obj; img.cpos=0; img.automode=true; img.autoloop=l; img.autowait=Math.abs(d); img.nozoom=true;
						if(img.overview) {shiftzoom.set(img,'overview',false);} if(img.buttons) {shiftzoom.set(img,'buttons',false);} if(img.showcoords) {shiftzoom.set(img,'showcoords',false);}
						eval('shiftzoom.kenburns(shiftzoom.G(img.id),'+shiftzoom._opts(img.step[img.cpos])+');');
					}
				}
			}
		}return false;
	},
	stop : function(img) {
		if(img&&typeof(img.ctrlid)==="string") {
			if(img.automode) {
				img.automode=false; if(img.timer) {window.clearInterval(img.timer);} img.autoloop=false; img.cpos=0; img.maxleft=img.width-img.minwidth; img.maxtop=img.height-img.minheight; 
				if(img.lowres&&img.highres) {shiftzoom.source(img,img.highres,false,true);} if(img.width>img.minwidth||img.height>img.minheight) {
					if(img.trident) {img.style.cursor="url('"+img.curpath+"grab.cur'),move";}else {img.style.cursor="move";} if(img.overview) {shiftzoom._setOverview(img); shiftzoom.G(img.overid).style.visibility="visible";}
				}else {img.style.cursor="crosshair"; if(img.overview) {shiftzoom.G(img.overid).style.visibility="hidden";}} if(img.callback) {window.setTimeout("window['"+img.callback+"']()",200);}
			}
		}return false;
	},
	source : function(img,src,v,z) {
		if(img&&typeof(img.ctrlid)==="string") {
			if(typeof(src)==="string"&&typeof(v)==="boolean") {
				var tmp=new Image(); 
				tmp.onload=function() {
					shiftzoom.G(img.ctrlid).style.visibility="hidden"; shiftzoom.G(img.overid).style.visibility="hidden"; shiftzoom.G(img.xycoid).style.visibility="hidden"; 
					if(v==true) {
						shiftzoom.G(img.isrcid).src=tmp.src; if(!z) {delete tmp;} shiftzoom._fadeOut(img.id,100);
					}else if(v==false) {
						img.src=tmp.src; img.style.msInterpolationMode="bicubic"; if(!z) {shiftzoom.G(img.tumbid).src=img.src; if(img.highres!=img.src) {img.highres=img.src;} delete tmp;} if(img.buttons) {shiftzoom.G(img.ctrlid).style.visibility="visible";}
						if(img.overview&&(img.width>img.minwidth||img.height>img.minheight)) {shiftzoom.G(img.overid).style.visibility="visible";} if(img.showcoords) {shiftzoom.G(img.xycoid).style.visibility="visible";}
					}
				}; tmp.src=src;
			}
		}return false;
	},
	lowsource : function(img,src) {
		if(img&&typeof(img.ctrlid)==="string") {
			if(typeof(src)==="string"&&!img.automode&&!img.zoomin&&!img.zoomout) {
				var low=new Image(); low.onload=function() {img.lowres=low.src; delete low;}; low.src=src;
			}
		}return false;
	},
	info : function(img,v) {
		if(img&&typeof(img.ctrlid)==="string") {
			if(v&&typeof(v)==="string") {img.infoblock=v;}else {img.infoblock=img.defblock;}
		}return false;
	},
	set : function(img,d,v) {
		if(img&&typeof(img.ctrlid)==="string") {
			if(d&&typeof(v)==="boolean") {
				switch(d.toLowerCase()) {
					case 'overview': if(v==false&&img.overview==true) {shiftzoom.G(img.overid).style.visibility="hidden";}else if(v==true&&img.overview==false) {
					if(img.width>img.minwidth||img.height>img.minheight) {shiftzoom._setOverview(img); shiftzoom.G(img.overid).style.visibility="visible";}else {shiftzoom.G(img.overid).style.visibility="hidden";}}img.overview=v; break;
					case 'showcoords': if(v==false&&img.showcoords==true) {img.onmousemove=null; shiftzoom.G(img.xycoid).style.visibility="hidden";}else 
					if(v==true&&img.showcoords==false) {shiftzoom.G(img.xycoid).style.visibility="visible"; img.onmousemove=shiftzoom._showCoords;}img.showcoords=v; break;
					case 'pixelcoords': if(v==false&&img.pixelcoords==true&&img.showcoords==true) {img.onmousemove=shiftzoom._showLatLon;}else 
					if(v==true&&img.pixelcoords==false&&img.showcoords==true) {img.onmousemove=shiftzoom._showCoords;}img.pixelcoords=v; break;
					case 'percentcoords': if(v==false&&img.percentcoords==true&&img.showcoords==true) {img.onmousemove=shiftzoom._showLatLon;}else 
					if(v==true&&img.percentcoords==false&&img.showcoords==true) {img.onmousemove=shiftzoom._showPercent;}img.percentcoords=v; break;
					case 'buttons': if(v==false&&img.buttons==true) {shiftzoom.G(img.ctrlid).style.visibility="hidden"; shiftzoom.G(img.infoid).style.left='0px';}else 
					if(v==true&&img.buttons==false) {shiftzoom.G(img.infoid).style.left='42px'; shiftzoom.G(img.ctrlid).style.visibility="visible";}img.buttons=v; break;
					case 'zoomin': if(!img.nozoom&&!img.buttons&&(parseInt(img.style.width)<img.maxwidth||parseInt(img.style.height)<img.maxheight)) {
					if(v==true) {img.zoomin=true; img.zoomout=false; if(img.gecko) {img.style.cursor="-moz-zoom-in";}else if(img.webkit) {img.style.cursor="-webkit-zoom-in";}
					else if(img.trident) {img.style.cursor="url('"+img.curpath+"zoom-in.cur'),crosshair";}else {img.style.cursor="crosshair";}}else {img.zoomin=false;}}break;
					case 'zoomout': if(!img.nozoom&&!img.buttons&&(parseInt(img.style.width)>img.minwidth||parseInt(img.style.height)>img.minheight)) {
					if(v==true) {img.zoomout=true; img.zoomin=false; if(img.gecko) {img.style.cursor="-moz-zoom-out";}else if(img.webkit) {img.style.cursor="-webkit-zoom-out";}
					else if(img.trident) {img.style.cursor="url('"+img.curpath+"zoom-out.cur'),crosshair";}else {img.style.cursor="crosshair";}}else {img.zoomout=false;}}break;
					case 'nozoom': img.nozoom=v; break;
				}
			}
		}return false;
	},
	get : function(img,d) {
		if(img&&d&&typeof(img.ctrlid)==="string") {
			if(d.toLowerCase()=="maxzoomx") {return img.xfactor;}else if(d.toLowerCase()=="maxzoomy") {return img.yfactor;}else
			if(d.toLowerCase()=="maxwidth") {return img.maxwidth;}else if(d.toLowerCase()=="maxheight") {return img.maxheight;}else
			if(d.toLowerCase()=="playing") {return img.automode;}else if(d.toLowerCase()=="currentxyz") {
				var x=Math.min(Math.max(parseFloat((Math.abs(parseInt(img.style.left))/img.width)*100)+(((img.minwidth/2)/img.width)*100),0),100);
				var y=Math.min(Math.max(parseFloat((Math.abs(parseInt(img.style.top))/img.height)*100)+(((img.minheight/2)/img.height)*100),0),100);
				var z=Math.min(Math.max(parseFloat(((img.width-img.minwidth)/(img.maxwidth-img.minwidth))*100),0),100);
				return {x:x,y:y,z:z};
			}	
		}return false;
	},
	G : function(v) {return(document.getElementById(v));},
	E : function(v) {return(document.createElement(v));},
	L : function(s,v) {s=s.toUpperCase()||'LOG'; if(window.console) {window.console[s.toLowerCase()](v);}else if(window.opera) {opera.postError(s+': '+v);}else {window.document.title=s+': '+v;}},
	_opts : function(v) {if(typeof(v)==="object") {var o=v[0]+','+v[1]+','+v[2]+(v.length>3?','+v[3]:'')+(v.length>4?','+v[4]:'')+(v.length>5?','+v[5]:'')+(v.length>6?','+v[6]:'')+(v.length>7?','+v[7]:''); return o;} return false;},	
	_next : function(img) {
		if(img&&typeof(img.ctrlid)==="string") {
			if(img.automode) {
				if(img.autoloop&&img.cpos<(img.step.length-1)) {img.cpos=img.cpos+1;}else if(img.autoloop&&img.cpos>=(img.step.length-1)) {img.cpos=0;}else if(!img.autoloop&&img.cpos<(img.step.length-1)) {img.cpos=img.cpos+1;}else {img.cpos=img.step.length; }
				if(img.cpos<img.step.length) {eval('shiftzoom.kenburns(shiftzoom.G(img.id),'+shiftzoom._opts(img.step[img.cpos])+');');}else {shiftzoom.stop(img);}
			}
		}return false;
	},
	_setOverview : function(img) {var view=shiftzoom.G(img.viewid);
		view.style.width=(Math.round((img.ovsfact*img.minwidth)/(img.width/img.minwidth))-(img.bmode?0:2))+'px';
		view.style.height=(Math.round((img.ovsfact*img.minheight)/(img.height/img.minheight))-(img.bmode?0:2))+'px';
		view.style.left=Math.round((Math.abs(img.left)/(img.width/img.minwidth))*img.ovsfact)-(img.bmode?2:0)+'px';
		view.style.top=Math.round((Math.abs(img.top)/(img.height/img.minheight))*img.ovsfact)-(img.bmode?2:0)+'px';
		view.maxleft=(img.minwidth*img.ovsfact)-(img.bmode?0:2)-parseInt(view.style.width); 
		view.maxtop=(img.minheight*img.ovsfact)-(img.bmode?0:2)-parseInt(view.style.height);
	},
	_findPosXY : function(ele) {var t,d={x:ele.offsetLeft, y:ele.offsetTop}; if(ele.offsetParent) { t=shiftzoom._findPosXY(ele.offsetParent); d.x+=t.x; d.y+=t.y;} return d;},
	_getMousePos : function (ex,ey,px,py) {var ox,oy,k={ox:0,oy:0,ex:ex,ey:ey };
		if(self.pageXOffset||self.pageYOffset) {ox=self.pageXOffset; if(ox>0&&px==ex) {ex-=ox;} oy=self.pageYOffset; if(oy>0&&py==ey) {ey-=oy;}}else 
		if(document.documentElement) {ox=document.documentElement.scrollLeft; oy=document.documentElement.scrollTop;}else 
		if(document.body) {ox=document.body.scrollLeft; oy=document.body.scrollTop;} k.ox=ox; k.oy=oy; k.ex=ex; k.ey=ey; return k;
	},
	_showCoords : function(e) {
		if(cvi_szactive!=null) {var k,t,x,y,ex,ey,px=0,py=0,o=shiftzoom.G(cvi_szactive),w=o.width,h=o.height;
			e=e?e:window.event; ex=e.clientX; ey=e.clientY; if(e.pageX||e.pageY) {px=e.pageX; py=e.pageY;} k=shiftzoom._getMousePos(ex,ey,px,py); 
			t=shiftzoom._findPosXY(o); x=Math.min(Math.max(k.ex+k.ox-t.x,0),w); y=Math.min(Math.max(k.ey+k.oy-t.y,0),h);
			shiftzoom.G(o.cposid).innerHTML='<span>x:'+x+' y:'+y+'<\/span>';
		}
	},
	_showPercent : function(e) {
		if(cvi_szactive!=null) {var k,t,x,y,z,ex,ey,px=0,py=0,na=!Number.prototype.toFixed?0:1,o=shiftzoom.G(cvi_szactive),w=o.width,h=o.height;
			e=e?e:window.event; ex=e.clientX; ey=e.clientY; if(e.pageX||e.pageY) {px=e.pageX; py=e.pageY;} k=shiftzoom._getMousePos(ex,ey,px,py); t=shiftzoom._findPosXY(o); 
			x=parseFloat((Math.min(Math.max(k.ex+k.ox-t.x,0.0),w)/w)*100); x=na?x.toFixed(2):parseInt(x); y=parseFloat((Math.min(Math.max(k.ey+k.oy-t.y,0.0),h)/h)*100); 
			y=na?y.toFixed(2):parseInt(y); z=parseFloat(((w-o.minwidth)/(o.maxwidth-o.minwidth))*100); z=na?z.toFixed(2):parseInt(z);
			shiftzoom.G(o.cposid).innerHTML='<span>x:'+x+'% y:'+y+'% z:'+z+'%<\/span>';
		}
	},
	_showLatLon : function(e) {
		if(cvi_szactive!=null) {function parseDMS(v,n){var d,m,s; d=parseInt(v); m=Math.abs(parseFloat(v-d)*60); s=Math.abs(parseFloat(parseInt(m)-m)*60); return Math.abs(d)+"°"+parseInt(m)+"'"+parseInt(s)+"'' "+n;}	
			var k,t,x,y,lat,lon,ex,ey,px=0,py=0,o=document.getElementById(cvi_szactive),w=o.width,h=o.height;
			e=e?e:window.event; ex=e.clientX; ey=e.clientY; if(e.pageX||e.pageY) {px=e.pageX; py=e.pageY;} k=shiftzoom._getMousePos(ex,ey,px,py); 
			t=shiftzoom._findPosXY(o); x=Math.min(Math.max(k.ex+k.ox-t.x,0),w); y=Math.min(Math.max(k.ey+k.oy-t.y,0),h);
			lon=(x*360/w)-180; lat=90-(y*180/h); lon=parseDMS(lon,lon!=0?(lon<0?"W":"E"):""); lat=parseDMS(lat,lat!=0?(lat<0?"S":"N"):"");
			shiftzoom.G(o.cposid).innerHTML='<span>Lat: '+lat+' &bull; Lon: '+lon+'<\/span>';
		}
	},
	_killTooltip : function(id) {var ison,img=shiftzoom.G(id); ison=shiftzoom.G(img.ttipid); if(ison) {document.getElementsByTagName("body")[0].removeChild(ison);}},
	_showTooltip : function(id) {var ison,over,view,img=shiftzoom.G(id); ison=shiftzoom.G(img.ttipid);
		if(!ison) {var t=shiftzoom._findPosXY(img.parentNode); over=shiftzoom.E('div'); if(img.trident) {over.style.backgroundColor='black';}
			over.id=img.ttipid; over.style.height='auto'; over.style.width='auto'; over.style.display='block'; over.style.position='absolute'; 
			over.style.left=(t.x+10)+'px'; over.style.top=t.y+'px'; over.style.visibility='visible'; over.style.border='solid 2px white';
			over.style.borderRadius='6px'; over.style.MozBorderRadius='6px'; over.style.KhtmlBorderRadius='6px'; over.style.WebkitBorderRadius='6px';
			over.style.boxShadow='0px 0px 8px black'; over.style.MozBoxShadow='0px 0px 8px black'; over.style.WebkitBoxShadow='0px 0px 8px black'; over.style.KhtmlBoxShadow='0px 0px 8px black';
			over.style.MozUserSelect="none"; over.style.KhtmlUserSelect="none"; over.unselectable="on"; document.getElementsByTagName("body")[0].appendChild(over); 
			if(!img.trident) {view=shiftzoom.E('div'); view.style.height='100%'; view.style.width='100%'; view.style.left='0px'; view.style.top='0px'; view.style.position='absolute'; view.style.opacity=0.5; 
			view.style.backgroundColor='black'; view.style.borderRadius='4px'; view.style.MozBorderRadius='4px'; view.style.KhtmlBorderRadius='4px'; view.style.WebkitBorderRadius='4px'; over.appendChild(view);} 
			view=shiftzoom.E('div'); view.style.display='block'; view.style.left='0px'; view.style.top='0px'; view.style.position='relative'; 
			view.style.textAlign='left'; view.style.verticalAlign='middle'; view.style.color='white'; view.style.fontSize='12px'; view.style.fontFamily='Arial,Helvetica,sans-serif'; 
			view.style.fontStyle='normal'; view.style.fontWeight='bold'; view.style.whiteSpace='nowrap'; view.style.textShadow='black 0px 0px 4px'; view.style.margin='10px';
			view.innerHTML=img.infoblock;
			over.appendChild(view);
		}
	},
	_setCursor : function(ele,d,id) {var img=shiftzoom.G(id);
		if(!img.nozoom) {var butt=shiftzoom.G(d==1?img.zoutid:img.zoinid).style; img.zoomin=false; img.zoomout=false; 
			ele.style.border=img.bc; ele.style.borderBottom=img.dc; ele.style.borderRight=img.dc;
			butt.border=img.bc; butt.borderBottom=img.dc; butt.borderRight=img.dc;
			if(d==1&&(parseInt(img.style.width)<img.maxwidth||parseInt(img.style.height)<img.maxheight)) {
				ele.style.border=img.bc; ele.style.borderTop=img.dc; ele.style.borderLeft=img.dc; img.zoomin=true;
				if(img.gecko) {img.style.cursor="-moz-zoom-in";}else if(img.webkit) {img.style.cursor="-webkit-zoom-in";}
				else if(img.trident) {img.style.cursor="url('"+img.curpath+"zoom-in.cur'),crosshair";}else {img.style.cursor="crosshair";}  
			}else if(d==0&&(parseInt(img.style.width)>img.minwidth||parseInt(img.style.height)>img.minheight)) {
				ele.style.border=img.bc; ele.style.borderTop=img.dc; ele.style.borderLeft=img.dc; img.zoomout=true;
				if(img.gecko) {img.style.cursor="-moz-zoom-out";}else if(img.webkit) {img.style.cursor="-webkit-zoom-out";}
				else if(img.trident) {img.style.cursor="url('"+img.curpath+"zoom-out.cur'),crosshair";}else {img.style.cursor="crosshair";}
			}else {img.style.cursor=img.pointer;}
		}
	},
	_zoomIn : function(id,ct,st,sw,ew,sh,eh,sx,ex,sy,ey,nz) {
		if(!nz) {var mw,mh,mx,my,obj=shiftzoom.G(id); 
			if(parseInt(obj.style.width)<obj.maxwidth||parseInt(obj.style.height)<obj.maxheight) {clearInterval(cvi_sztimer);
				mw=Math.max(obj.minwidth,Math.min(obj.maxwidth,Math.round(ew*ct/st+sw))); mx=Math.round(ex*ct/st+sx);
				mh=Math.max(obj.minheight,Math.min(obj.maxheight,Math.round(eh*ct/st+sh))); my=Math.round(ey*ct/st+sy);
				obj.style.width=mw+'px'; obj.style.height=mh+'px'; obj.style.left=mx+'px'; obj.style.top=my+'px'; ct++;
				shiftzoom.G(obj.textid).innerHTML=parseInt((mw/obj.minwidth)*100)+" / "+parseInt(obj.xfactor*100)+" %";
				cvi_sztimer=setInterval("shiftzoom._zoomIn('"+id+"',"+ct+","+st+","+sw+","+ew+","+sh+","+eh+","+sx+","+ex+","+sy+","+ey+","+nz+")",obj.millisec);
			}else {clearInterval(cvi_sztimer); 
			//if(obj.lowres&&obj.highres) {shiftzoom.source(obj,obj.highres,false,true);}
			}
		}
	},
	_zoomOut : function(id,rm,ct,st,sw,ew,sh,eh,sx,ex,sy,ey,nz) {
		if(!nz) {var mw,mh,mx,my,obj=shiftzoom.G(id); 
			if(parseInt(obj.style.width)>obj.minwidth||parseInt(obj.style.height)>obj.minheight) {clearInterval(cvi_sztimer);
				mw=Math.max(obj.minwidth,Math.min(obj.maxwidth,Math.round(ew*ct/st+sw))); mx=Math.round(ex*ct/st+sx); 
				mh=Math.max(obj.minheight,Math.min(obj.maxheight,Math.round(eh*ct/st+sh))); my=Math.round(ey*ct/st+sy);
				obj.style.width=mw+'px'; obj.style.height=mh+'px'; obj.style.left=mx+'px'; obj.style.top=my+'px'; ct++;
				shiftzoom.G(obj.textid).innerHTML=parseInt((mw/obj.minwidth)*100)+" / "+parseInt(obj.xfactor*100)+" %";
				cvi_sztimer=setInterval("shiftzoom._zoomOut('"+id+"',"+rm+","+ct+","+st+","+sw+","+ew+","+sh+","+eh+","+sx+","+ex+","+sy+","+ey+","+nz+")",obj.millisec);
			}else {clearInterval(cvi_sztimer); 
			//if(obj.lowres&&obj.highres) {shiftzoom.source(obj,obj.highres,false,true);} 
			if(obj.webkit&&rm){shiftzoom._stopZoom();}}
		}
	},
	_stopZoom : function() {
		var view, butt, img=shiftzoom._shiftzoom; document.onmouseup=null;
		clearInterval(cvi_sztimer); img.zoomin=false; img.zoomout=false;
		img.left=parseInt(img.style.left); img.top=parseInt(img.style.top);
		img.width=parseInt(img.style.width); img.height=parseInt(img.style.height);
		img.maxleft=img.width-img.minwidth; img.maxtop=img.height-img.minheight;
		if(img.width>img.minwidth||img.height>img.minheight) {
			if(img.trident) {img.style.cursor="url('"+img.curpath+"grab.cur'),move";}else {img.style.cursor="move";}
			if(img.overview) {shiftzoom._setOverview(img); shiftzoom.G(img.overid).style.visibility="visible";}
		}else {img.style.cursor="crosshair"; if(img.overview) {shiftzoom.G(img.overid).style.visibility="hidden";}}
		butt=shiftzoom.G(img.zoinid).style; butt.border=img.bc; butt.borderBottom=img.dc; butt.borderRight=img.dc;
		butt=shiftzoom.G(img.zoutid).style; butt.border=img.bc; butt.borderBottom=img.dc; butt.borderRight=img.dc;
		img.pointer=img.style.cursor; shiftzoom.G(img.textid).innerHTML=parseInt((img.width/img.minwidth)*100)+" / "+parseInt(img.xfactor*100)+" %";
		if(img.lowres&&img.highres) {shiftzoom.source(img,img.highres,false,true);}
		cvi_sztimer=setInterval("shiftzoom._fadeInfo('"+img.id+"',100)",30); shiftzoom._shiftzoom=null;
	},
	_catchDrag : function(e) {return false; },
	_catchWheel : function(e){
		var d,v=0; e=e?e:window.event; if(e.wheelDelta) {v=e.wheelDelta/120; d=(v<0?1:0);}else if (e.detail) {v=-e.detail/3; d=(v<0?1:0);}
		if(cvi_szactive!=null&&v!=0) {cvi_szimage=true; shiftzoom._initZoom(d,(d==1?2:1),true);} if(e.preventDefault) {e.preventDefault();}else {e.returnValue=false;} return false;
	},
	_catchOver : function(e) {
		cvi_szactive=this.id; self.focus(); if(this.gecko) {window.addEventListener('DOMMouseScroll', shiftzoom._catchWheel, false);}else {window.onmousewheel=shiftzoom._catchWheel;}
		document.onkeyup=shiftzoom._upKey; document.onkeypress=shiftzoom._pressKey; document.onkeydown=shiftzoom._downKey; return false; 
	},
	_catchOut : function() {
		cvi_szactive=null; if(this.gecko) {window.removeEventListener('DOMMouseScroll', shiftzoom._catchWheel, false);}else {window.onmousewheel=null;} document.onkeydown=null; document.onkeypress=null; document.onkeyup=null; 
	},
	_catchKey : function(e) { clearInterval(cvi_sztimer);
		var img=shiftzoom._shiftzoom=this; var rm=false,mm=false,k,t,ex,ey,px=0,py=0,obj=shiftzoom.G(img.infoid).style; 
		e=e?e:window.event; if(e.which) {mm=(e.which==2); rm=(e.which==3);}else if(e.button) {mm=(e.button==4); rm=(e.button==2);}
		if(img.trident) {obj.filter="alpha(opacity=100)";}else {obj.opacity=1;} obj.visibility='hidden';
		ex=e.clientX; ey=e.clientY; if(e.pageX||e.pageY) {px=e.pageX; py=e.pageY;} k=shiftzoom._getMousePos(ex,ey,px,py); t=shiftzoom._findPosXY(img.parentNode); 
		img.mouseX=Math.min(Math.max(k.ex+k.ox-t.x,0),img.minwidth); img.mouseY=Math.min(Math.max(k.ey+k.oy-t.y,0),img.minheight);
		if(((e.altKey&&!e.shiftKey)||rm||img.zoomout)&&!img.automode&&!img.nozoom&&(img.width>img.minwidth||img.height>img.minheight)) {
			var butt,sw,ew,sh,eh,sx,ex,sy,ey,st; if(img.gecko) {img.style.cursor="-moz-zoom-out";}else if(img.webkit) {img.style.cursor="-webkit-zoom-out";}
			else if(img.trident) {img.style.cursor="url('"+img.curpath+"zoom-out.cur'),crosshair";}else {img.style.cursor="crosshair";}img.pointer=img.style.cursor;
			if(!img.zoomout) {butt=shiftzoom.G(img.zoutid).style; butt.border=img.bc; butt.borderLeft=img.dc; butt.borderTop=img.dc; img.zoomout=true;}
			sw=img.width; ew=(img.width-img.minwidth)*-1; sh=img.height; eh=(img.height-img.minheight)*-1; sx=parseInt(img.style.left); ex=sx*-1; sy=parseInt(img.style.top); ey=sy*-1;
			st=Math.max(1,Math.round((img.width/img.minwidth)*3)); document.onmouseup=shiftzoom._stopZoom; obj.visibility='visible';
			if(img.lowres&&img.highres) {shiftzoom.source(img,img.lowres,false,true);}
			cvi_sztimer=setInterval("shiftzoom._zoomOut('"+img.id+"',"+rm+","+(img.webkit&&rm?1:0)+","+st+","+sw+","+ew+","+sh+","+eh+","+sx+","+ex+","+sy+","+ey+","+img.nozoom+")",img.millisec);
		}else if(((!e.altKey&&e.shiftKey)||mm||img.zoomin)&&!img.automode&&!img.nozoom&&(img.width<img.maxwidth||img.height<img.maxheight)) {
			var butt,sw,ew,sh,eh,sx,ex,sy,ey,st; if(img.gecko) {img.style.cursor="-moz-zoom-in";}else if(img.webkit) {img.style.cursor="-webkit-zoom-in";}
			else if(img.trident) {img.style.cursor="url('"+img.curpath+"zoom-in.cur'),crosshair";}else {img.style.cursor="crosshair";}img.pointer=img.style.cursor; 
			if(!img.zoomin) {butt=shiftzoom.G(img.zoinid).style; butt.border=img.bc; butt.borderLeft=img.dc; butt.borderTop=img.dc; img.zoomin=true;}
			sw=img.width; ew=img.maxwidth-img.width; sh=img.height; eh=img.maxheight-img.height; sx=parseInt(img.style.left); sy=parseInt(img.style.top);
			ex=Math.max(0,Math.min(ew,Math.round(((img.mouseX-sx)*(img.maxwidth/img.width))-(img.minwidth*0.5)+sx)))*-1; 
			ey=Math.max(0,Math.min(eh,Math.round(((img.mouseY-sy)*(img.maxheight/img.height))-(img.minheight*0.5)+sy)))*-1; 
			st=Math.max(1,Math.round((img.maxwidth/img.width)*3)); document.onmouseup=shiftzoom._stopZoom; obj.visibility='visible';
			if(img.lowres&&img.highres) {shiftzoom.source(img,img.lowres,false,true);}
			cvi_sztimer=setInterval("shiftzoom._zoomIn('"+img.id+"',0,"+st+","+sw+","+ew+","+sh+","+eh+","+sx+","+ex+","+sy+","+ey+","+img.nozoom+")",img.millisec);
		}else if(img.width>img.minwidth||img.height>img.minheight) { if(img.automode) {shiftzoom.stop(img);}
			if(img.gecko) {img.style.cursor="-moz-grabbing";}else if(img.trident) {img.style.cursor="url('"+img.curpath+"grabbing.cur'),move";}else {img.style.cursor="move";}
			var x=parseInt(img.style.left), y=parseInt(img.style.top); img.mouseX=e.clientX; img.mouseY=e.clientY;
			document.onmousemove=shiftzoom._whilePan; document.onmouseup=shiftzoom._stopPan;
		}return false;
	},
	_downKey : function(e) {
		if(cvi_szactive!=null) {
			e=e?e:window.event; var k=(e.keyCode?e.keyCode:e.which),s=e.shiftKey,a=e.altKey,w=false,AL=37,AU=38,AR=39,AD=40,HO=36,EN=35,PD=34,PU=33,PL=187,MN=189;
			switch(k) {
				case AL : cvi_szimage=true; shiftzoom._panKey(8,0,s,a); break;
				case AR : cvi_szimage=true; shiftzoom._panKey(-8,0,s,a); break;
				case AU : cvi_szimage=true; shiftzoom._panKey(0,8,s,a); break;
				case AD : cvi_szimage=true; shiftzoom._panKey(0,-8,s,a); break;
				case HO : if(cvi_szimage==null) {cvi_szimage=true; shiftzoom._initZoom(0,1,w); }break;
				case EN : if(cvi_szimage==null) {cvi_szimage=true; shiftzoom._initZoom(1,1,w); }break;
				case MN : case PU : if(cvi_szimage==null) {cvi_szimage=true; shiftzoom._initZoom(0,4,w); }break;
				case PL : case PD : if(cvi_szimage==null) {cvi_szimage=true; shiftzoom._initZoom(1,4,w); }break;
			} 
		}return false;
	},
	_pressKey : function(e) {return false; },
	_upKey : function() {if(cvi_szactive!=null) {cvi_szimage=null; }},
	_initZoom : function(d,v,w) {var sw,ew,sh,eh,sx,ex,sy,ey,st,img=shiftzoom.G(cvi_szactive);
		if(img.automode) {shiftzoom.stop(img);}
		if(d==0&&!img.nozoom&&(parseInt(img.style.width)>img.minwidth||parseInt(img.style.height)>img.minheight)) {
			if(img.gecko) {img.style.cursor="-moz-zoom-out";}else if(img.webkit) {img.style.cursor="-webkit-zoom-out";}
			else if(img.trident) {img.style.cursor="url('"+img.curpath+"zoom-out.cur'),crosshair";}else {img.style.cursor="crosshair";}img.pointer=img.style.cursor;
			sw=img.width; ew=(img.width-img.minwidth)*-1; sh=img.height; eh=(img.height-img.minheight)*-1; 
			sx=parseInt(img.style.left); ex=sx*-1; sy=parseInt(img.style.top); ey=sy*-1;
			st=Math.max(1,Math.round((img.width/img.minwidth)*v)); 
			if(img.lowres&&img.highres) {shiftzoom.source(img,img.lowres,false,true);}
			shiftzoom._zoomKey(d,(w?1:0),w,st,sw,ew,sh,eh,sx,ex,sy,ey,img.nozoom);
		}else if(d==1&&!img.nozoom&&(parseInt(img.style.width)<img.maxwidth||parseInt(img.style.height)<img.maxheight)) {
			if(img.gecko) {img.style.cursor="-moz-zoom-in";}else if(img.webkit) {img.style.cursor="-webkit-zoom-in";}
			else if(img.trident) {img.style.cursor="url('"+img.curpath+"zoom-in.cur'),crosshair";}else {img.style.cursor="crosshair";}img.pointer=img.style.cursor; 
			sw=img.width; ew=img.maxwidth-img.width; sh=img.height; eh=img.maxheight-img.height; sx=parseInt(img.style.left); sy=parseInt(img.style.top);
			ex=Math.max(0,Math.min(ew,Math.round((((img.minwidth/2)-sx)*(img.maxwidth/img.width))-(img.minwidth*0.5)+sx)))*-1; 
			ey=Math.max(0,Math.min(eh,Math.round((((img.minheight/2)-sy)*(img.maxheight/img.height))-(img.minheight*0.5)+sy)))*-1; 
			st=Math.max(1,Math.round((img.maxwidth/img.width)*v)); 
			if(img.lowres&&img.highres) {shiftzoom.source(img,img.lowres,false,true);}
			shiftzoom._zoomKey(d,(w?1:0),w,st,sw,ew,sh,eh,sx,ex,sy,ey,img.nozoom);
		}
	},
	_zoomKey : function(d,ct,ww,st,sw,ew,sh,eh,sx,ex,sy,ey,nz) {
		if(cvi_szactive!=null&&!nz) {var view,mw,mh,mx,my,img=shiftzoom.G(cvi_szactive);
			if(!img.automode&&!img.zoomout&&!img.zoomin) {
				function setoverview() {
					if(img.lowres&&img.highres) {shiftzoom.source(img,img.highres,false,true);}
					if(img.width>img.minwidth||img.height>img.minheight) {
						if(img.trident) {img.style.cursor="url('"+img.curpath+"grab.cur'),move";}else {img.style.cursor="move";}
						if(img.overview) {shiftzoom._setOverview(img); shiftzoom.G(img.overid).style.visibility="visible";}
					}else {img.style.cursor="crosshair"; if(img.overview) {shiftzoom.G(img.overid).style.visibility="hidden";}}
					img.pointer=img.style.cursor; shiftzoom.G(img.infoid).style.visibility='hidden';
				}
				if(d==0&&(parseInt(img.style.width)>img.minwidth||parseInt(img.style.height)>img.minheight)) {
					mw=Math.max(img.minwidth,Math.min(img.maxwidth,Math.round(ew*ct/st+sw))); mx=Math.round(ex*ct/st+sx); mh=Math.max(img.minheight,Math.min(img.maxheight,Math.round(eh*ct/st+sh))); my=Math.round(ey*ct/st+sy); 
					shiftzoom.G(img.infoid).style.visibility='visible'; shiftzoom.G(img.textid).innerHTML=parseInt((mw/img.minwidth)*100)+" / "+parseInt(img.xfactor*100)+" %";
					img.style.width=mw+'px'; img.style.height=mh+'px'; img.style.left=mx+'px'; img.style.top=my+'px'; img.width=mw; img.height=mh; img.left=mx; img.top=my; img.maxleft=img.width-img.minwidth; img.maxtop=img.height-img.minheight; ct++;
					if((cvi_szimage||ww)&&(img.width>img.minwidth||img.height>img.minheight)) {
						if(!ww) {setTimeout("shiftzoom._zoomKey("+d+","+ct+","+ww+","+st+","+sw+","+ew+","+sh+","+eh+","+sx+","+ex+","+sy+","+ey+","+nz+")",50);}
						else {setoverview(); if(cvi_szactive!=null) {cvi_szimage=null;}}
					}else {setoverview();}
				}else if(d==1&&(parseInt(img.style.width)<img.maxwidth||parseInt(img.style.height)<img.maxheight)) {
					mw=Math.max(img.minwidth,Math.min(img.maxwidth,Math.round(ew*ct/st+sw))); mx=Math.round(ex*ct/st+sx); mh=Math.max(img.minheight,Math.min(img.maxheight,Math.round(eh*ct/st+sh))); my=Math.round(ey*ct/st+sy); 
					shiftzoom.G(img.infoid).style.visibility='visible'; shiftzoom.G(img.textid).innerHTML=parseInt((mw/img.minwidth)*100)+" / "+parseInt(img.xfactor*100)+" %";
					img.style.width=mw+'px'; img.style.height=mh+'px'; img.style.left=mx+'px'; img.style.top=my+'px'; img.width=mw; img.height=mh; img.left=mx; img.top=my; img.maxleft=img.width-img.minwidth; img.maxtop=img.height-img.minheight; ct++;
					if((cvi_szimage||ww)&&(img.width<img.maxwidth||img.height<img.maxheight)) {
						if(!ww) {setTimeout("shiftzoom._zoomKey("+d+","+ct+","+ww+","+st+","+sw+","+ew+","+sh+","+eh+","+sx+","+ex+","+sy+","+ey+","+nz+")",50);}
						else {setoverview(); if(cvi_szactive!=null) {cvi_szimage=null;}}
					}else {setoverview();}
				}else {setoverview();}
			}
		}
	},
	_panKey : function(h,v,s,a) {
		if(cvi_szactive!=null) {var img=shiftzoom.G(cvi_szactive); if(img.automode) {shiftzoom.stop(img);}
			if(!img.automode&&(img.width>img.minwidth||img.height>img.minheight)) {
				var x=Math.max(0,Math.min(img.maxleft,Math.abs(parseInt(img.style.left))-(s?4*h:a?h/4:h)));
				var y=Math.max(0,Math.min(img.maxtop,Math.abs(parseInt(img.style.top))-(s?4*v:a?v/4:v)));
				img.style.left=(x*-1)+'px'; img.style.top=(y*-1)+'px'; img.left=(x*-1); img.top=(y*-1);
				if(img.overview) {var view=shiftzoom.G(img.viewid).style;
					view.left=Math.round((Math.abs(parseInt(img.style.left))/(img.width/img.minwidth))*img.ovsfact)-(img.bmode?2:0)+'px';
					view.top=Math.round((Math.abs(parseInt(img.style.top))/(img.height/img.minheight))*img.ovsfact)-(img.bmode?2:0)+'px';
				} if(cvi_szimage) {setTimeout("shiftzoom._panKey("+h+","+v+","+s+","+a+")",50);}
			}
		}
	},
	_fadeImage : function(id,o) {
		var img=shiftzoom.G(id); if(o<=100) {if(img.trident) {img.style.filter="alpha(opacity="+o+")";}else {img.style.opacity=o/100;} o+=10;
		window.setTimeout("shiftzoom._fadeImage('"+id+"',"+o+")",30);}else {
			if(img.buttons) {shiftzoom.G(img.ctrlid).style.visibility='visible';} if(img.showcoords) {shiftzoom.G(img.xycoid).style.visibility='visible';}
			if(img.special&&(img.width>img.minwidth||img.height>img.minheight)) {img.overview=true; img.special=false; shiftzoom._setOverview(img); shiftzoom.G(img.overid).style.visibility="visible";} 
		}
	},
	_fadeInfo : function(id,o) {
		clearInterval(cvi_sztimer); var img=shiftzoom.G(id), obj=shiftzoom.G(img.infoid); if(o>0&&cvi_szactive==img.id&&!img.zoomin&&!img.zoomout){
		if(img.trident) {obj.style.filter="alpha(opacity="+o+")";}else {obj.style.opacity=o/100;} o-=5; cvi_sztimer=setInterval("shiftzoom._fadeInfo('"+id+"',"+o+")",50);}
		else {if(img.trident) {obj.style.filter="alpha(opacity=100)";}else {obj.style.opacity=1;} obj.style.visibility='hidden';}
	},
	_fadeOut : function(id,o) {
		var img=shiftzoom.G(id); if(o>0) {if(img.trident) {img.style.filter="alpha(opacity="+o+")";}else {img.style.opacity=o/100;} o-=10;
		window.setTimeout("shiftzoom._fadeOut('"+id+"',"+o+")",30);}else {img.src=shiftzoom.G(img.isrcid).src; shiftzoom.G(img.tumbid).src=img.src; img.style.msInterpolationMode="bicubic"; shiftzoom.G(img.isrcid).src=''; if(img.highres!=img.src) {img.highres=img.src;} shiftzoom._fadeIn(id,0);}
	},
	_fadeIn : function(id,o) {
		var img=shiftzoom.G(id); if(o<=100) {if(img.trident) {img.style.filter="alpha(opacity="+o+")";}else {img.style.opacity=o/100;} o+=10;
		window.setTimeout("shiftzoom._fadeIn('"+id+"',"+o+")",30);}else {if(img.buttons) {shiftzoom.G(img.ctrlid).style.visibility="visible";} if(img.overview&&(img.width>img.minwidth||img.height>img.minheight)) {shiftzoom.G(img.overid).style.visibility="visible";} if(img.showcoords) {shiftzoom.G(img.xycoid).style.visibility="visible";}}
	},
	_whilePan : function(e) {
		var img=shiftzoom._shiftzoom; e=e?e:window.event;
		var x=Math.max(0,Math.min(img.maxleft,Math.abs(parseInt(img.style.left))-(e.clientX-img.mouseX)));
		var y=Math.max(0,Math.min(img.maxtop,Math.abs(parseInt(img.style.top))-(e.clientY-img.mouseY)));
		img.style.left=(x*-1)+'px'; img.style.top=(y*-1)+'px'; img.left=(x*-1); img.top=(y*-1); img.mouseX=e.clientX; img.mouseY=e.clientY;
		return false;
	},
	_stopPan : function() {
		var view, butt, img=shiftzoom._shiftzoom; document.onmousemove=null; document.onmouseup=null;
		if(img.gecko||img.presto) {img.style.cursor="move";} else {img.style.cursor=img.pointer;}if(img.overview) { view=shiftzoom.G(img.viewid).style;
			view.left=Math.round((Math.abs(parseInt(img.style.left))/(img.width/img.minwidth))*img.ovsfact)-(img.bmode?2:0)+'px';
			view.top=Math.round((Math.abs(parseInt(img.style.top))/(img.height/img.minheight))*img.ovsfact)-(img.bmode?2:0)+'px';
		} shiftzoom._shiftzoom=null;
	},
	_startMove : function(e) {
		if(!e) {e=window.event; var view=e.srcElement;}else {var view=e.target;}
		var l=parseInt(view.style.left), t=parseInt(view.style.top); cvi_szimage=view.parentNode.parentNode.getElementsByTagName("img")[0].id;
		view.style.cursor="default"; view.mouseX=e.clientX; view.mouseY=e.clientY;
		document.onmousemove=shiftzoom._whileMove; document.onmouseup=shiftzoom._stopMove;
		return false;
	},
	_whileMove : function(e) {
		if(!e) {e=window.event; var view=e.srcElement;}else {var view=e.target;}
		var cen=view.id.split("_"), img=shiftzoom.G(cvi_szimage); 
		if(view && cen[cen.length-1]=='view' && view.maxleft && view.maxtop) {
			var l=Math.max(0,Math.min(view.maxleft,Math.abs(parseInt(view.style.left))+(e.clientX-view.mouseX)));
			var t=Math.max(0,Math.min(view.maxtop,Math.abs(parseInt(view.style.top))+(e.clientY-view.mouseY)));
			view.style.left=(l-(img.bmode?2:0))+'px'; view.style.top=(t-(img.bmode?2:0))+'px'; view.mouseX=e.clientX; view.mouseY=e.clientY;
			var x=Math.max(0,Math.min(img.maxleft,Math.abs(l*(img.width/img.minwidth)*(1/img.ovsfact))));
			var y=Math.max(0,Math.min(img.maxtop,Math.abs(t*(img.height/img.minheight)*(1/img.ovsfact))));
			img.style.left=(x*-1)+'px'; img.style.top=(y*-1)+'px'; img.left=(x*-1); img.top=(y*-1);
		}else {document.onmousemove=null; document.onmouseup=null; img.onmousedown=shiftzoom._catchKey; cvi_szimage=null;} 
		return false;
	},
	_stopMove : function() {document.onmousemove=null; document.onmouseup=null; shiftzoom.G(cvi_szimage).onmousedown=shiftzoom._catchKey; cvi_szimage=null;}
}
