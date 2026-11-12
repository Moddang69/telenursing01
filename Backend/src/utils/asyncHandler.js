/**
 * asyncHandler.js
 * ดัก try/catch ของ Controller async ทุกตัว โดยไม่ต้องเขียน try/catch ซ้ำทุกฟังก์ชัน
 * ส่ง error ต่อไปยัง Global Error Handler (errorHandler.js) ผ่าน next(err)
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
