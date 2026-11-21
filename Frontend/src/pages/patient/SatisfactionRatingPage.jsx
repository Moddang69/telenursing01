import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Star, Send, CheckCircle } from 'lucide-react';
import { satisfactionService } from '../../services/satisfactionService.js';
import './SatisfactionRatingPage.css';

/**
 * SatisfactionRatingPage - หน้าให้คะแนนความพึงพอใจหลังวิดีโอคอล
 * เข้าถึงได้จาก /patient/satisfaction-rating?appointmentId=xxx
 */
export default function SatisfactionRatingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!appointmentId) {
      setError('ไม่พบข้อมูลการนัดหมาย');
    }
  }, [appointmentId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('กรุณาให้คะแนน');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await satisfactionService.submitRating(appointmentId, rating, comment);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการส่งคะแนน');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="satisfaction-page">
        <div className="satisfaction-success">
          <CheckCircle size={64} className="success-icon" />
          <h2>ขอบคุณสำหรับคะแนนของคุณ!</h2>
          <p>ความคิดเห็นของคุณมีค่าต่อการปรับปรุงบริการของเรา</p>
          <button className="btn-primary" onClick={() => navigate('/patient/home')}>
            กลับสู่หน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="satisfaction-page">
      <div className="satisfaction-container">
        <h1>ให้คะแนนความพึงพอใจ</h1>
        <p className="subtitle">กรุณาให้คะแนนการให้บริการของพยาบาล</p>

        {error && <div className="error-message">{error}</div>}

        <div className="rating-section">
          <label>คะแนนความพึงพอใจ</label>
          <div className="star-rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={48}
                className={`star ${star <= (hoverRating || rating) ? 'filled' : ''}`}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              />
            ))}
          </div>
          <div className="rating-label">
            {rating > 0 && (
              <span>
                {rating === 1 && 'ดีมาก'}
                {rating === 2 && 'ดี'}
                {rating === 3 && 'ปานกลาง'}
                {rating === 4 && 'พอใช้'}
                {rating === 5 && 'ต้องปรับปรุง'}
              </span>
            )}
          </div>
        </div>

        <div className="comment-section">
          <label>แสดงความคิดเห็น (ไม่บังคับ)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="แชร์ประสบการณ์ของคุณกับเรา..."
            rows={4}
            maxLength={500}
          />
          <div className="char-count">{comment.length}/500</div>
        </div>

        <div className="button-group">
          <button
            className="btn-secondary"
            onClick={() => navigate('/patient/home')}
            disabled={loading}
          >
            ยกเลิก
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading || rating === 0}
          >
            <Send size={18} />
            {loading ? 'กำลังส่ง...' : 'ส่งคะแนน'}
          </button>
        </div>
      </div>
    </div>
  );
}
