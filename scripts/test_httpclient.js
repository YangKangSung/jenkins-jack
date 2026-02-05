const httpClient = require('../out/httpClient');

(async () => {
  try {
    const auth = 'Basic ' + Buffer.from('admin:admin').toString('base64');
    const r = await httpClient.get('http://localhost:18080/api/json?tree=jobs%5Bname,fullName,url,buildable,inQueue,description%5D', { headers: { Authorization: auth } });
    console.log('HTTP client GET response length:', r.length);
    console.log('Snippet:', r.slice(0, 200));

    const scriptResp = await httpClient.post({ url: 'http://localhost:18080/scriptText', form: { script: 'println("test-from-httpClient")' }, headers: { Authorization: auth } });
    console.log('scriptText response:', scriptResp.trim());
  } catch (err) {
    console.error('Error:', err);
  }
})();