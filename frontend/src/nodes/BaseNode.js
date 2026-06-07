// BaseNode.js

export const getHandleStyle = (index, total) => ({
  top: `${((index + 1) / (total + 1)) * 100}%`,
});

export const BaseNode = ({ id, title, color = '#a855f7', children, style }) => {
  return (
    <div className="base-node" style={style}>
      {/* Left accent rail — 3px absolute strip, full height */}
      <div className="base-node__accent" style={{ background: color }} />

      {/* Header: type label + node ID */}
      <div className="base-node__header">
        <span className="base-node__title" style={{ color }}>{title}</span>
        {id && <span className="base-node__id">{id}</span>}
      </div>

      {/* Content */}
      <div className="base-node__body">
        {children}
      </div>
    </div>
  );
};
