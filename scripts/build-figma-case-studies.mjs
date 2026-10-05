import fs from 'node:fs';
import path from 'node:path';

const folder = path.resolve('content/figma-case-studies');
const read = (name) => JSON.parse(fs.readFileSync(path.join(folder,name),'utf8'));
const chronology = fs.existsSync(path.join(folder,'project-dates.json')) ? read('project-dates.json').projects : [];
const sourceFile = 'qDdxlqtBxVpaAOUMITle4W';
const portfolioFile = 'r2Feu1tLXWg8ApMcINffew';
const covers = {
  smartbasket:'595:1020',garden:'595:1030',habitat:'600:1042',arca:'595:1032',
  ryri:'595:1034',costudy:'595:1036','villio-ai':'599:1040',munisync:'595:1022',
  elapse:'595:1024',sparks:'595:1026','hopper-hangout':'595:1028',newly:'953:1355',
};
const screens = {yelo:'155:1617',cocart:'1:13674',augwa:'19:2849','hack404-launchpad':'101:3256',summerhacks:'172:1582'};
const details = {
  yelo:{path:'yelo-details.png',ids:['155:1874','155:2521'],section:1,alt:'Yelo map and ride selection screens'},
  costudy:{path:'costudy-details.png',ids:['9:1861','9:2108'],section:0,alt:'CoStudy campus map, study sessions, and course discussion threads'},
  cocart:{path:'cocart-details.png',ids:['1:13674','1:13782'],section:2,alt:'CoCart recent orders and a shared cart waiting for more shoppers'},
  ryri:{path:'ryri-details.png',ids:['1:11468','1:11138'],section:1,alt:'Ryri session setup and active focus session'},
  smartbasket:{path:'smartbasket-details.png',ids:['1:12432','1:12930'],section:1,alt:'SmartBasket nearby sale discovery and shopping list grouped by store'},
  'villio-ai':{path:'villio-details.png',ids:['1:961','1:1685'],section:1,alt:'Villio resident home and conversational study-room booking'},
  munisync:{path:'munisync-details.png',ids:['1:8106','1:9251'],section:1,alt:'MuniSync resident dashboard and study-room availability'},
  arca:{path:'arca-details.png',ids:['0:202','0:499'],section:2,alt:'Arca art discovery and guided Rogan Art activity'},
};
// YRConnect incorporates the MuniSync designs; keep it out of new-project imports.
const order = ['yelo','villio-ai','newly','augwa','hack404-launchpad','costudy','cocart','ryri','smartbasket','arca','sparks','garden','habitat'];
const copy = [...read('root-copy.json'),...read('consumer-copy.json'),...read('civic-art-copy.json')];
const block = (text,key) => ({_type:'block',_key:key,style:'normal',markDefs:[],children:[{_type:'span',_key:`${key}-span`,marks:[],text}]});
const image = (fileKey,nodeId,file,alt,extra={}) => ({path:`assets/${file}`,fileKey,nodeId,alt,...extra});
const projects = order.map((slug,i) => {
  const item=copy.find(p=>p.slug===slug);
  if(!item) throw new Error(`Missing copy for ${slug}`);
  const researched = chronology.find(p=>p.slug===slug);
  const year = researched?.year ?? (slug==='smartbasket'||slug==='costudy' ? 2025 : item.year ?? 2026);
  const yearSource = researched?.sourceSummary || item.yearSource || (slug==='smartbasket' ? 'Design Demo resume: Hack Canada 2025.' : slug==='costudy' ? 'Design Demo Contents: UW Blueprint Designathon; resume: First Place, UW Blueprint Designathon 2025.' : item.year ? 'Design Demo resume or project year; 2026 confirmed by user for undated projects.' : 'User confirmed 2026 for undated projects.');
  const assetSlug = slug==='hack404-launchpad' ? 'hack404' : slug;
  const cover=image(covers[slug]?portfolioFile:sourceFile,covers[slug]||screens[slug],`${assetSlug}-cover.png`,`${item.title} ${slug==='newly'?'desktop workspace':'project interface'}`);
  const document={_type:'project',title:item.title,slug:{_type:'slug',current:slug},year,featured:false,order:researched?.order ?? 15+i,description:item.description,client:item.client,discipline:item.discipline,intro:item.intro,summary:item.summary,overview:item.overview,showSideMenu:true,
    details:item.details.map((d,j)=>({_type:'detailItem',_key:`detail-${j}`,label:d.label,value:d.label==='Year'?String(year):d.value})),
    sections:item.sections.map((s,j)=>({_type:'projectSection',_key:`section-${j}`,title:s.title,heading:s.heading,content:s.paragraphs.map((p,k)=>block(p,`paragraph-${j}-${k}`))}))};
  if(slug==='smartbasket') {
    document.client='Hack Canada 2025';
    document.discipline='Product Design · Development';
    document.overview='Designed and developed at Hack Canada 2025, SmartBasket combines generative AI with location-based crowdsourcing to help Canadians compare local shopping options. The home screen moves from nearby offers to a personal basket and contribution rewards, keeping price, store, and distance visible together.';
    document.details.push({_type:'detailItem',_key:'detail-stack',label:'Stack',value:'Firebase · Gemini API · SerpAPI · Google Cloud'});
  }
  if(slug==='costudy') document.details.push({_type:'detailItem',_key:'detail-award',label:'Recognition',value:'First Place, UW Blueprint Designathon 2025'});
  if(slug==='cocart') document.details.push({_type:'detailItem',_key:'detail-award',label:'Recognition',value:'First Place, UWUX Fuse Designathon'});
  const additional=[];
  function add(spec,section,caption){
    const key=`image-${additional.length}`;
    additional.push({...spec,key});
    document.sections[section].content.push({_type:'mediaImage',_key:key,localAssetKey:key,alt:spec.alt,caption,size:'full'});
  }
  if(details[slug]) {const d=details[slug];add(image(sourceFile,d.ids[0],d.path,d.alt,{sourceNodeIds:d.ids}),d.section,d.alt);}
  if(slug==='hack404-launchpad') add(image(sourceFile,'101:3882','hack404-mobile-screen.png','Hack404 Launchpad mobile portal'),2,'Mobile navigation exploration');
  if(slug==='augwa') {
    add(image(sourceFile,'19:2849','augwa-screen.png','Augwa operations dashboard with booking exceptions, charts, and setup checklist'),0,'Desktop operations dashboard');
    add(image(sourceFile,'19:3616','augwa-job-screen.png','Augwa mobile scheduled job with customer, address, and start action'),1,'Mobile job overview');
  }
  if(slug==='summerhacks') add(image(sourceFile,'172:1238','summerhacks-brand-screen.png','SummerHacks sponsorship package cover with nature-inspired graphics'),0,'Sponsorship package cover');
  return {id:`figma-portfolio-${slug}`,status:'published',yearSource,document,images:{cover,hero:cover,additional}};
});
// Elapse and Hopper retain their restored original covers in Sanity.
// New Figma imports must not overwrite those existing project images.
const manifest={projectId:'7k8ajlip',dataset:'production',source:{fileKey:sourceFile,url:`https://www.figma.com/design/${sourceFile}/Winston-Design-Demo`,portfolioFileKey:portfolioFile},defaults:{undatedYear:2026,yearConfirmedByUser:true},projects};
fs.writeFileSync(path.join(folder,'manifest.json'),`${JSON.stringify(manifest,null,2)}\n`);
console.log(`Prepared ${projects.length} new case studies; existing YRConnect, Elapse, and Hopper content is preserved.`);
