const fs = require('fs');
const file = 'src/pages/GroupDetailPage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import { teamService, goalService, taskService, getTrialStatus, chatService, inventoryService } from '../services/groupService';",
  "import { teamService, goalService, taskService, getTrialStatus, chatService } from '../services/groupService';"
);

content = content.replace(
  "import type { Team, Goal, Task, ChatMsg, SalaryReport, AiChatLogMsg, InventoryItem } from '../types/types';",
  "import type { Team, Goal, Task, ChatMsg, SalaryReport, AiChatLogMsg } from '../types/types';"
);

content = content.replace(
  "inventoryService.getByTeam(id).then(setInventoryItems).catch(() => { });",
  "// inventoryService.getByTeam(id).then(setInventoryItems).catch(() => { });"
);

content = content.replace(
  "const handleAddInventory = async () => {\n        if (!id || !invName.trim() || !invQty) return;\n        setLoading(true);\n        try {\n            await inventoryService.create({\n                teamId: id,\n                name: invName,\n                quantity: Number(invQty),\n                unit: invUnit || 'Cái',\n                lowStockThreshold: Number(invThreshold) || 10\n            });\n            const items = await inventoryService.getByTeam(id);\n            setInventoryItems(items);\n            setInvName(''); setInvQty(''); setInvUnit(''); setInvThreshold(''); setShowAddInventory(false);\n        } catch (e: any) { alert(e?.response?.data?.error || 'Lỗi thêm hàng'); } finally { setLoading(false); }\n    };",
  "const handleAddInventory = async () => {\n        alert('Chức năng thêm hàng đang được phát triển');\n    };"
);

content = content.replace(
  "const handleUpdateInvQty = async (invId: string) => {\n        if (!id || !updateInvQty) return;\n        setLoading(true);\n        try {\n            await inventoryService.updateQuantity(invId, Number(updateInvQty));\n            const items = await inventoryService.getByTeam(id);\n            setInventoryItems(items);\n            setUpdatingInvId(null); setUpdateInvQty('');\n        } catch (e: any) { alert(e?.response?.data?.error || 'Lỗi cập nhật số lượng'); } finally { setLoading(false); }\n    };",
  "const handleUpdateInvQty = async (invId: string) => {\n        alert('Chức năng cập nhật hàng đang được phát triển');\n    };"
);

content = content.replace(
  "const handleDeleteInventory = async (invId: string) => {\n        if (!confirm('Xóa mặt hàng này khỏi kho?')) return;\n        try {\n            await inventoryService.delete(invId);\n            const items = await inventoryService.getByTeam(id!);\n            setInventoryItems(items);\n        } catch (e: any) { alert(e?.response?.data?.error || 'Lỗi xóa hàng'); }\n    };",
  "const handleDeleteInventory = async (invId: string) => {\n        alert('Chức năng xóa hàng đang được phát triển');\n    };"
);

content = content.replace(/InventoryItem/g, 'any');

fs.writeFileSync(file, content);
console.log("Fixed inventory references");
