// Using native fetch

async function testLogin() {
  try {
    const res = await fetch('https://zomp-api.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'leandro2703palmeira@gmail.com',
        password: 'Lps27031981@'
      })
    });
    
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testLogin();
