// draggableNode.js

export const DraggableNode = ({ type, label, color = '#A855F7' }) => {
  const onDragStart = (event) => {
    event.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify({ nodeType: type })
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="node-library__item"
      onDragStart={onDragStart}
      draggable
    >
      <div
        className="node-library__item-dot"
        style={{ background: color }}
      />
      <span className="node-library__item-label">{label}</span>
      <span className="node-library__item-type">{type}</span>
    </div>
  );
};
