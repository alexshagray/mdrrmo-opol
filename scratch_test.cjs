const axios = require('axios');
axios.post('http://127.0.0.1:8000/api/register', {
  name: 'Test User',
  email: 'test_new_register@example.com',
  password: 'password123',
  phone: '09876543212'
}, {
  headers: { 'Accept': 'application/json' }
}).then(res => console.log("SUCCESS:", res.data))
  .catch(err => console.log("ERROR:", err.response ? err.response.data : err.message));
