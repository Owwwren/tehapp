import React from 'react';
import { Button } from 'antd';

function VlozheniaButton({ onClick }) {
  return (
    <Button 
      size="small" 
      type="primary"
      onClick={onClick}
      style={{ 
        background: '#8B5CF6', 
        borderColor: '#8B5CF6',
        borderRadius: 6,
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#7C3AED';
        e.currentTarget.style.borderColor = '#7C3AED';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#8B5CF6';
        e.currentTarget.style.borderColor = '#8B5CF6';
      }}
    >Вложения</Button>
  );
}

export default VlozheniaButton;