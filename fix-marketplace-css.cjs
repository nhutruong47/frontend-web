const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Marketplace.css');
const content = fs.readFileSync(filePath, 'utf8');

// Find the end of the last valid rule before the appended CSS
// The last valid rule was:
// .mp-market-card:hover .mp-market-card-rfq-btn {
//     opacity: 1;
//     transform: translateY(0);
// }
const regex = /\.mp-market-card:hover \.mp-market-card-rfq-btn\s*\{[\s\S]*?transform:\s*translateY\(0\);[\s\S]*?\}/;
const match = content.match(regex);

if (!match) {
    console.error("Marker not found!");
} else {
    const markerEndPos = match.index + match[0].length;
    const cleanContent = content.substring(0, markerEndPos);
    
    const appendContent = `\n
/* === Light Theme Overrides for Manufacturing Market === */
body.theme-light .mp-body.mp-manufacturing-market {
    --mp-bg: #fbf9f4;
    --mp-surface: #fffcf8;
    --mp-surface-low: #f0eee9;
    --mp-surface-high: #f6f1e8;
    --mp-outline: rgba(50, 34, 20, 0.12);
    --mp-outline-strong: #735a3a;
    --mp-text: #1b1c19;
    --mp-heading: #3a2414;
    --mp-muted: #6b5344;
    --mp-primary: #322214;
    --mp-primary-strong: #735a3a;
    --mp-success: #16a34a;
}
body.theme-light .mp-manufacturing-market .mp-topbar { background: rgba(251, 249, 244, 0.94); border-bottom-color: var(--mp-outline); }
body.theme-light .mp-manufacturing-market .mp-top-search input { border: 1px solid var(--mp-outline); background: #fffcf8; color: #1b1c19; }
body.theme-light .mp-manufacturing-market .mp-top-search input::placeholder { color: #9b8b7e; }
body.theme-light .mp-manufacturing-market .mp-top-actions button { color: #735a3a; }
body.theme-light .mp-manufacturing-market .mp-user-avatar { border-color: rgba(115, 90, 58, 0.28); background: #fffcf8; color: #322214; }
body.theme-light .mp-manufacturing-market .mp-market-hero {
    background: linear-gradient(90deg, rgba(251, 249, 244, 0.98) 0%, rgba(251, 249, 244, 0.9) 38%, rgba(251, 249, 244, 0.28) 100%), url('/luxury-coffee-hero.png') center / cover;
    border: 1px solid var(--mp-outline);
}
body.theme-light .mp-manufacturing-market .mp-market-hero h1 { color: #1b1c19; }
body.theme-light .mp-manufacturing-market .mp-market-hero h1 em { color: #d97706; }
body.theme-light .mp-manufacturing-market .mp-market-hero p { color: #6b5344; }
body.theme-light .mp-manufacturing-market .mp-verified { background: rgba(217, 119, 6, 0.1); border-color: rgba(217, 119, 6, 0.2); color: #d97706; }
body.theme-light .mp-manufacturing-market .mp-hero-buttons button, body.theme-light .mp-manufacturing-market .mp-cta button { background: #322214; color: #fff; }
body.theme-light .mp-manufacturing-market .mp-hero-buttons button:last-child { background: rgba(50, 34, 20, 0.05); color: #322214; border-color: rgba(50, 34, 20, 0.2); }
body.theme-light .mp-manufacturing-market .mp-hero-control-card { background: rgba(255, 252, 248, 0.85); border: 1px solid var(--mp-outline); box-shadow: 0 10px 40px rgba(50, 34, 20, 0.08); }
body.theme-light .mp-manufacturing-market .mp-hero-control-card h3 { color: #1b1c19; }
body.theme-light .mp-manufacturing-market .mp-hero-control-card dt { color: #6b5344; }
body.theme-light .mp-manufacturing-market .mp-hero-control-card dd { color: #1b1c19; }
body.theme-light .mp-manufacturing-market .mp-hero-control-card button { background: #fffcf8; color: #322214; border-color: rgba(50, 34, 20, 0.15); }
body.theme-light .mp-manufacturing-market .mp-category-row button { background: #fffcf8; color: #6b5344; border-color: var(--mp-outline); }
body.theme-light .mp-manufacturing-market .mp-category-row button.active { background: #322214; color: #fff; border-color: #322214; }
body.theme-light .mp-manufacturing-market .mp-category-row button:hover:not(.active) { background: #f6f1e8; color: #322214; }
body.theme-light .mp-manufacturing-market .mp-section-title-row h2 { color: #1b1c19; }
body.theme-light .mp-manufacturing-market .mp-section-title-row p { color: #6b5344; }
body.theme-light .mp-manufacturing-market .mp-factory-card { background: #fffcf8; border-color: var(--mp-outline); box-shadow: 0 4px 20px rgba(50, 34, 20, 0.04); }
body.theme-light .mp-manufacturing-market .mp-factory-card:hover { box-shadow: 0 12px 32px rgba(50, 34, 20, 0.08); border-color: rgba(50, 34, 20, 0.2); }
body.theme-light .mp-manufacturing-market .mp-factory-card h3 { color: #1b1c19; }
body.theme-light .mp-manufacturing-market .mp-factory-card-head p { color: #6b5344; }
body.theme-light .mp-manufacturing-market .mp-factory-meta { border-top-color: var(--mp-outline); border-bottom-color: var(--mp-outline); }
body.theme-light .mp-manufacturing-market .mp-factory-meta > div { border-right-color: var(--mp-outline); }
body.theme-light .mp-manufacturing-market .mp-factory-meta strong { color: #1b1c19; }
body.theme-light .mp-manufacturing-market .mp-factory-meta span { color: #6b5344; }
body.theme-light .mp-manufacturing-market .mp-factory-tags span { background: rgba(50, 34, 20, 0.05); color: #6b5344; border-color: rgba(50, 34, 20, 0.1); }
body.theme-light .mp-manufacturing-market .mp-factory-actions { background: #f6f1e8; border-top-color: var(--mp-outline); }
body.theme-light .mp-manufacturing-market .mp-factory-actions button:first-child { background: #fffcf8; color: #322214; border-color: rgba(50, 34, 20, 0.15); }
body.theme-light .mp-manufacturing-market .mp-factory-actions button:last-child { background: #322214; color: #fff; }
body.theme-light .mp-manufacturing-market .mp-cta { background: linear-gradient(135deg, #f6f1e8 0%, #fffcf8 100%); border-color: var(--mp-outline); }
body.theme-light .mp-manufacturing-market .mp-cta h2 { color: #1b1c19; }
body.theme-light .mp-manufacturing-market .mp-cta p { color: #6b5344; }
body.theme-light .mp-manufacturing-market .mp-cta small { color: #9b8b7e; }
`;

    fs.writeFileSync(filePath, cleanContent + appendContent, 'utf8');
    console.log("Fixed successfully!");
}
