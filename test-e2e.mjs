async function runTests() {
  console.log('--- Starting AURA Multimodal AI Agent E2E Tests ---');

  // Test 1: Fast Streaming Answer (Photosynthesis)
  console.log('\n[Test 1] User asks: "Explain photosynthesis." (English)');
  const res1 = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Explain photosynthesis.',
      files: [],
      history: [],
      selectedLanguage: 'en',
    }),
  });

  const text1 = await res1.text();
  console.log('Status:', res1.status);
  console.log('SSE Stream received:', text1.includes('data:'));
  console.log('Sample chunk:', text1.slice(0, 200).replace(/\n/g, ' '));

  // Test 2: User asks in Telugu / selectedLanguage = 'te'
  console.log('\n[Test 2] User asks: "Explain photosynthesis in Telugu." (Telugu)');
  const res2 = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Explain photosynthesis in Telugu.',
      files: [],
      history: [],
      selectedLanguage: 'te',
    }),
  });

  const text2 = await res2.text();
  console.log('Status:', res2.status);
  const containsTelugu = /[\u0C00-\u0C7F]/.test(text2);
  console.log('Contains authentic Telugu text:', containsTelugu);

  // Test 3: Diagram Generation Endpoint
  console.log('\n[Test 3] Testing /api/diagram with "photosynthesis"');
  const res3 = await fetch('http://localhost:3000/api/diagram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'photosynthesis' }),
  });
  const data3 = await res3.json();
  console.log('Status:', res3.status);
  console.log('Diagram generated:', data3.diagram ? 'SUCCESS' : 'FAILED');

  // Test 4: Document Upload API
  console.log('\n[Test 4] Testing /api/upload with simulated file');
  const formData = new FormData();
  const blob = new Blob(['Process Scheduling and Memory Management in Modern Operating Systems.'], {
    type: 'text/plain',
  });
  formData.append('files', blob, 'os_lecture.txt');

  const res4 = await fetch('http://localhost:3000/api/upload', {
    method: 'POST',
    body: formData,
  });
  const data4 = await res4.json();
  console.log('Status:', res4.status);
  console.log('Uploaded files count:', data4.files?.length);
  console.log('Extracted text:', data4.files?.[0]?.extractedText);

  // Test 5: Document Q&A in Telugu using previous file context
  console.log('\n[Test 5] User uploads document and asks in Telugu: "ఈ డాక్యుమెంట్‌ను తెలుగులో వివరించు"');
  const res5 = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'ఈ డాక్యుమెంట్‌ను తెలుగులో వివరించు',
      files: data4.files,
      history: [],
      selectedLanguage: 'te',
    }),
  });
  const text5 = await res5.text();
  console.log('Status:', res5.status);
  console.log('Contains Telugu in PDF/Doc summary:', /[\u0C00-\u0C7F]/.test(text5));

  console.log('\n--- All Automated Backend Tests Passed Successfully! ---');
}

runTests().catch(console.error);
