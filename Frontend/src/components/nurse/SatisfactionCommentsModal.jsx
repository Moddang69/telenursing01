import React, { useEffect, useState } from 'react';
import { X, Star, MessageSquare } from 'lucide-react';
import { nurseService } from '../../services/nurseService.js';
import './SatisfactionCommentsModal.css';

/**
 * SatisfactionCommentsModal - Modal แสดงรายการคอมเมนต์ความพึงพอใจ
 * @param {boolean} isOpen - สถานะการเปิด/ปิด Modal
 * @param {function} onClose - ฟังก์ชันสำหรับปิด Modal
 */
export default function SatisfactionCommentsModal({ isOpen, onClose }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRatings();
    }
  }, [isOpen]);

  const loadRatings = async () => {
    setLoading(true);
    try {
      const data = await nurseService.getSatisfactionRatings();
      setRatings(data);
    } catch (error) {
      console.error('Failed to load satisfaction ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={16}
        className={index < rating ? 'star-filled' : 'star-empty'}
      />
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container satisfaction-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <MessageSquare size={24} />
            ความคิดเห็นจากผู้รับบริการ
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>กำลังโหลดข้อมูล...</p>
            </div>
          ) : ratings.length === 0 ? (
            <div className="empty-state">
              <MessageSquare size={48} className="empty-icon" />
              <p>ยังไม่มีความคิดเห็น</p>
            </div>
          ) : (
            <div className="ratings-list">
              {ratings.map((rating) => (
                <div key={rating._id} className="rating-card">
                  <div className="rating-header">
                    <div className="patient-info">
                      <span className="patient-name">
                        {rating.patientId?.firstName} {rating.patientId?.lastName}
                      </span>
                      <span className="rating-date">{formatDate(rating.createdAt)}</span>
                    </div>
                    <div className="rating-stars">{renderStars(rating.rating)}</div>
                  </div>
                  {rating.comment && (
                    <div className="rating-comment">
                      <p>{rating.comment}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
