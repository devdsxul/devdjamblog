import fs from 'node:fs';
import path from 'node:path';

const chaptersDir = 'C:\\Users\\Administrator\\DevdSxulProject\\books\\我们是一个学习小组\\chapters';
const apiUrl = 'http://127.0.0.1:8787/wp-json/devdjam/v1/import-chapter';
const listUrl = 'http://127.0.0.1:8787/wp-json/devdjam/v1/chapters';

async function importChapters() {
  console.log(`Reading chapters from: ${chaptersDir}`);
  if (!fs.existsSync(chaptersDir)) {
    throw new Error(`Directory not found: ${chaptersDir}`);
  }

  let indexData = [];
  const indexPath = path.join(chaptersDir, 'index.json');
  if (fs.existsSync(indexPath)) {
    indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    console.log(`Loaded index.json with ${indexData.length} records.`);
  }

  const files = [
    '0001_五百九十九元的门票与凌晨三点十七分的绿灯.md',
    '0002_六十赫兹的底泥与吞食烟蒂的亚马孙河.md',
    '0003_故障切分的甜美噪音与自动旋转的银色菌盘.md',
  ];

  for (const filename of files) {
    const filePath = path.join(chaptersDir, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const match = filename.match(/^(\d+)_(.*?)\.md$/);
    const num = match ? parseInt(match[1], 10) : 1;
    const rawTitle = match ? match[2] : '第' + num + '章';

    const indexEntry = indexData.find((item) => item.number === num);
    const title = indexEntry?.title || rawTitle;
    const wordCount = indexEntry?.wordCount || 0;

    console.log(`Importing Chapter ${num}: ${title} (${wordCount} words)...`);

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: num,
        title: title,
        content: content,
        wordCount: wordCount,
        bookName: '我们是一个学习小组',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to import chapter ${num}: ${res.status} ${err}`);
    }

    const json = await res.json();
    console.log(`  -> Successfully imported Chapter ${num}, post_id: ${json.post_id}`);
  }

  console.log('\nVerifying imported chapters:');
  const checkRes = await fetch(listUrl);
  const chapters = await checkRes.json();
  console.log(`Total chapters in WordPress: ${chapters.length}`);
  for (const ch of chapters) {
    console.log(` - CH.${ch.number}: ${ch.title} (${ch.word_count} words) -> ${ch.url}`);
  }
}

importChapters().catch((err) => {
  console.error(err);
  process.exit(1);
});
