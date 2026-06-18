const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'src/pages/MarketplacePage.tsx');
let content = fs.readFileSync(pageFile, 'utf8');

// 1. Add imports
if (!content.includes("import gsap from 'gsap';")) {
    content = content.replace("import './Marketplace.css';", "import './Marketplace.css';\nimport gsap from 'gsap';\nimport { useGSAP } from '@gsap/react';\nimport { useRef } from 'react';");
}

// 2. Add GSAP hook
const componentStart = 'export default function MarketplacePage() {';
const componentHook = `export default function MarketplacePage() {
    const container = useRef<HTMLDivElement>(null);
    
    useGSAP(() => {
        const tl = gsap.timeline();
        tl.from('.mp-hero-copy h1, .mp-hero-copy p', { y: 30, opacity: 0, duration: 0.8, stagger: 0.2, ease: 'power3.out' })
          .from('.mp-top-search', { scaleX: 0.95, opacity: 0, duration: 0.5, ease: 'power2.out' }, '-=0.4')
          .from('.mp-market-card', { y: 40, opacity: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out' }, '-=0.2');
    }, { scope: container });
`;
if (content.includes(componentStart) && !content.includes('const container = useRef')) {
    content = content.replace(componentStart, componentHook);
}

// 3. Add ref to the main wrapper
content = content.replace('<div className="mp-body mp-market-style mp-manufacturing-market">', '<div className="mp-body mp-market-style mp-manufacturing-market" ref={container}>');

// 4. Update the mp-top-search to include the new classes for Spotlight search
content = content.replace('<div className="mp-top-search" style={{marginLeft: \'auto\'}}>', '<div className="mp-top-search mp-spotlight-search" style={{marginLeft: \'auto\'}}>');

// 5. Update the grid cards to be mp-market-card and have hover elements
content = content.replace(/className="mp-partner-card"/g, 'className="mp-partner-card mp-market-card"');

// 6. Update Trust Score and Ratings inside the cards
// Find the place where the cards are rendered. It's usually inside factories.map
// Let's just write a generic replace for Trust Score style if it exists or we can just leave the CSS to handle it.
content = content.replace(/>Mạng Lưới Xưởng Rang/g, '><span style={{color: "#F59E0B"}}>Mạng Lưới</span> Xưởng Rang');

fs.writeFileSync(pageFile, content, 'utf8');
console.log('MarketplacePage.tsx GSAP hook added.');
