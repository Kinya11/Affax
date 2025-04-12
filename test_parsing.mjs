import fs from 'fs';

try {
  const content = fs.readFileSync('./firefox.json', 'utf8');
  
  // Clean the content
  const cleaned = content
    .replace(/\\n/g, '')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\s+/g, ' ')
    .trim();

  console.log("Cleaned content:");
  console.log(cleaned);
  
  // Parse the JSON
  const parsed = JSON.parse(cleaned);
  console.log("\nParsed successfully:", parsed);
  
  console.log("\nCommand for current platform:");
  console.log(parsed[{
    win32: 'windows',
    darwin: 'macos',
    linux: 'linux'
  }[process.platform]]);
} catch (e) {
  console.error("Error:", e.message);
  console.log("Raw content:", fs.readFileSync('./firefox.json', 'utf8'));
}