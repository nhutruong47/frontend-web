const axios = require('axios');

async function test() {
    try {
        const res = await axios.post('http://localhost:8080/api/auth/login', {
            username: 'aaa@@',
            password: '...'
        }, {
            headers: { 'Origin': 'http://localhost:5175' }
        });
        console.log("SUCCESS");
    } catch (e) {
        if (e.response) {
            console.log("RESPONSE ERROR STATUS:", e.response.status);
            console.log("HEADERS:", e.response.headers);
        } else {
            console.log("NETWORK ERROR:", e.message);
        }
    }
}
test();
