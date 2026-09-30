import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { topic, context } = await req.json();

    // Generate a clean Mermaid diagram based on topic
    let mermaidChart = `graph TD\n  Start["${topic || 'System Process'}"] --> Step1["Input & Detection"]\n  Step1 --> Step2["Multimodal Processing"]\n  Step2 --> Step3["Analysis & Synthesis"]\n  Step3 --> Result["Output & Voice Generation"]`;

    const t = (topic || '').toLowerCase();
    if (t.includes('photosynthesis') || t.includes('కిరణజన్య')) {
      mermaidChart = `graph TD
  Sun["☀️ Sunlight Energy"] --> Chloroplast["🍃 Chloroplast (Chlorophyll)"]
  Water["💧 Water (H₂O)"] --> Chloroplast
  CO2["💨 Carbon Dioxide (CO₂)"] --> Calvin["Calvin Cycle (Stroma)"]
  Chloroplast --> LightReactions["⚡ Light Reactions (Thylakoids)"]
  LightReactions --> Oxygen["🌿 Oxygen (O₂) Released"]
  LightReactions --> Energy["ATP & NADPH"]
  Energy --> Calvin
  Calvin --> Glucose["🍬 Glucose (C₆H₁₂O₆)"]`;
    } else if (t.includes('process') || t.includes('os') || t.includes('scheduling')) {
      mermaidChart = `graph LR
  New["New State"] --> Ready["Ready Queue"]
  Ready --> Running["CPU Running"]
  Running --> Terminated["Terminated"]
  Running --> Waiting["I/O Wait"]
  Waiting --> Ready
  Running --> Ready`;
    }

    return NextResponse.json({
      diagram: mermaidChart,
      title: topic || 'Visual Flowchart',
    });
  } catch (error: unknown) {
    console.error('Diagram generator error:', error);
    return NextResponse.json({ error: 'Failed to generate visual diagram' }, { status: 500 });
  }
}
