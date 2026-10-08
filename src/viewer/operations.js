// Keep searchable summaries in the DOM; mount Swagger's full operation only
// after it is opened. No changes to the vendored Swagger bundle are necessary.
function LightweightOperationsPlugin(system) {
  const { React, Im } = system;
  const h = React.createElement;

  function operationId(op) {
    return op.getIn(['operation', '__originalOperationId']) ||
      op.getIn(['operation', 'operationId']) ||
      system.fn.opId(op.get('operation'), op.get('path'), op.get('method')) || op.get('id');
  }

  function OperationRow({ op, tag, ...props }) {
    const path = op.get('path'), method = op.get('method'), id = operationId(op);
    const operation = op.get('operation');
    const config = props.getConfigs();
    const shown = props.layoutSelectors.isShown(['operations', tag, id], config.docExpansion === 'full');
    const mounted = React.useRef(false);
    if (shown) mounted.current = true;
    const open = () => props.layoutActions.show(['operations', tag, id], true);
    const attributes = { 'data-operation-id': id, 'data-operation-tag': tag };
    if (mounted.current) {
      const Original = props.getComponent('OperationContainer', true);
      return h(Original, { op, path, method, tag, specPath: op.get('specPath') });
    }

    const security = operation.get('security') || props.specSelectors.security();
    const Summary = props.getComponent('OperationSummary');
    const deprecated = operation.get('deprecated') || false;
    const summaryProps = Im.Map({
      op: operation, tag, path, method, operationId: id,
      summary: operation.get('summary') || '', deprecated, security,
      isAuthorized: props.authSelectors.isAuthorized(security),
      showSummary: props.layoutSelectors.showSummary(), isShown: false,
      displayOperationId: config.displayOperationId,
      isDeepLinkingEnabled: config.deepLinking
    });
    // Match the original deep-link wrapper, opblock and collapsed body markup.
    // Let Swagger own summary markup, escaping, wrapping, icons and theme hooks.
    return h('span', attributes,
      h('div', {
        // Swagger's escapeDeepLinkPath uses CSS.escape after normalizing spaces.
        id: CSS.escape(`operations-${tag}-${id}`.trim().replace(/\s/g, '%20').replace(/%20/g, '_')),
        className: deprecated ? 'opblock opblock-deprecated' : `opblock opblock-${method}`
      },
        h(Summary, { operationProps: summaryProps, isShown: false, toggleShown: open,
          getComponent: props.getComponent, authActions: props.authActions,
          authSelectors: props.authSelectors, specPath: op.get('specPath') }),
        h('noscript')));
  }

  function SearchableTagCollapse({ isOpened, children }) {
    const content = React.useRef(null);
    const tag = children.props['data-group-tag'];
    React.useLayoutEffect(() => {
      const element = content.current;
      // Preserve the original no-margin wrapper, retaining its real children
      // when closed so native Find can reveal them without a duplicate index.
      if (isOpened) element.removeAttribute('hidden');
      else element.setAttribute('hidden', 'onbeforematch' in element ? 'until-found' : '');
      const reveal = () => system.layoutActions.show(['operations-tag', tag], true);
      element.addEventListener('beforematch', reveal);
      return () => element.removeEventListener('beforematch', reveal);
    }, [isOpened, tag]);
    return h('div', { ref: content, className: 'no-margin searchable-operation-content' }, ' ', children, ' ');
  }

  function OperationGroup({ tag, group, ...props }) {
    const Tag = props.getComponent('OperationTag');
    const methods = props.specSelectors.validOperationMethods();
    // Override only this tag's Collapse. Operation detail components keep the
    // original Collapse and its lifecycle; the tag's markup stays upstream-owned.
    const getTagComponent = (name, ...args) => name === 'Collapse'
      ? SearchableTagCollapse : props.getComponent(name, ...args);
    return h(Tag, { ...props, getComponent: getTagComponent, tag, tagObj: group, specUrl: props.specSelectors.url() },
      h('div', { className: 'operation-tag-content', 'data-group-tag': tag },
        group.get('operations', Im.List()).filter(op => methods.includes(op.get('method'))).map(op =>
          h(OperationRow, { ...props, key: `${op.get('method')} ${op.get('path')}`, op, tag })).toArray()));
  }

  function Operations(props) {
    const root = React.useRef(null);
    const groups = props.specSelectors.taggedOperations();
    const pending = props.layoutSelectors.getScrollToKey();
    const virtualPending = props.layoutSelectors.getScrollToVirtualizedOperation();
    React.useEffect(() => {
      // The original detail/tag wrapper may already have handled this request.
      if (!pending && virtualPending) {
        props.layoutActions.clearScrollToVirtualizedOperation();
        return;
      }
      const destination = (pending || virtualPending)?.toJS();
      if (!destination || !root.current) return;
      const [type, tag, id] = destination;
      const tags = [tag, tag?.replaceAll('_', ' ')];
      const selector = type === 'operations' ? '[data-operation-id]' : '[data-tag]';
      const target = Array.from(root.current.querySelectorAll(selector)).find(element => type === 'operations'
        ? tags.includes(element.dataset.operationTag) && element.dataset.operationId === id
        : tags.includes(element.dataset.tag));
      if (!target) return;
      const frame = requestAnimationFrame(() => {
        target.scrollIntoView({ block: 'start' });
        props.layoutActions.clearScrollTo();
        props.layoutActions.clearScrollToVirtualizedOperation();
      });
      return () => cancelAnimationFrame(frame);
    }, [groups, pending, virtualPending, props.layoutActions]);
    if (!groups.size) return h('h3', null, ' No operations defined in spec!');
    return h('div', { ref: root, className: 'searchable-operations' }, groups.entrySeq().map(([tag, group]) =>
      h(OperationGroup, { ...props, key: tag, tag, group })).toArray());
  }

  return { components: { operations: Operations } };
}
