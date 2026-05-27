import React, { useState } from 'react';
import { Modal, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import api from '../services/api';

const API_BASE = 'http://localhost:8000';

function PhotoUploader({ entityType = 'order', entityId, photos, onPhotosChange, localFiles = [], onLocalFilesChange, instantUpload = true }) {
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const handleUpload = async (type, event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!entityId) {
      message.error('Сначала сохраните запись');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
      const url = entityType === 'transaction'
        ? `/${entityType}s/${entityId}/photos`
        : `/${entityType}s/${entityId}/photos?photo_type=${type}`;
      await api.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('Фото загружено');
      const response = await api.get(`/${entityType}s/${entityId}/photos`);
      onPhotosChange(response.data);
    } catch (error) {
      message.error('Ошибка загрузки фото');
    }
  };

  const handleDelete = async (photo) => {
    Modal.confirm({
      title: 'Удалить фото?',
      content: 'Это действие нельзя отменить.',
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await api.delete(`/${entityType}s/${entityId}/photos/${photo.id}`);
          message.success('Фото удалено');
          const response = await api.get(`/${entityType}s/${entityId}/photos`);
          onPhotosChange(response.data);
        } catch (error) {
          message.error('Ошибка удаления');
        }
      },
    });
  };

  const renderGroup = (type, label) => {
    const groupPhotos = entityType === 'transaction'
      ? photos
      : photos.filter((p) => p.photo_type === type);
    return (
      <div>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>{label}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {groupPhotos.map((p) => (
            <div
              key={p.id}
              style={{
                width: 60, height: 60, borderRadius: 6, overflow: 'hidden',
                border: '1px solid #d9d9d9', cursor: 'pointer',
                background: '#fafafa', position: 'relative',
              }}
            >
              <img
                src={`${API_BASE}/${entityType}s/photos/${p.filename}`}
                alt={p.filename}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onClick={() => setPreviewPhoto(`${API_BASE}/${entityType}s/photos/${p.filename}`)}
              />
              <DeleteOutlined
                onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
                style={{
                  position: 'absolute', top: 2, right: 2,
                  color: '#ff4d4f', background: 'rgba(255,255,255,0.85)',
                  borderRadius: '50%', padding: 2, fontSize: 12,
                  cursor: 'pointer',
                }}
              />
            </div>
          ))}
          <div
            onClick={() => document.getElementById(`photo-upload-${type}`).click()}
            style={{
              width: 60, height: 60, borderRadius: 6,
              border: '1px dashed #d9d9d9', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#888', fontSize: 24,
            }}
          >+</div>
          <input
            type="file" accept="image/*" style={{ display: 'none' }}
            id={`photo-upload-${type}`}
            onChange={(e) => { handleUpload(type, e); e.target.value = ''; }}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      {entityType === 'order' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          {renderGroup('contract', '📋 Договор')}
          {renderGroup('receipt', '🧾 Чек на запчасти')}
        </div>
      )}
      {entityType === 'transaction' && renderGroup('photo', '📎')}
      {entityType === 'user' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          {renderGroup('passport', '🪪 Паспорт')}
          {renderGroup('contract', '📄 Договор сотрудничества')}
        </div>
      )}

      <Modal open={!!previewPhoto} footer={null} onCancel={() => setPreviewPhoto(null)} width="fit-content" centered style={{ maxWidth: '90vw' }}>
        {previewPhoto && (
          <div style={{ position: 'relative', lineHeight: 0, overflow: 'hidden', cursor: 'crosshair' }}
            onMouseLeave={() => { const lens = document.getElementById('zoom-lens'); if (lens) lens.style.display = 'none'; }}
            onMouseMove={(e) => {
              const lens = document.getElementById('zoom-lens');
              const container = e.currentTarget;
              const img = container.querySelector('img');
              if (!lens || !img) return;
              const containerRect = container.getBoundingClientRect();
              const x = e.clientX - containerRect.left;
              const y = e.clientY - containerRect.top;
              const lensW = 200, lensH = 200;
              let lensX = Math.max(0, Math.min(x - lensW / 2, containerRect.width - lensW));
              let lensY = Math.max(0, Math.min(y - lensH / 2, containerRect.height - lensH));
              lens.style.left = lensX + 'px';
              lens.style.top = lensY + 'px';
              lens.style.backgroundImage = `url(${previewPhoto})`;
              lens.style.backgroundSize = `${img.naturalWidth * 2.5}px ${img.naturalHeight * 2.5}px`;
              lens.style.backgroundPosition = `${(lensX / containerRect.width) * 100}% ${(lensY / containerRect.height) * 100}%`;
              lens.style.display = 'block';
            }}
          >
            <img src={previewPhoto} alt="Превью" style={{ maxWidth: '85vw', maxHeight: '80vh', display: 'block' }} draggable={false} />
            <div id="zoom-lens" style={{ display: 'none', position: 'absolute', width: 200, height: 200, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', backgroundRepeat: 'no-repeat', pointerEvents: 'none', zIndex: 10 }} />
          </div>
        )}
      </Modal>
    </>
  );
}

export default PhotoUploader;