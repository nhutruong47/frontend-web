const fs = require('fs');
let content = fs.readFileSync('src/pages/MarketplacePage.tsx', 'utf8');

const target = `<div className="mp-form-group">
                                <label>Bên đặt gia công</label>
                                <select value={buyerTeamId} onChange={event => setBuyerTeamId(event.target.value)}>
                                    {/* Removed 'Tài khoản cá nhân của tôi' option */}
                                    {myTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                                </select>
                            </div>`;

if (content.includes(target)) {
    content = content.replace(target, '');
    fs.writeFileSync('src/pages/MarketplacePage.tsx', content);
    console.log('Successfully removed the field.');
} else {
    console.log('Target block not found. Trying regex or line replace...');
    const regex = /<div className="mp-form-group">\s*<label>Bên đặt gia công<\/label>[\s\S]*?<\/select>\s*<\/div>/g;
    content = content.replace(regex, '');
    fs.writeFileSync('src/pages/MarketplacePage.tsx', content);
    console.log('Used regex to remove the field.');
}
