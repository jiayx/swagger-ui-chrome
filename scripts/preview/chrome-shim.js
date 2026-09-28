// Local preview only; never packaged into the extension.
const listeners = [];
const channel = new BroadcastChannel('swagger-preview');
channel.onmessage = event => listeners.forEach(listener => listener(event.data.changes, event.data.area));
function area(name) {
  const read = () => JSON.parse(localStorage.getItem('preview-' + name) || '{}');
  const notify = changes => { listeners.forEach(listener => listener(changes, name)); channel.postMessage({changes, area:name}); };
  return {
    get(keys, callback) { const data = read(); if(name === 'sync' && !data.url) data.url = location.origin + '/__preview/spec.json'; const result = Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, data[key]])); callback?.(result); return Promise.resolve(result); },
    set(values) { const data = read(); const changes = {}; for(const [key,value] of Object.entries(values)) { changes[key] = {oldValue:data[key],newValue:value}; data[key]=value; } localStorage.setItem('preview-' + name, JSON.stringify(data)); notify(changes); return Promise.resolve(); },
    remove(keys) { const data=read(),changes={}; [].concat(keys).forEach(key=>{changes[key]={oldValue:data[key]}; delete data[key];}); localStorage.setItem('preview-'+name,JSON.stringify(data));notify(changes);return Promise.resolve(); }
  };
}
window.chrome = {
  storage:{local:area('local'),sync:area('sync'),onChanged:{addListener:listener=>listeners.push(listener)}},
  runtime:{getURL:path=>location.origin+'/'+path},
  i18n:{getUILanguage:()=> PREVIEW_LANG.replace('_', '-'),getMessage:(key,subs)=>{let text=MESSAGES[key]?.message||'';const values=Array.isArray(subs)?subs:[subs];for(const [name,value]of Object.entries(MESSAGES[key]?.placeholders||{}))text=text.replaceAll('$'+name+'$',values[Number(value.content.slice(1))-1]||'');return text;} }
};
