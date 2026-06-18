const fs = require('fs');
let content = fs.readFileSync('src/pages/MarketplacePage.tsx', 'utf8');

// Fix text color and height for "Xem năng lực" and "Gửi yêu cầu" buttons
const oldActions = `<div className="mp-factory-actions" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 16px 16px'}}>
                                            {isOwnFactory ? (
                                                <button onClick={() => openEditPublishedTeam(factory)} style={{gridColumn: '1 / -1', background: 'var(--bg-input)', color: '#fff', padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer'}}>{t.manageFactory}</button>
                                            ) : (
                                                <>
                                                    <button onClick={() => { setSelectedFactory(factory); setActiveProfileTab('overview'); }} style={{background: 'var(--bg-input)', color: '#fff', padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer'}}>{t.viewCapacity}</button>
                                                    <button onClick={() => { const fact = factory; handleOrderClick(fact); }} style={{background: '#d4a574', color: '#1a1a1a', padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600}}>{t.sendRequest}</button>
                                                </>
                                            )}
                                        </div>`;

const newActions = `<div className="mp-factory-actions" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 16px 16px'}}>
                                            {isOwnFactory ? (
                                                <button onClick={() => openEditPublishedTeam(factory)} style={{gridColumn: '1 / -1', background: 'var(--bg-input)', color: 'var(--text-primary)', padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, height: 38}}>{t.manageFactory}</button>
                                            ) : (
                                                <>
                                                    <button onClick={() => { setSelectedFactory(factory); setActiveProfileTab('overview'); }} style={{background: 'var(--bg-input)', color: 'var(--text-primary)', padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{t.viewCapacity}</button>
                                                    <button onClick={() => { const fact = factory; handleOrderClick(fact); }} style={{background: '#d4a574', color: '#1a1a1a', padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{t.sendRequest}</button>
                                                </>
                                            )}
                                        </div>`;

content = content.replace(oldActions, newActions);

fs.writeFileSync('src/pages/MarketplacePage.tsx', content);
console.log('Fixed button styles in MarketplacePage.tsx');
