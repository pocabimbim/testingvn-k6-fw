import http from 'k6/http';
import { check } from 'k6';

// Đọc và phân tích tệp JSON chứa dữ liệu người dùng
const userData = JSON.parse(open('./users.json'));

export default function () {
  // Lấy bản ghi dựa trên ID của VU
  // Dùng toán tử % để lặp lại dữ liệu nếu số VU vượt quá số bản ghi
  const userRecord = userData[(__VU - 1) % userData.length];

  // Thực hiện test với bản ghi riêng của user
  const payload = JSON.stringify({
    username: userRecord.username,
    password: userRecord.password,
  });

  console.log(`VU ${__VU} is using username: ${userRecord.username}`);

  const params = { headers: { 'Content-Type': 'application/json' } };
  const res = http.post('https://example.com', payload, params);

  check(res, { 'status was 200': (r) => r.status === 200 });
}
