import React from 'react';
import { Modal } from 'antd';
import dayjs from 'dayjs';

function CommentsHistoryModal({ open, onClose, comments }) {
  return (
    <Modal title="📋 История комментариев" open={open} onCancel={onClose} footer={null} width={500}>
      {comments.length === 0 ? (
        <p>История пуста</p>
      ) : (
        comments.map((c, i) => (
          <div key={i} style={{ marginBottom: 12, padding: '8px 12px', borderLeft: '3px solid #2563EB' }}>
            <div style={{ fontSize: 12, color: '#888' }}>{dayjs(c.created_at).format('DD.MM.YYYY HH:mm')} — {c.user_name}</div>
            <div style={{ marginTop: 4 }}>{c.text}</div>
          </div>
        ))
      )}
    </Modal>
  );
}

export default CommentsHistoryModal;