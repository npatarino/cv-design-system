import fs from 'fs';
import path from 'path';

const iconsDir = path.join(process.cwd(), 'assets/icons');
const categories = fs.readdirSync(iconsDir).filter(f => fs.statSync(path.join(iconsDir, f)).isDirectory());

let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Chimi Design System - Icon Preview</title>
  <style>
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      background: #0f172a; 
      color: #f8fafc;
      padding: 2rem; 
      margin: 0;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 { 
      text-align: center; 
      color: #38bdf8; 
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    .search-container {
      text-align: center;
      margin-bottom: 3rem;
    }
    #searchInput {
      padding: 1rem 1.5rem;
      width: 100%;
      max-width: 500px;
      border-radius: 9999px;
      border: 1px solid #334155;
      background: #1e293b;
      color: #f8fafc;
      font-size: 1.1rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    #searchInput:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
    }
    h2 { 
      color: #e2e8f0; 
      margin-top: 2rem; 
      border-bottom: 1px solid #334155; 
      padding-bottom: 0.5rem; 
      text-transform: capitalize;
    }
    .grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); 
      gap: 1.5rem; 
      margin-top: 1.5rem; 
    }
    .card { 
      background: #1e293b; 
      border: 1px solid #334155; 
      border-radius: 12px; 
      padding: 1.5rem 1rem; 
      text-align: center; 
      transition: all 0.2s ease; 
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .card:hover { 
      transform: translateY(-4px); 
      border-color: #38bdf8;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5); 
    }
    .card img { 
      width: 48px; 
      height: 48px; 
      margin-bottom: 1rem;
      filter: invert(1) opacity(0.9);
    }
    .card span { 
      display: block; 
      font-size: 0.8rem; 
      color: #94a3b8; 
      word-break: break-word; 
    }
    .hidden {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Icon Preview Gallery</h1>
    <div class="search-container">
      <input type="text" id="searchInput" placeholder="Search icons..." autofocus autocomplete="off" />
    </div>
`;

let total = 0;
for (const cat of categories) {
  const files = fs.readdirSync(path.join(iconsDir, cat)).filter(f => f.endsWith('.svg'));
  if (files.length === 0) continue;
  
  total += files.length;
  html += `<h2 class="category-header">${cat.replace(/-/g, ' ')} (${files.length})</h2><div class="grid">`;
  for (const file of files) {
    html += `
      <div class="card">
        <img src="./${cat}/${file}" alt="${file}">
        <span>${file.replace('.svg', '')}</span>
      </div>
    `;
  }
  html += `</div>`;
}

html += `
  </div>
  <script>
    const searchInput = document.getElementById('searchInput');
    const cards = document.querySelectorAll('.card');
    const grids = document.querySelectorAll('.grid');

    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      
      cards.forEach(card => {
        const name = card.querySelector('span').textContent.toLowerCase();
        if (name.includes(term)) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });

      grids.forEach(grid => {
        const visibleCards = grid.querySelectorAll('.card:not(.hidden)').length;
        const header = grid.previousElementSibling;
        if (visibleCards === 0) {
          grid.classList.add('hidden');
          if (header) header.classList.add('hidden');
        } else {
          grid.classList.remove('hidden');
          if (header) header.classList.remove('hidden');
        }
      });
    });
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(iconsDir, 'preview.html'), html);
console.log('preview.html generated successfully.');
