const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
global.self = globalThis;
global.window = { location: { hash: '' } };
global.document = {};
Object.defineProperty(global, 'localStorage', { value: { getItem: () => null }, configurable: true });
const Bundle = require('swagger-ui-dist/swagger-ui-bundle');
const system = Bundle({url:'',dom_id:null});
// Fixture ids only contain ASCII letters, digits and hyphens/underscores.
const context = vm.createContext({CSS:{escape:value=>value}});
vm.runInContext(fs.readFileSync(require.resolve('../src/viewer/operations.js'), 'utf8'), context);

function fixture() {
  let hooks, cursor, effects;
  const React = { ...system.React,
    useRef(value) { return hooks[cursor++] ||= {current:value}; },
    useEffect(fn) { effects.push(fn); }, useLayoutEffect(fn) { effects.push(fn); }
  };
  const plugin = context.LightweightOperationsPlugin({...system, React, layoutActions:{show:(...args)=>props.layoutActions.show(...args)}});
  function render(Component, props, state = []) {
    hooks = state; cursor = 0; effects = [];
    const tree = Component(props);
    return {tree, state, effects};
  }
  const shown = new Map(), changes = [];
  const props = {
    getConfigs: () => ({docExpansion:'list',deepLinking:true}),
    getComponent: name => name,
    specSelectors: {validOperationMethods:()=>['get','post'],url:()=>'',security:()=>system.Im.List()},
    layoutSelectors: {isShown:(key, fallback)=>shown.get(JSON.stringify(key)) ?? fallback,
      showSummary:()=>true,getScrollToKey:()=>null,getScrollToVirtualizedOperation:()=>null},
    layoutActions: {show:(key,value)=>{shown.set(JSON.stringify(key),value);changes.push([Array.from(key),value]);}},
    authSelectors: {isAuthorized:()=>false,definitionsForRequirements:value=>value},
    authActions: {showDefinitions() {}}
  };
  const operations = system.Im.fromJS(Array.from({length:200}, (_, i)=>({path:`/items/${i}`,method:'get',
    specPath:['paths',`/items/${i}`,'get'], operation:{summary:`Record ${i}`,operationId:`op${i}`}})));
  props.specSelectors.taggedOperations = () => system.Im.fromJS({Items:{operations}});
  const top = render(plugin.components.operations,props).tree;
  const groupElement = top.props.children[0];
  const group = render(groupElement.type,groupElement.props);
  return {render,props,shown,changes,group,groupElement,rows:group.tree.props.children.props.children};
}

test('every summary is rendered, and only opened operations mount the original container', () => {
  const f = fixture();
  assert.equal(f.rows.length,200);
  for (const row of f.rows) {
    const result = f.render(row.type,row.props).tree;
    assert.match(result.props.children.props.className,/opblock-get/);
    assert.equal(result.props.children.type,'div');
  }
  const row = f.rows[199];
  const first = f.render(row.type,row.props);
  const summary = first.tree.props.children.props.children[0];
  assert.equal(summary.type,'OperationSummary');
  summary.props.toggleShown();
  assert.deepEqual(f.changes.at(-1),[['operations','Items','op199'],true]);
  const opened = f.render(row.type,row.props,first.state).tree;
  assert.equal(opened.type,'OperationContainer');
  f.props.layoutActions.show(['operations','Items','op199'],false);
  const closed = f.render(row.type,row.props,first.state).tree;
  assert.equal(closed.type,'OperationContainer', 'keep original component mounted after collapse');
});

test('collapsed tag retains summaries in searchable hidden state and beforematch expands it', () => {
  const f = fixture();
  const children = f.group.tree.props.children;
  const Collapse = f.group.tree.props.getComponent('Collapse');
  const result = f.render(Collapse,{isOpened:false,children});
  const attributes = {}, listeners = {};
  result.tree.ref.current = {onbeforematch:null,
    setAttribute:(key,value)=>{attributes[key]=value;},removeAttribute:key=>delete attributes[key],
    addEventListener:(key,fn)=>{listeners[key]=fn;},removeEventListener:key=>delete listeners[key]};
  result.effects[0]();
  assert.equal(attributes.hidden,'until-found');
  assert.equal(children.props.children.length,200);
  listeners.beforematch();
  assert.deepEqual(f.changes.at(-1),[['operations-tag','Items'],true]);
});

test('generated operation ids and initial deep-link state open the correct original operation', () => {
  const f = fixture(), row = f.rows[199];
  const props = {...row.props, op:row.props.op.deleteIn(['operation','operationId'])};
  const summary = f.render(row.type,props).tree;
  assert.equal(summary.props['data-operation-id'],'get_items_199');
  f.props.layoutActions.show(['operations','Items','get_items_199'],true);
  const opened = f.render(row.type,props).tree;
  assert.equal(opened.type,'OperationContainer');
  assert.equal(opened.props.path,'/items/199');
});

test('lightweight summaries retain deprecation and operation authorization', () => {
  const f = fixture(), row = f.rows[0];
  const op = row.props.op.setIn(['operation','deprecated'],true)
    .setIn(['operation','security'],system.Im.fromJS([{basicAuth:[]}]));
  const summary = f.render(row.type,{...row.props,op}).tree;
  assert.equal(summary.props.children.props.className,'opblock opblock-deprecated');
  const originalSummary = summary.props.children.props.children[0];
  assert.equal(originalSummary.type,'OperationSummary');
  assert.equal(originalSummary.props.operationProps.get('isAuthorized'),false);
  assert.deepEqual(originalSummary.props.operationProps.get('security').toJS(),[{basicAuth:[]}]);
});
