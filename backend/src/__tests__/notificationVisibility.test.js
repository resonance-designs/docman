import Notification from '../models/Notification.js';
import Team from '../models/Team.js';
import { getUserNotifications } from '../controllers/notificationsController.js';
jest.mock('../models/Notification.js', () => ({ __esModule:true, default:{find:jest.fn()} }));
jest.mock('../models/Team.js', () => ({ __esModule:true, default:{find:jest.fn()} }));
jest.mock('../models/User.js', () => ({ __esModule:true, default:{} }));
jest.mock('../models/Doc.js', () => ({ __esModule:true, default:{} }));
const actor = '507f1f77bcf86cd799439011';
function response() { const res={status:jest.fn(),json:jest.fn()};res.status.mockReturnValue(res);return res; }
test('notification resource names are populated only with current resource access', async () => {
    const query={sort:jest.fn(),populate:jest.fn()};query.sort.mockReturnValue(query);query.populate.mockReturnValue(query);
    Notification.find.mockReturnValue(query);
    Team.find.mockReturnValue({select:()=>({lean:async()=>[{_id:'team'}]})});
    const res=response();await getUserNotifications({user:{_id:actor,role:'viewer'}},res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(Notification.find).toHaveBeenCalledWith({recipient:actor});
    const configs=query.populate.mock.calls.map(([value])=>value).filter(value=>typeof value==='object');
    expect(configs.find(value=>value.path==='relatedDoc').match.deletedAt).toBeNull();
    expect(configs.find(value=>value.path==='relatedDoc').match.$or).toHaveLength(5);
    expect(configs.find(value=>value.path==='relatedTeam').match).toEqual({$or:[{owner:actor},{'members.user':actor}]});
    expect(configs.find(value=>value.path==='relatedProject').match.$or).toContainEqual({teams:{$in:['team']}});
});
test('membership lookup failure does not return unfiltered notification resources', async () => {
    Team.find.mockReturnValue({select:()=>({lean:async()=>{throw new Error('unavailable');}})});
    const res=response();await getUserNotifications({user:{_id:actor,role:'viewer'}},res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(Notification.find).not.toHaveBeenCalled();
});
