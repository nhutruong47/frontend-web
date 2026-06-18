const fs = require('fs');
let content = fs.readFileSync('src/pages/MarketplacePage.tsx', 'utf8');

const oldActions = `<div className="mp-factory-actions" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 16px 16px'}}>
                                            {isOwnFactory ? (
                                                <button onClick={() => openEditPublishedTeam(factory)} style={{gridColumn: '1 / -1', background: 'var(--bg-input)', color: 'var(--text-primary)', padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, height: 38}}>{t.manageFactory}</button>
                                            ) : (
                                                <>
                                                    <button onClick={() => { setSelectedFactory(factory); setActiveProfileTab('overview'); }} style={{background: 'var(--bg-input)', color: 'var(--text-primary)', padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{t.viewCapacity}</button>
                                                    <button onClick={() => { const fact = factory; handleOrderClick(fact); }} style={{background: '#d4a574', color: '#1a1a1a', padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{t.sendRequest}</button>
                                                </>
                                            )}
                                        </div>`;

const newActions = `<div className="mp-factory-actions">
                                            {isOwnFactory ? (
                                                <button onClick={() => openEditPublishedTeam(factory)} className="mp-btn-manage">{t.manageFactory}</button>
                                            ) : (
                                                <>
                                                    <button onClick={() => { setSelectedFactory(factory); setActiveProfileTab('overview'); }} className="mp-btn-view">{t.viewCapacity}</button>
                                                    <button onClick={() => { const fact = factory; handleOrderClick(fact); }} className="mp-btn-request">{t.sendRequest}</button>
                                                </>
                                            )}
                                        </div>`;

content = content.replace(oldActions, newActions);
fs.writeFileSync('src/pages/MarketplacePage.tsx', content);

let css = fs.readFileSync('src/pages/Marketplace.css', 'utf8');

const newCss = `
.mp-factory-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding: 16px;
    margin-top: auto;
}

.mp-factory-actions button {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 13px;
    font-family: 'Montserrat', system-ui, sans-serif;
    cursor: pointer;
    transition: all 0.2s ease;
}

.mp-btn-manage {
    grid-column: 1 / -1;
    background: var(--bg-input);
    color: var(--text-primary);
    border: 1px solid var(--border);
}

.mp-btn-view {
    background: transparent;
    color: var(--text-primary);
    border: 1px solid var(--border);
}

.mp-btn-view:hover {
    background: var(--bg-input);
}

.mp-btn-request {
    background: #d4a574;
    color: #1a1a1a;
    border: none;
}

.mp-btn-request:hover {
    background: #e7b37f;
}

/* Light Theme Overrides */
body.theme-light .mp-manufacturing-market .mp-factory-actions {
    background: transparent;
    border-top: none;
}
body.theme-light .mp-manufacturing-market .mp-btn-view {
    background: #fffcf8;
    color: #322214;
    border: 1px solid rgba(50, 34, 20, 0.15);
}
body.theme-light .mp-manufacturing-market .mp-btn-view:hover {
    background: #f0eee9;
    border-color: rgba(50, 34, 20, 0.3);
}
body.theme-light .mp-manufacturing-market .mp-btn-request {
    background: #322214;
    color: #fff;
    box-shadow: 0 4px 12px rgba(50, 34, 20, 0.15);
}
body.theme-light .mp-manufacturing-market .mp-btn-request:hover {
    background: #1b1c19;
    box-shadow: 0 6px 16px rgba(50, 34, 20, 0.2);
}
`;

css += newCss;
fs.writeFileSync('src/pages/Marketplace.css', css);

console.log('Fixed styling for marketplace buttons');
