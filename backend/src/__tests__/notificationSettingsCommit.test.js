import Notification from '../models/Notification.js';
import SystemSetting from '../models/SystemSetting.js';
import { record } from '../services/auditService.js';
import { saveNotificationSettings, retryNotifications } from '../controllers/notificationSettingsController.js';
jest.mock('../models/Notification.js',()=>({__esModule:true,default:{updateMany:jest.fn()}}));
jest.mock('../models/SystemSetting.js',()=>({__esModule:true,default:{findOneAndUpdate:jest.fn()}}));
jest.mock('../services/notificationDeliveryService.js',()=>({notificationSettings:jest.fn()}));
jest.mock('../services/auditService.js',()=>({record:jest.fn(),AUDIT_ACTIONS:{}}));
const response=()=>{const r={status:jest.fn(),json:jest.fn()};r.status.mockReturnValue(r);return r;};
test.each([saveNotificationSettings,retryNotifications])('committed notification changes report audit failure without encouraging retry',async handler=>{
 SystemSetting.findOneAndUpdate.mockResolvedValue({});Notification.updateMany.mockResolvedValue({modifiedCount:3});
 record.mockRejectedValueOnce(new Error('audit offline'));
 const res=response();await handler({body:{enabled:true},user:{id:'admin'}},res);
 expect(res.status).toHaveBeenCalledWith(200);
 expect(res.json).toHaveBeenCalledWith(expect.objectContaining({committed:true,auditRecorded:false}));
 if(handler===retryNotifications)expect(res.json.mock.calls[0][0].queuedCount).toBe(3);
});
test('failed settings mutation remains a service error',async()=>{
 SystemSetting.findOneAndUpdate.mockRejectedValueOnce(new Error('offline'));
 const res=response();await saveNotificationSettings({body:{enabled:true},user:{id:'admin'}},res);
 expect(res.status).toHaveBeenCalledWith(503);expect(record).not.toHaveBeenCalled();
});
