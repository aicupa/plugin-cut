/**
 * @param {import('@aicupa/api').PluginApi} api
 * @returns {import('@aicupa/api').Plugin}
 */
module.exports = (api) => {
  let cutBuffer = null;

  return {
    cutNode({ node, filePath }) {
      cutBuffer = { node, filePath };
      return { ok: true };
    },

    async pasteNode({ targetNode, filePath }) {
      if (!cutBuffer) {
        return { ok: false, error: "No node in cut buffer" };
      }

      const source = cutBuffer;
      cutBuffer = null;

      const storeData = await api.getTree(filePath);
      if (!storeData) {
        return { ok: false, error: "Failed to read tree" };
      }

      const treeData = api.getArray(storeData.tree);

      const removed = removeNodeByKey(treeData, source.node.key);
      if (!removed) {
        return { ok: false, error: "Source node not found" };
      }

      const target = findNode(treeData, targetNode.key);
      if (!target) {
        return { ok: false, error: "Target node not found" };
      }

      if (!Array.isArray(target.children)) {
        target.children = [];
      }
      target.children.push(removed);

      storeData.tree = treeData;
      await api.store("todotree", storeData, filePath);
      api.reload(filePath);

      return { ok: true };
    },

    getCutBuffer() {
      return { ok: true, node: cutBuffer?.node || null };
    },

    clearCutBuffer() {
      cutBuffer = null;
      return { ok: true };
    },
  };
};

function findNode(tree, key) {
  if (!Array.isArray(tree)) return null;
  for (const node of tree) {
    if (node.key == key) return node;
    const found = findNode(node.children, key);
    if (found) return found;
  }
  return null;
}

function removeNodeByKey(tree, key) {
  if (!Array.isArray(tree)) return null;
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].key == key) {
      return tree.splice(i, 1)[0];
    }
    const found = removeNodeByKey(tree[i].children, key);
    if (found) return found;
  }
  return null;
}
