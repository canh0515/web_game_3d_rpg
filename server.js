const express = require("express");
const path = require("path");
const app = express();
const port = process.env.PORT || 3009;

// Phục vụ các file tĩnh từ thư mục public (hoặc thư mục chứa index.html của bạn)
app.use(express.static(path.join(__dirname, "public"))); // Hoặc có thể là thư mục gốc (__) nếu index.html ở đó

// Định tuyến cho trang chủ
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html")); // Đảm bảo đường dẫn này đúng với vị trí file index.html của bạn
});

// Khởi động server
app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});
