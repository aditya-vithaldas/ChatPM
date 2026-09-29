import fs from 'node:fs/promises';
import path from 'node:path';

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY is required');

const outDir = new URL('./assets/voice-v2/', import.meta.url);
await fs.mkdir(outDir, { recursive: true });

const voices = {
  narrator: 'FwuKjlVpi0N3exead7ji',
  maya: 'EXAVITQu4vr4xnSDxMaL',
};

const takes = [
  { file: '01-narrator-opening.mp3', voice: 'narrator', text: '[calm, assured] Commerce teams rarely suffer from too little data. The harder problem is knowing which signal deserves attention.' },
  { file: '02-maya-campaign.mp3', voice: 'maya', text: '[mildly frustrated, curious] Did Halloween finish differently from plan?' },
  { file: '03-narrator-choice.mp3', voice: 'narrator', text: '[thoughtful] Meridian notices the change before the review begins, then gives the team three clear paths to investigate.' },
  { file: '04-maya-region.mp3', voice: 'maya', text: '[curious, decisive] Start with regions. Which market explains most of the drop?' },
  { file: '05-narrator-context.mp3', voice: 'narrator', text: '[measured] Every follow-up keeps the original evidence attached: region, category, and a like-for-like calendar check.' },
  { file: '06-narrator-memory.mp3', voice: 'narrator', text: '[quietly confident] When Maya recognizes an earlier pattern, Meridian reopens it without mixing the evidence.' },
  { file: '07-maya-action.mp3', voice: 'maya', text: '[concerned, decisive] We saw this before. Pull in that case—and watch Western Europe.' },
  { file: '08-narrator-continuity.mp3', voice: 'narrator', text: '[warm, purposeful] The analyst joins the call, continues in Slack, and keeps working after the meeting ends.' },
  { file: '09-maya-closing.mp3', voice: 'maya', text: '[warm, genuinely pleased] Thanks, Meridian. You did good.' },
  { file: '10-narrator-end.mp3', voice: 'narrator', text: '[assured] Meridian. Commerce intelligence for what comes next.' },
];

const settings = {
  stability: 0.62,
  similarity_boost: 0.78,
  style: 0.12,
  use_speaker_boost: true,
  speed: 0.98,
};

for (const take of takes) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voices[take.voice]}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
    body: JSON.stringify({ text: take.text, model_id: 'eleven_v4', voice_settings: settings }),
  });
  if (!response.ok) throw new Error(`${take.file}: ${response.status} ${await response.text()}`);
  await fs.writeFile(new URL(take.file, outDir), Buffer.from(await response.arrayBuffer()));
  process.stdout.write(`${take.file}\n`);
}

await fs.writeFile(new URL('manifest.json', outDir), JSON.stringify({
  provider: 'ElevenLabs',
  model: 'eleven_v4',
  voices,
  settings,
  takes,
}, null, 2));

console.log(path.resolve(new URL('.', outDir).pathname));
