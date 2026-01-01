import React, { useState, useEffect, useRef } from 'react';
import './Node.css';

const Node = ({ node, onAddNode, onDelete, onEdit, onPositionUpdate, isRoot = false, depth = 0, canvasId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.label);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [showConnectionPoints, setShowConnectionPoints] = useState(false);
  const nodeRef = useRef(null);
  const menuRef = useRef(null);
  const branchMenuRef = useRef(null);

  // Initialize position if not set
  const position = node.position || { x: 0, y: 0 };

  // Update editValue when node.label changes
  useEffect(() => {
    setEditValue(node.label);
  }, [node.label]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowAddMenu(false);
      }
      if (branchMenuRef.current && !branchMenuRef.current.contains(event.target)) {
        setShowBranchMenu(false);
      }
      if (!nodeRef.current?.contains(event.target)) {
        setShowConnectionPoints(false);
      }
    };

    if (showAddMenu || showBranchMenu || showConnectionPoints) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showAddMenu, showBranchMenu, showConnectionPoints]);

  // Drag handlers
  const handleMouseDown = (e) => {
    if (isRoot) return; // Root node is not draggable
    if (e.target.closest('button') || e.target.closest('input')) return; // Don't drag when clicking buttons/inputs
    
    setIsDragging(true);
    
    // Get the parent container (child-wrapper) to calculate relative positions
    const parent = nodeRef.current?.parentElement;
    if (parent) {
      const parentRect = parent.getBoundingClientRect();
      const nodeRect = nodeRef.current.getBoundingClientRect();
      
      // Calculate offset from mouse to node's position within parent
      const offsetX = e.clientX - nodeRect.left;
      const offsetY = e.clientY - nodeRect.top;
      
      // Store initial mouse position and calculated offset
      setDragStart({ 
        x: e.clientX, 
        y: e.clientY,
        offsetX: offsetX,
        offsetY: offsetY,
        parentLeft: parentRect.left,
        parentTop: parentRect.top
      });
      setInitialPosition({ x: position.x, y: position.y });
    }
    
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (dragStart.parentLeft === undefined || dragStart.parentTop === undefined) return;
      
      // Calculate delta from initial mouse position
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      // Calculate new position relative to parent container
      const newX = initialPosition.x + deltaX;
      const newY = initialPosition.y + deltaY;
      
      // Update dragStart with delta for transform
      setDragStart(prev => ({ ...prev, deltaX, deltaY }));
      
      // Ensure position doesn't go negative
      onPositionUpdate(node.id, { 
        x: Math.max(0, newX), 
        y: Math.max(0, newY) 
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, node.id, onPositionUpdate]);

  const handleAddNode = (type, branchIndex = null) => {
    onAddNode(node.id, type, branchIndex);
    setShowAddMenu(false);
    setShowBranchMenu(false);
    setShowConnectionPoints(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (!isRoot && window.confirm(`Delete "${node.label}"?`)) {
      onDelete(node.id);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(node.label);
  };

  const handleSaveEdit = () => {
    if (editValue.trim() && editValue !== node.label) {
      onEdit(node.id, editValue);
    } else {
      setEditValue(node.label);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(node.label);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Cannot add children to End nodes
  const canAddChildren = node.type !== 'END';

  // Get branch labels
  const getBranchLabel = (index) => {
    if (node.type === 'BRANCH') {
      return index === 0 ? 'True' : index === 1 ? 'False' : `Branch ${index + 1}`;
    }
    return '';
  };

  // Get node icon
  const getNodeIcon = () => {
    switch (node.type) {
      case 'ROOT':
        return '🚀';
      case 'ACTION':
        return '⚡';
      case 'BRANCH':
        return '🔀';
      case 'END':
        return '🏁';
      default:
        return '●';
    }
  };

  return (
    <div 
      className={`node-wrapper ${node.type.toLowerCase()} ${isDragging ? 'dragging' : ''}`}
      data-depth={depth}
      style={{
        position: 'relative',
        left: isRoot ? 'auto' : `${position.x}px`,
        top: isRoot ? 'auto' : `${position.y}px`,
        cursor: isRoot ? 'default' : isDragging ? 'grabbing' : 'grab'
      }}
      ref={nodeRef}
      onMouseDown={handleMouseDown}
    >
      {!isRoot && <div className="connection-line-top"></div>}
      
      <div className={`node ${node.type.toLowerCase()} ${isDragging ? 'dragging' : ''}`}>
        <div className="node-header">
          <div className="node-icon">{getNodeIcon()}</div>
          {isEditing ? (
            <input
              type="text"
              className="node-edit-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <div className="node-label" onClick={handleEdit} title="Click to edit">
              {node.label}
            </div>
          )}
          <div className="node-type-badge">{node.type}</div>
          {!isRoot && (
            <button 
              className="delete-btn" 
              onClick={handleDelete}
              onMouseDown={(e) => e.stopPropagation()}
              title="Delete node"
            >
              ×
            </button>
          )}
        </div>

        {canAddChildren && (
          <div className="node-actions" ref={menuRef}>
            <button 
              className="add-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowAddMenu(!showAddMenu);
                setShowConnectionPoints(true);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              title="Add new node"
            >
              <span className="add-icon">+</span> Add Node
            </button>
            
            {showAddMenu && (
              <div className="add-menu" onMouseDown={(e) => e.stopPropagation()}>
                <button onClick={() => handleAddNode('action')} className="menu-item-action">
                  <span>⚡</span> Action
                </button>
                <button onClick={() => handleAddNode('branch')} className="menu-item-branch">
                  <span>🔀</span> Branch
                </button>
                <button onClick={() => handleAddNode('end')} className="menu-item-end">
                  <span>🏁</span> End
                </button>
              </div>
            )}
          </div>
        )}

        {node.type === 'BRANCH' && node.children && node.children.length > 0 && (
          <div className="branch-info" ref={branchMenuRef}>
            <button 
              className="branch-toggle"
              onClick={(e) => {
                e.stopPropagation();
                setShowBranchMenu(!showBranchMenu);
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span>🔀</span> Manage Branches
            </button>
            {showBranchMenu && (
              <div className="branch-menu" onMouseDown={(e) => e.stopPropagation()}>
                {node.children.map((child, index) => (
                  <div key={index} className="branch-menu-item">
                    <span className="branch-label">{getBranchLabel(index)}</span>
                    <div className="branch-actions">
                      <button onClick={() => handleAddNode('action', index)}>
                        <span>⚡</span> Action
                      </button>
                      <button onClick={() => handleAddNode('branch', index)}>
                        <span>🔀</span> Branch
                      </button>
                      <button onClick={() => handleAddNode('end', index)}>
                        <span>🏁</span> End
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {node.children && node.children.length > 0 && (
        <>
          <div className="node-children">
            {node.children.map((child, index) => (
              <div key={child.id} className="child-wrapper">
                <div className="connection-line"></div>
                {node.type === 'BRANCH' && (
                  <div className="branch-label-connector">
                    {getBranchLabel(index)}
                  </div>
                )}
                <Node
                  node={child}
                  onAddNode={onAddNode}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onPositionUpdate={onPositionUpdate}
                  depth={depth + 1}
                  canvasId={canvasId}
                />
              </div>
            ))}
          </div>
          {!isRoot && <div className="connection-line-bottom"></div>}
        </>
      )}
    </div>
  );
};

export default Node;
