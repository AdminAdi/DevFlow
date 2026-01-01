import React, { useState, useCallback } from 'react';
import Node from './components/Node';
import './App.css';

const App = () => {
  const [workflow, setWorkflow] = useState({
    id: '1',
    type: 'ROOT',
    label: 'Start',
    children: [],
    position: { x: 0, y: 0 }
  });

  // Undo/Redo state
  const [history, setHistory] = useState([{
    id: '1',
    type: 'ROOT',
    label: 'Start',
    children: [],
    position: { x: 0, y: 0 }
  }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Generate unique ID for new nodes
  const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  // Save workflow state to history for undo/redo
  const saveToHistory = useCallback((newWorkflow) => {
    setHistory(prevHistory => {
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newWorkflow)));
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [historyIndex]);

  // Undo functionality
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setWorkflow(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  // Redo functionality
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setWorkflow(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  // Save workflow to console
  const saveWorkflow = () => {
    console.log('=== Workflow Data Structure ===');
    console.log(JSON.stringify(workflow, null, 2));
    console.log('=== End Workflow Data ===');
    alert('Workflow saved! Check the console for the data structure.');
  };

  // Ensure all nodes have positions
  const ensurePositions = (node) => {
    if (!node.position) {
      node.position = { x: 0, y: 0 };
    }
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => ensurePositions(child));
    }
    return node;
  };

  // Load workflow from console (for testing)
  const loadWorkflow = () => {
    const input = prompt('Paste your workflow JSON here:');
    if (input) {
      try {
        const parsed = JSON.parse(input);
        const withPositions = ensurePositions(parsed);
        setWorkflow(withPositions);
        saveToHistory(withPositions);
      } catch (e) {
        alert('Invalid JSON format!');
      }
    }
  };

  // Helper function to find the leaf node in a branch
  const findLeafNode = (node) => {
    if (!node || node.type === 'END') return node;
    if (!node.children || node.children.length === 0) return node;
    if (node.type === 'ACTION') {
      return findLeafNode(node.children[0]);
    }
    return node; // For branch nodes, return the branch itself
  };

  // Update node position
  const updateNodePosition = (nodeId, position) => {
    const updateTree = (node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          position
        };
      }
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: node.children.map(child => updateTree(child))
        };
      }
      return node;
    };
    const newWorkflow = updateTree(workflow);
    setWorkflow(newWorkflow);
  };

  // Add a new node after a parent node
  // For Action nodes: replaces the single child (if any)
  // For Branch nodes: adds to a specific branch index
  // For End nodes: cannot add children
  const addNode = (parentId, type, branchIndex = null, position = null) => {
    const newNode = {
      id: generateId(),
      type: type.toUpperCase(),
      label: type === 'branch' ? 'Condition' : type === 'end' ? 'End' : 'Action',
      children: [],
      position: position || { x: 0, y: 0 }
    };

    // If it's a branch node, initialize with True/False branches
    if (type.toUpperCase() === 'BRANCH') {
      newNode.children = [
        { id: generateId(), type: 'ACTION', label: 'Action', children: [], position: { x: 0, y: 0 } },
        { id: generateId(), type: 'ACTION', label: 'Action', children: [], position: { x: 0, y: 0 } }
      ];
    }

    const updateTree = (node) => {
      if (node.id === parentId) {
        // End nodes cannot have children
        if (node.type === 'END') return node;

        if (node.type === 'BRANCH' && branchIndex !== null) {
          // For branch nodes, add to specific branch
          const updatedChildren = [...node.children];
          if (updatedChildren[branchIndex]) {
            const branchHead = updatedChildren[branchIndex];
            const leafNode = findLeafNode(branchHead);

            if (leafNode && leafNode.type === 'END') {
              // If leaf is End, replace it with new node (unless new node is also End)
              if (newNode.type !== 'END') {
                // Replace End with new node, then add End as child of new node
                const updateToLeaf = (n) => {
                  if (n.id === leafNode.id) {
                    return {
                      ...newNode,
                      children: newNode.type === 'END' ? [] : [leafNode]
                    };
                  }
                  if (n.children && n.children.length > 0) {
                    return {
                      ...n,
                      children: n.children.map(updateToLeaf)
                    };
                  }
                  return n;
                };
                updatedChildren[branchIndex] = updateToLeaf(branchHead);
              }
            } else if (leafNode) {
              // Add new node as child of leaf
              const updateToLeaf = (n) => {
                if (n.id === leafNode.id) {
                  return {
                    ...n,
                    children: [newNode]
                  };
                }
                if (n.children && n.children.length > 0) {
                  return {
                    ...n,
                    children: n.children.map(updateToLeaf)
                  };
                }
                return n;
              };
              updatedChildren[branchIndex] = updateToLeaf(branchHead);
            } else {
              // Branch is empty, replace it
              updatedChildren[branchIndex] = newNode;
            }
          }
          return {
            ...node,
            children: updatedChildren
          };
        } else if (node.type === 'ACTION' || node.type === 'ROOT') {
          // For Action and Root nodes, replace single child
          return {
            ...node,
            children: [newNode]
          };
        }
      }

      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: node.children.map(child => updateTree(child))
        };
      }

      return node;
    };

    const newWorkflow = updateTree(workflow);
    setWorkflow(newWorkflow);
    saveToHistory(newWorkflow);
  };

  // Delete a node and reconnect its children to its parent
  const deleteNode = (nodeId) => {
    if (nodeId === workflow.id) return; // Cannot delete root

    const findNode = (node, parent = null, parentIndex = -1) => {
      if (node.id === nodeId) {
        return { node, parent, parentIndex };
      }
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const result = findNode(node.children[i], node, i);
          if (result) return result;
        }
      }
      return null;
    };

    const targetInfo = findNode(workflow);
    if (!targetInfo || !targetInfo.parent) return;

    const deletedNode = targetInfo.node;
    const parentNode = targetInfo.parent;

    const updateTree = (node) => {
      if (node.id === parentNode.id) {
        // Remove the deleted node from parent's children
        const newChildren = [...node.children];
        newChildren.splice(targetInfo.parentIndex, 1);

        // Add deleted node's children to parent (reconnect)
        if (deletedNode.children && deletedNode.children.length > 0) {
          // For branch nodes, we need to handle reconnection differently
          if (parentNode.type === 'BRANCH') {
            // If parent is a branch, add children to the same branch position
            newChildren.splice(targetInfo.parentIndex, 0, ...deletedNode.children);
          } else {
            // For action/root nodes, insert children at the same position
            newChildren.splice(targetInfo.parentIndex, 0, ...deletedNode.children);
          }
        }

        return {
          ...node,
          children: newChildren
        };
      }

      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: node.children.map(child => updateTree(child))
        };
      }

      return node;
    };

    const newWorkflow = updateTree(workflow);
    setWorkflow(newWorkflow);
    saveToHistory(newWorkflow);
  };

  // Edit a node's label
  const editNode = (nodeId, newLabel) => {
    if (!newLabel || newLabel.trim() === '') return;

    const updateTree = (node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          label: newLabel.trim()
        };
      }

      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: node.children.map(child => updateTree(child))
        };
      }

      return node;
    };

    const newWorkflow = updateTree(workflow);
    setWorkflow(newWorkflow);
    saveToHistory(newWorkflow);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title-section">
            <h1>
              <span className="brand-name">DevFlow</span>
              <span className="brand-tagline">Built for developers. Loved by teams.</span>
            </h1>

          </div>
          <div className="header-actions">
            <div className="action-group">
              <button
                className="action-btn undo-btn"
                onClick={undo}
                disabled={historyIndex === 0}
                title="Undo"
              >
                ↶ Undo
              </button>
              <button
                className="action-btn redo-btn"
                onClick={redo}
                disabled={historyIndex === history.length - 1}
                title="Redo"
              >
                ↷ Redo
              </button>
            </div>
            <div className="action-group">
              <button
                className="action-btn save-btn"
                onClick={saveWorkflow}
                title="Save workflow to console"
              >
                💾 Save
              </button>
              <button
                className="action-btn load-btn"
                onClick={loadWorkflow}
                title="Load workflow from JSON"
              >
                📂 Load
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="workflow-container">
        <div className="workflow-canvas" id="workflow-canvas">
          <Node
            node={workflow}
            onAddNode={addNode}
            onDelete={deleteNode}
            onEdit={editNode}
            onPositionUpdate={updateNodePosition}
            isRoot={true}
            depth={0}
            canvasId="workflow-canvas"
          />
        </div>
      </div>
    </div>
  );
};

export default App;
