import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DOWNLOADS_DIR = '/Users/juansp/Downloads/icons';
const DEST_DIR = path.join(process.cwd(), 'assets/icons');
const SCRATCH_DIR = path.join(process.cwd(), 'scripts/scratch-icons');

const categories = {
  "ui-core": ["home", "setting", "user", "profile", "search", "menu", "arrow", "chevron", "bell", "notification", "trash", "delete", "edit", "pen", "pencil", "close", "cross", "check", "tick", "plus", "add", "minus", "remove", "star", "heart", "like", "share", "link", "download", "upload", "cloud", "wifi", "battery", "power", "refresh", "sync", "info", "help", "question", "idea", "lightbulb", "tag", "bookmark", "grid", "list", "more", "dot", "zoom"],
  "business-finance": ["money", "coin", "dollar", "euro", "chart", "graph", "trend", "wallet", "credit-card", "bank", "bitcoin", "crypto", "fintech", "economy", "market", "shop", "cart", "bag", "store", "buy", "sell", "price", "discount", "offer", "sale"],
  "tech-development": ["code", "programming", "database", "server", "network", "bug", "terminal", "console", "scrum", "agile", "device", "laptop", "computer", "smartphone", "mobile", "tablet", "screen", "monitor", "browser", "web", "app", "software", "hardware", "cpu", "chip", "api", "plugin", "extension"],
  "communication": ["chat", "message", "mail", "email", "inbox", "send", "receive", "phone", "call", "contact", "speech", "bubble", "bullhorn", "announce", "megaphone", "social", "network", "connect"],
  "media": ["camera", "video", "play", "pause", "stop", "record", "music", "audio", "sound", "volume", "mic", "microphone", "photo", "image", "picture", "gallery", "movie", "film"],
  "work-office": ["folder", "document", "file", "calendar", "clock", "time", "office", "desk", "chair", "job", "hire", "work", "stationery", "paper", "clip", "briefcase", "portfolio"],
  "security": ["lock", "unlock", "shield", "password", "security", "cyber", "auth", "secure", "protect", "guard", "key", "access", "safe", "privacy", "secret"],
  "science-education": ["book", "academy", "graduation", "school", "student", "teacher", "learn", "study", "brain", "mind", "atom", "dna", "science", "lab", "experiment", "research", "biology", "chemistry", "physics"],
  "health-medical": ["health", "medicine", "hospital", "doctor", "nurse", "pill", "syringe", "medical", "cross", "heartbeat", "pulse", "care", "cure", "treatment"],
  "lifestyle-events": ["event", "gym", "sport", "fitness", "workout", "travel", "globe", "earth", "world", "map", "pin", "location", "place", "food", "drink", "coffee", "tea", "restaurant", "cafe", "meal", "car", "bus", "train", "plane", "flight", "ticket", "hotel", "holiday", "vacation"]
};

// Cleanup old scratch if exists
if (fs.existsSync(SCRATCH_DIR)) {
  fs.rmSync(SCRATCH_DIR, { recursive: true, force: true });
}
fs.mkdirSync(SCRATCH_DIR, { recursive: true });

console.log('Unzipping all files to scratch directory...');
const zipFiles = fs.readdirSync(DOWNLOADS_DIR).filter(f => f.endsWith('.zip'));

for (const zip of zipFiles) {
  const zipPath = path.join(DOWNLOADS_DIR, zip);
  try {
    execSync(`unzip -q -o "${zipPath}" -d "${SCRATCH_DIR}"`);
  } catch (err) {
    console.error(`Failed to unzip ${zip}:`, err.message);
  }
}

console.log('Finding all SVGs and processing...');
let copiedCount = 0;
let discardedCount = 0;

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.svg')) {
      processSvg(fullPath, file);
    }
  }
}

function processSvg(fullPath, filename) {
  if (filename.toLowerCase().includes('font')) {
    discardedCount++;
    return;
  }

  // Extract pack name
  const parts = fullPath.split(path.sep);
  const packFolder = parts.find(p => p.match(/^\d+-/));
  const packName = packFolder ? packFolder.replace(/^\d+-/, '').toLowerCase() : '';

  let cleanName = filename.replace(/^[\d-]+/, '').toLowerCase().trim();
  if (cleanName === '.svg' || cleanName === '') return;
  
  const baseName = path.basename(cleanName, '.svg');

  let assignedCategory = null;
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => baseName.includes(kw))) {
      assignedCategory = category;
      break;
    }
  }

  if (assignedCategory) {
    const destCatDir = path.join(DEST_DIR, assignedCategory);
    if (!fs.existsSync(destCatDir)) {
      fs.mkdirSync(destCatDir, { recursive: true });
    }
    
    let destPath = path.join(destCatDir, cleanName);
    
    // Strict Collision Resolution
    if (fs.existsSync(destPath)) {
       // Append pack name to give it context
       if (packName) {
         const newBaseName = `${baseName}-${packName}`;
         cleanName = `${newBaseName}.svg`;
         destPath = path.join(destCatDir, cleanName);
       }
       
       // If it STILL exists, it means this is a duplicate from the SAME pack (e.g. 50 folders in folders.zip).
       // We discard it strictly! No counter loops.
       if (fs.existsSync(destPath)) {
           discardedCount++;
           return; // DROP IT!
       }
    }

    fs.copyFileSync(fullPath, destPath);
    copiedCount++;
  } else {
    discardedCount++;
  }
}

walkDir(SCRATCH_DIR);

console.log(`Finished processing!`);
console.log(`Icons kept: ${copiedCount}`);
console.log(`Icons discarded: ${discardedCount}`);

// Clean up scratch
fs.rmSync(SCRATCH_DIR, { recursive: true, force: true });
